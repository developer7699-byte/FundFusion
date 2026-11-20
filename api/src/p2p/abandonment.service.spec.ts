import { AccountService } from '../ledger/account.service';
import { BalanceService } from '../ledger/balance.service';
import { PostingService } from '../ledger/posting.service';
import { CapabilityService } from '../capability/capability.service';
import { MockRateProvider } from '../rates/rate.provider';
import { RateService } from '../rates/rate.service';
import {
  makeTestDb,
  seedAsset,
  seedMerchant,
  seedUser,
  type TestDb,
} from '../ledger/test-db';
import { Decimal } from '../money/money';
import { AbandonmentService } from './abandonment.service';
import { AssignmentService } from './assignment.service';
import { EligibilityService } from './eligibility.service';
import { OrderService } from './order.service';
import { QuoteService } from './quote.service';
import { TimeoutService } from './timeout.service';

let t: TestDb;
let accounts: AccountService;
let balances: BalanceService;
let posting: PostingService;
let quotes: QuoteService;
let orders: OrderService;
let assignments: AssignmentService;
let timeouts: TimeoutService;
let abandonment: AbandonmentService;
let customerId: string;
let merchantId: string;
let merchantAccount: string;

const MINUTE = 60_000;

beforeAll(() => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
  balances = new BalanceService(t.db);
  posting = new PostingService(t.db, accounts, balances);
}, 30000);

beforeEach(async () => {
  await t.reset();
  await seedAsset(t.pool);

  const capabilities = new CapabilityService(t.db);
  const provider = new MockRateProvider();
  provider.next('100.00');
  quotes = new QuoteService(t.db, new RateService(provider));
  abandonment = new AbandonmentService(t.db);
  orders = new OrderService(t.db, quotes, posting, accounts, abandonment);
  const eligibility = new EligibilityService(
    t.db,
    quotes,
    balances,
    capabilities,
    accounts,
  );
  assignments = new AssignmentService(
    t.db,
    quotes,
    eligibility,
    posting,
    accounts,
  );
  timeouts = new TimeoutService(t.db, posting, accounts);

  customerId = await seedUser(t.pool, 'customer@example.test');
  await accounts.ensureAccount(customerId, 'USDT');
  const m = await seedMerchant(t.pool, 'merchant@example.test');
  merchantId = m.userId;
  merchantAccount = await accounts.ensureAccount(merchantId, 'USDT');
  await capabilities.grant(merchantId, 'P2P_BUY', {
    actorId: null,
    reason: 'merchant onboarding',
  });
  await posting.post({
    idempotencyKey: 'merchant-funds',
    memo: 'opening balance',
    lines: [
      {
        accountId: merchantAccount,
        accountType: 'AVAILABLE',
        direction: 'CREDIT',
        amount: '1000',
        assetSymbol: 'USDT',
      },
      {
        accountType: 'EXTERNAL',
        direction: 'DEBIT',
        amount: '1000',
        assetSymbol: 'USDT',
      },
    ],
  });
});

afterAll(async () => {
  await t.close();
});

async function openBuyOrder(key: string) {
  const quote = await quotes.create({
    userId: customerId,
    side: 'BUY',
    usdtAmount: '10',
  });
  return orders.confirm(quote.id, key);
}

/** A merchant commits funds, then the customer never pays (PRD §6.11). */
async function abandonOne(key: string) {
  const order = await openBuyOrder(key);
  await assignments.accept(order.id, merchantId, `accept-${key}`);
  await timeouts.sweep(new Date(Date.now() + 16 * MINUTE));
  return order;
}

describe('concurrent open buy orders (PRD §6.11)', () => {
  it('caps concurrent open buy orders per customer', async () => {
    await openBuyOrder('buy-1');
    await openBuyOrder('buy-2');

    await expect(openBuyOrder('buy-3')).rejects.toThrow(/open order/i);
  });

  it('a finished order frees a slot', async () => {
    await openBuyOrder('buy-1');
    const second = await openBuyOrder('buy-2');
    await t.pool.query(
      `UPDATE p2p_order SET status = 'COMPLETED' WHERE id = $1`,
      [second.id],
    );

    await expect(openBuyOrder('buy-3')).resolves.toBeDefined();
  });

  /**
   * The cap exists to protect merchant liquidity, which sell orders do not
   * consume — the customer's own USDT is what gets locked there.
   */
  it('does not cap sell orders', async () => {
    const customerAccount = await accounts.ensureAccount(customerId, 'USDT');
    await posting.post({
      idempotencyKey: 'customer-funds',
      memo: 'opening balance',
      lines: [
        {
          accountId: customerAccount,
          accountType: 'AVAILABLE',
          direction: 'CREDIT',
          amount: '300',
          assetSymbol: 'USDT',
        },
        {
          accountType: 'EXTERNAL',
          direction: 'DEBIT',
          amount: '300',
          assetSymbol: 'USDT',
        },
      ],
    });

    for (const n of [1, 2, 3]) {
      const quote = await quotes.create({
        userId: customerId,
        side: 'SELL',
        usdtAmount: '100',
      });
      await expect(
        orders.confirm(quote.id, `sell-${n}`),
      ).resolves.toBeDefined();
    }
  });
});

describe('abandonment rate and cooldown (PRD §6.11)', () => {
  it('tracks an abandonment rate', async () => {
    await abandonOne('buy-1');
    const kept = await openBuyOrder('buy-2');
    await assignments.accept(kept.id, merchantId, 'accept-keep');
    await t.pool.query(
      `UPDATE p2p_order SET status = 'COMPLETED' WHERE id = $1`,
      [kept.id],
    );

    const stats = await abandonment.stats(customerId);

    expect(stats.abandoned).toBe(1);
    expect(stats.matched).toBe(2);
    expect(stats.rate).toBe('0.50');
  });

  it('forgives the first abandonment', async () => {
    await abandonOne('buy-1');

    expect((await abandonment.stats(customerId)).cooldownUntil).toBeNull();
    await expect(openBuyOrder('buy-next')).resolves.toBeDefined();
  });

  it('applies an escalating cooldown after repeated abandonments', async () => {
    await abandonOne('buy-1');
    await abandonOne('buy-2');
    const afterTwo = await abandonment.stats(customerId);

    // A day passes, so the second cooldown has run out and the customer can
    // open another order — and walk away from that one too.
    await t.pool.query(
      `UPDATE p2p_order SET updated_at = now() - interval '1 day' WHERE customer_id = $1`,
      [customerId],
    );
    await abandonOne('buy-3');
    const afterThree = await abandonment.stats(customerId);

    expect(afterTwo.cooldownSeconds).toBe(300);
    expect(afterThree.cooldownSeconds).toBe(600);
    await expect(openBuyOrder('buy-4')).rejects.toThrow(/cooldown|wait/i);
  });

  /** PRD §6.10: a merchant is never penalised for a customer's abandonment. */
  it('a customer abandonment does not touch the merchant bond', async () => {
    const before = await balances.balance(merchantAccount, 'AVAILABLE');
    await abandonOne('buy-1');

    // Still locked against the order, awaiting an admin — but not taken.
    expect(await balances.balance(merchantAccount, 'LOCKED')).toBe(
      '10.000000000000000000',
    );
    expect(await balances.balance(merchantAccount, 'AVAILABLE')).toBe(
      new Decimal(before).minus('10').toFixed(18),
    );
    const r = await t.pool.query(
      `SELECT count(*)::int AS n FROM ledger_entry WHERE account_type = 'REVENUE'`,
    );
    expect((r.rows[0] as { n: number }).n).toBe(0);
  });
});
