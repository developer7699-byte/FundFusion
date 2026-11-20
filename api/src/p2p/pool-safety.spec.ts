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
import { AbandonmentService } from './abandonment.service';
import { AssignmentService } from './assignment.service';
import { EligibilityService } from './eligibility.service';
import { OrderService } from './order.service';
import { QuoteService } from './quote.service';

/**
 * The engine's premise is simultaneous competition: one order goes out and
 * every eligible merchant races for it. That makes connection discipline a
 * correctness property, not a performance one.
 *
 * A transaction holds one pooled connection. If anything inside it reaches
 * for a second — a lookup that quietly uses the pool instead of the
 * transaction — then enough simultaneous accepts will each hold one and wait
 * for another that nobody can give back. Nothing errors. The process simply
 * stops, while holding FOR UPDATE locks on orders and wallets.
 *
 * This runs against a deliberately small pool so the cliff is reachable in a
 * test. PRD §15 item 4 names five merchants; a real broadcast goes to every
 * merchant on the desk.
 */
const POOL = 4;
const RACERS = 8;

let t: TestDb;
let accounts: AccountService;
let balances: BalanceService;
let posting: PostingService;
let assignments: AssignmentService;
let orderId: string;
let merchants: string[];

beforeAll(() => {
  t = makeTestDb({ max: POOL });
  accounts = new AccountService(t.db);
  balances = new BalanceService(t.db);
  posting = new PostingService(t.db, accounts, balances);
}, 30000);

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
  const order = await new OrderService(
    t.db,
    quotes,
    posting,
    accounts,
    new AbandonmentService(t.db),
  ).confirm(quote.id, 'order-key');
  orderId = order.id;

  merchants = [];
  for (let n = 0; n < RACERS; n++) {
    const { userId } = await seedMerchant(t.pool, `merchant${n}@example.test`);
    const accountId = await accounts.ensureAccount(userId, 'USDT');
    await fund(accountId, '110', `fund-${n}`);
    await capabilities.grant(userId, 'P2P_SELL', {
      actorId: null,
      reason: 'merchant onboarding',
    });
    merchants.push(userId);
  }
}, 30000);

describe('more merchants than connections', () => {
  it('still resolves to exactly one winner', async () => {
    const results = await Promise.allSettled(
      merchants.map((userId, i) =>
        assignments.accept(orderId, userId, `race-${i}`),
      ),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);

    // Every loser is refused for the right reason. A connection error here
    // means a transaction went looking for a second connection.
    const refusals = results
      .filter((r) => r.status === 'rejected')
      .map((r) => String(r.reason));
    expect(refusals).toHaveLength(RACERS - 1);
    expect(
      refusals.filter((m) => m.includes('ORDER_ALREADY_ASSIGNED')),
    ).toHaveLength(RACERS - 1);
  }, 20000);

  it('leaves the pool usable afterwards', async () => {
    await Promise.allSettled(
      merchants.map((userId, i) =>
        assignments.accept(orderId, userId, `race-${i}`),
      ),
    );

    // A pool drained by borrowed connections cannot answer this.
    const r = await t.pool.query(`SELECT 1 AS ok`);
    expect((r.rows[0] as { ok: number }).ok).toBe(1);
  }, 20000);
});
