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
let assignments: AssignmentService;
let orderId: string;
let broadcastAt: Date | null;
let merchants: { userId: string; accountId: string }[];

beforeAll(() => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
  balances = new BalanceService(t.db);
  posting = new PostingService(t.db, accounts, balances);
}, 30000);

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

/**
 * PRD §15 item 4 — the definition of done for this milestone. Five merchants
 * accept the same order at the same moment; exactly one may win.
 */
beforeEach(async () => {
  await t.reset();
  await seedAsset(t.pool);

  const capabilities = new CapabilityService(t.db);
  const quotes = new QuoteService(
    t.db,
    new RateService(new MockRateProvider()),
  );
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

  const customerId = await seedUser(t.pool, 'customer@example.test');
  const customerAccount = await accounts.ensureAccount(customerId, 'USDT');
  await fund(customerAccount, '100', 'customer-funds');
  const quote = await quotes.create({
    userId: customerId,
    side: 'SELL',
    usdtAmount: '100',
  });
  const order = await new OrderService(t.db, quotes, posting, accounts).confirm(
    quote.id,
    'order-key',
  );
  orderId = order.id;
  broadcastAt = order.broadcastAt;

  merchants = [];
  for (const n of [1, 2, 3, 4, 5]) {
    const email = `merchant${n}@example.test`;
    const { userId } = await seedMerchant(t.pool, email);
    const accountId = await accounts.ensureAccount(userId, 'USDT');
    await fund(accountId, '110', `fund-${n}`);
    await capabilities.grant(userId, 'P2P_SELL', {
      actorId: null,
      reason: 'merchant onboarding',
    });
    merchants.push({ userId, accountId });
  }
});

afterAll(async () => {
  await t.close();
});

function raceToAccept() {
  return Promise.allSettled(
    merchants.map((m, i) => assignments.accept(orderId, m.userId, `race-${i}`)),
  );
}

describe('five merchants accept at once (PRD §6.7, §15 item 4)', () => {
  it('yields exactly one winner', async () => {
    const results = await raceToAccept();

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('tells the other four ORDER_ALREADY_ASSIGNED', async () => {
    const results = await raceToAccept();

    const refusals = results
      .filter((r) => r.status === 'rejected')
      .map((r) => String((r.reason as Error).message));

    expect(refusals).toHaveLength(4);
    expect(
      refusals.filter((m) => m.includes('ORDER_ALREADY_ASSIGNED')),
    ).toHaveLength(4);
  });

  it('the losers moved no money', async () => {
    const results = await raceToAccept();
    const winner = results.findIndex((r) => r.status === 'fulfilled');

    for (const [i, m] of merchants.entries()) {
      if (i === winner) continue;
      expect(await balances.balance(m.accountId, 'BONDED')).toBe(
        '0.000000000000000000',
      );
      expect(await balances.balance(m.accountId, 'AVAILABLE')).toBe(
        '110.000000000000000000',
      );
    }
  });

  it('bonds the winner exactly once', async () => {
    const results = await raceToAccept();
    const winner = results.findIndex((r) => r.status === 'fulfilled');

    expect(await balances.balance(merchants[winner].accountId, 'BONDED')).toBe(
      '100.000000000000000000',
    );
    const r = await t.pool.query(
      `SELECT count(*)::int AS n FROM merchant_assignment WHERE order_id = $1`,
      [orderId],
    );
    expect((r.rows[0] as { n: number }).n).toBe(1);
  });

  /**
   * PRD §11: broadcast is published from one place at one instant, and both
   * timestamps are logged from day one — the first fairness complaint is
   * unanswerable without them.
   */
  it('records the broadcast and accept timestamps', async () => {
    await raceToAccept();

    const r = await t.pool.query(
      `SELECT accepted_at FROM merchant_assignment WHERE order_id = $1`,
      [orderId],
    );
    const acceptedAt = (r.rows[0] as { accepted_at: Date }).accepted_at;

    expect(broadcastAt).toBeInstanceOf(Date);
    expect(acceptedAt).toBeInstanceOf(Date);
    expect(acceptedAt.getTime()).toBeGreaterThanOrEqual(broadcastAt!.getTime());
  });
});
