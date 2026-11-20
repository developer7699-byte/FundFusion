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
import { AssignmentService } from './assignment.service';
import { EligibilityService } from './eligibility.service';
import { OrderService } from './order.service';
import { QuoteService } from './quote.service';

let t: TestDb;
let accounts: AccountService;
let balances: BalanceService;
let posting: PostingService;
let capabilities: CapabilityService;
let quotes: QuoteService;
let orders: OrderService;
let eligibility: EligibilityService;
let assignments: AssignmentService;
let customerId: string;
let customerAccount: string;

beforeAll(() => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
  balances = new BalanceService(t.db);
  posting = new PostingService(t.db, accounts, balances);
  capabilities = new CapabilityService(t.db);
}, 30000);

beforeEach(async () => {
  await t.reset();
  await seedAsset(t.pool);
  customerId = await seedUser(t.pool, 'customer@example.test');
  customerAccount = await accounts.ensureAccount(customerId, 'USDT');
  quotes = new QuoteService(t.db, new RateService(new MockRateProvider()), {
    ttlSeconds: 90,
    buyFeeBps: 100,
  });
  orders = new OrderService(t.db, quotes, posting, accounts);
  eligibility = new EligibilityService(
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
});

afterAll(async () => {
  await t.close();
});

async function fund(accountId: string, amount: string, key: string) {
  await posting.post({
    idempotencyKey: key,
    memo: 'opening balance',
    lines: [
      {
        accountId,
        accountType: 'AVAILABLE',
        direction: 'CREDIT',
        amount,
        assetSymbol: 'USDT',
      },
      {
        accountType: 'EXTERNAL',
        direction: 'DEBIT',
        amount,
        assetSymbol: 'USDT',
      },
    ],
  });
}

/** A merchant with a balance and the capability for this side. */
async function merchant(
  email: string,
  available: string,
  capability: 'P2P_SELL' | 'P2P_BUY' = 'P2P_SELL',
) {
  const { userId } = await seedMerchant(t.pool, email);
  const accountId = await accounts.ensureAccount(userId, 'USDT');
  await fund(accountId, available, `fund-${email}`);
  await capabilities.grant(userId, capability, {
    actorId: null,
    reason: 'merchant onboarding',
  });
  return { userId, accountId };
}

async function sellOrder(key = 'order-1') {
  await fund(customerAccount, '100', `customer-${key}`);
  const quote = await quotes.create({
    userId: customerId,
    side: 'SELL',
    usdtAmount: '100',
  });
  return orders.confirm(quote.id, key);
}

async function buyOrder(key = 'buy-1') {
  const quote = await quotes.create({
    userId: customerId,
    side: 'BUY',
    usdtAmount: '97',
  });
  return orders.confirm(quote.id, key);
}

/**
 * PRD §6.5. Eligibility is a USDT check, never a rupee one: the platform holds
 * no rupees, so a merchant's rupee balance is self-declared and unenforceable.
 */
describe('merchant eligibility (PRD §6.5)', () => {
  it('sell-side: eligible when available USDT >= obligation x (1 + B)', async () => {
    const order = await sellOrder();
    const m = await merchant('rich@example.test', '110');

    await expect(
      assignments.accept(order.id, m.userId, 'accept-1'),
    ).resolves.toBeDefined();
  });

  it('sell-side: bonds exactly the obligation, not the buffer', async () => {
    const order = await sellOrder();
    const m = await merchant('rich@example.test', '110');

    await assignments.accept(order.id, m.userId, 'accept-1');

    expect(await balances.balance(m.accountId, 'BONDED')).toBe(
      '100.000000000000000000',
    );
    // The buffer stays unreserved and spendable.
    expect(await balances.balance(m.accountId, 'AVAILABLE')).toBe(
      '10.000000000000000000',
    );
  });

  it('buy-side: locks exactly qty + platform fee', async () => {
    const order = await buyOrder();
    const m = await merchant('supplier@example.test', '110', 'P2P_BUY');

    await assignments.accept(order.id, m.userId, 'accept-buy');

    // 97 USDT for the customer plus a 100bps fee the merchant pays.
    expect(await balances.balance(m.accountId, 'LOCKED')).toBe(
      '97.970000000000000000',
    );
  });

  it('an ineligible merchant is refused', async () => {
    const order = await sellOrder();
    const m = await merchant('thin@example.test', '109.99');

    await expect(
      assignments.accept(order.id, m.userId, 'accept-2'),
    ).rejects.toThrow(/eligib|insufficient/i);
    expect(await balances.balance(m.accountId, 'BONDED')).toBe(
      '0.000000000000000000',
    );
  });

  it('a merchant without the capability is refused', async () => {
    const order = await sellOrder();
    const { userId } = await seedMerchant(t.pool, 'nocap@example.test');
    const accountId = await accounts.ensureAccount(userId, 'USDT');
    await fund(accountId, '110', 'fund-nocap');

    await expect(
      assignments.accept(order.id, userId, 'accept-3'),
    ).rejects.toThrow(/capab/i);
  });

  it('an inactive merchant is refused', async () => {
    const order = await sellOrder();
    const m = await merchant('paused@example.test', '110');
    await t.pool.query(
      `UPDATE merchant_profile SET status = 'INACTIVE' WHERE user_id = $1`,
      [m.userId],
    );

    await expect(
      assignments.accept(order.id, m.userId, 'accept-4'),
    ).rejects.toThrow(/active/i);
  });

  it('someone who is not a merchant at all is refused', async () => {
    const order = await sellOrder();
    const stranger = await seedUser(t.pool, 'stranger@example.test');
    const accountId = await accounts.ensureAccount(stranger, 'USDT');
    await fund(accountId, '110', 'fund-stranger');

    await expect(
      assignments.accept(order.id, stranger, 'accept-5'),
    ).rejects.toThrow(/merchant/i);
  });
});

describe('accepting (PRD §6.7)', () => {
  it('moves the order to ACCEPTED and records who won', async () => {
    const order = await sellOrder();
    const m = await merchant('rich@example.test', '110');

    const assignment = await assignments.accept(order.id, m.userId, 'a-1');

    expect(assignment.userId).toBe(m.userId);
    const r = await t.pool.query(`SELECT status FROM p2p_order WHERE id = $1`, [
      order.id,
    ]);
    expect((r.rows[0] as { status: string }).status).toBe('ACCEPTED');
  });

  it('is idempotent for the merchant who already won', async () => {
    const order = await sellOrder();
    const m = await merchant('rich@example.test', '110');

    const first = await assignments.accept(order.id, m.userId, 'a-1');
    const again = await assignments.accept(order.id, m.userId, 'a-1');

    expect(again.id).toBe(first.id);
    expect(await balances.balance(m.accountId, 'BONDED')).toBe(
      '100.000000000000000000',
    );
  });

  it('a second merchant gets ORDER_ALREADY_ASSIGNED', async () => {
    const order = await sellOrder();
    const winner = await merchant('first@example.test', '110');
    const loser = await merchant('second@example.test', '110');

    await assignments.accept(order.id, winner.userId, 'a-1');

    await expect(
      assignments.accept(order.id, loser.userId, 'a-2'),
    ).rejects.toThrow(/ORDER_ALREADY_ASSIGNED/);
    expect(await balances.balance(loser.accountId, 'BONDED')).toBe(
      '0.000000000000000000',
    );
  });

  /**
   * Review Focus #1. A stale order is a free option on whoever holds it: the
   * market moves, and it is only taken when taking it pays. The search window
   * (PRD §6.9) is what closes it.
   */
  it('an order past its search window cannot be picked off', async () => {
    const order = await sellOrder();
    const m = await merchant('late@example.test', '110');
    await t.pool.query(
      `UPDATE p2p_order SET broadcast_at = now() - interval '10 minutes' WHERE id = $1`,
      [order.id],
    );

    await expect(
      assignments.accept(order.id, m.userId, 'a-late'),
    ).rejects.toThrow(/expired|window/i);
    expect(await balances.balance(m.accountId, 'BONDED')).toBe(
      '0.000000000000000000',
    );
  });

  it('records the broadcast and accept timestamps', async () => {
    const order = await sellOrder();
    const m = await merchant('rich@example.test', '110');

    const assignment = await assignments.accept(order.id, m.userId, 'a-1');

    expect(order.broadcastAt).toBeInstanceOf(Date);
    expect(assignment.acceptedAt).toBeInstanceOf(Date);
    expect(assignment.acceptedAt!.getTime()).toBeGreaterThanOrEqual(
      order.broadcastAt!.getTime(),
    );
  });

  /**
   * Review Focus #2. Eligibility read before the lock is a read of the past:
   * two orders would each see a balance the other is about to consume.
   */
  it('two orders cannot consume the same merchant balance', async () => {
    const first = await sellOrder('order-a');
    const second = await sellOrder('order-b');
    const m = await merchant('one-shot@example.test', '110');

    const results = await Promise.allSettled([
      assignments.accept(first.id, m.userId, 'c-1'),
      assignments.accept(second.id, m.userId, 'c-2'),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await balances.balance(m.accountId, 'BONDED')).toBe(
      '100.000000000000000000',
    );
  });
});
