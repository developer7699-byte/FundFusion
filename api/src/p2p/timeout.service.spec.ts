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
import { ORDER_STATES } from './order.state';
import { QuoteService } from './quote.service';
import { SettlementService } from './settlement.service';
import { TimeoutService } from './timeout.service';

let t: TestDb;
let accounts: AccountService;
let balances: BalanceService;
let posting: PostingService;
let quotes: QuoteService;
let orders: OrderService;
let assignments: AssignmentService;
let settlement: SettlementService;
let timeouts: TimeoutService;
let customerId: string;
let customerAccount: string;
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
  orders = new OrderService(
    t.db,
    quotes,
    posting,
    accounts,
    new AbandonmentService(t.db),
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
  settlement = new SettlementService(
    t.db,
    quotes,
    eligibility,
    posting,
    accounts,
  );
  timeouts = new TimeoutService(t.db, posting, accounts);

  customerId = await seedUser(t.pool, 'customer@example.test');
  customerAccount = await accounts.ensureAccount(customerId, 'USDT');
  const m = await seedMerchant(t.pool, 'merchant@example.test');
  merchantId = m.userId;
  merchantAccount = await accounts.ensureAccount(merchantId, 'USDT');
  await capabilities.grant(merchantId, 'P2P_SELL', {
    actorId: null,
    reason: 'merchant onboarding',
  });

  await fund(customerAccount, '100', 'customer-funds');
  await fund(merchantAccount, '200', 'merchant-funds');
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

async function broadcastSell() {
  const quote = await quotes.create({
    userId: customerId,
    side: 'SELL',
    usdtAmount: '100',
  });
  return orders.confirm(quote.id, customerId, 'order-key');
}

async function statusOf(orderId: string): Promise<string> {
  const r = await t.pool.query(`SELECT status FROM p2p_order WHERE id = $1`, [
    orderId,
  ]);
  return (r.rows[0] as { status: string }).status;
}

function later(minutes: number): Date {
  return new Date(Date.now() + minutes * MINUTE);
}

/**
 * PRD §6.9. A timeout may return funds to where they started. It may never
 * advance them to someone's benefit — escrow that pays out on silence gets
 * farmed within weeks of launch.
 */
describe('expiry returns funds (PRD §6.9)', () => {
  it('an unmatched order expires and returns the locked funds', async () => {
    const order = await broadcastSell();
    expect(await balances.balance(customerAccount, 'LOCKED')).toBe(
      '100.000000000000000000',
    );

    await timeouts.sweep(later(5));

    expect(await statusOf(order.id)).toBe('EXPIRED');
    expect(await balances.balance(customerAccount, 'AVAILABLE')).toBe(
      '100.000000000000000000',
    );
    expect(await balances.balance(customerAccount, 'LOCKED')).toBe(
      '0.000000000000000000',
    );
  });

  it('leaves an order alone while its search window is still open', async () => {
    const order = await broadcastSell();

    await timeouts.sweep(new Date());

    expect(await statusOf(order.id)).toBe('AWAITING_MERCHANT');
    expect(await balances.balance(customerAccount, 'LOCKED')).toBe(
      '100.000000000000000000',
    );
  });

  it('the sweep is idempotent', async () => {
    const order = await broadcastSell();

    await timeouts.sweep(later(5));
    await timeouts.sweep(later(5));

    expect(await statusOf(order.id)).toBe('EXPIRED');
    expect(await balances.balance(customerAccount, 'AVAILABLE')).toBe(
      '100.000000000000000000',
    );
    const r = await t.pool.query(
      `SELECT count(*)::int AS n FROM ledger_transaction WHERE idempotency LIKE $1`,
      [`order-expire:${order.id}`],
    );
    expect((r.rows[0] as { n: number }).n).toBe(1);
  });

  it('an expired order cannot be confirmed again afterwards', async () => {
    const order = await broadcastSell();
    await timeouts.sweep(later(5));

    const again = await orders.confirm(order.quoteId, customerId, 'order-key');

    expect(again.status).toBe('EXPIRED');
    expect(await balances.balance(customerAccount, 'LOCKED')).toBe(
      '0.000000000000000000',
    );
  });
});

describe('silence escalates, never settles (PRD §6.9)', () => {
  it('a payer who never submits a UTR escalates to DISPUTED', async () => {
    const order = await broadcastSell();
    await assignments.accept(order.id, merchantId, 'accept-key');

    await timeouts.sweep(later(16));

    expect(await statusOf(order.id)).toBe('DISPUTED');
    // Nobody was paid and nothing was released.
    expect(await balances.balance(customerAccount, 'LOCKED')).toBe(
      '100.000000000000000000',
    );
    expect(await balances.balance(merchantAccount, 'BONDED')).toBe(
      '100.000000000000000000',
    );
  });

  it('receiver silence escalates to DISPUTED and never releases escrow', async () => {
    const order = await broadcastSell();
    await assignments.accept(order.id, merchantId, 'accept-key');
    await settlement.submitUtr(order.id, merchantId, 'UTR-9700');
    const merchantBefore = await balances.balance(merchantAccount, 'AVAILABLE');

    await timeouts.sweep(later(16));

    expect(await statusOf(order.id)).toBe('DISPUTED');
    expect(await balances.balance(merchantAccount, 'AVAILABLE')).toBe(
      merchantBefore,
    );
    expect(await balances.balance(customerAccount, 'LOCKED')).toBe(
      '100.000000000000000000',
    );
  });

  it('leaves a payer alone inside the window', async () => {
    const order = await broadcastSell();
    await assignments.accept(order.id, merchantId, 'accept-key');

    await timeouts.sweep(later(14));

    expect(await statusOf(order.id)).toBe('ACCEPTED');
  });

  /** The rule that stops escrow being farmed, stated as a property. */
  it('no timeout path ever reaches COMPLETED', async () => {
    for (const state of ORDER_STATES) {
      // Each iteration locks 100 USDT of its own, so each needs its own.
      await fund(customerAccount, '100', `top-up-${state}`);
      const order = await broadcastSell();
      await t.pool.query(`UPDATE p2p_order SET status = $1 WHERE id = $2`, [
        state,
        order.id,
      ]);

      await timeouts.sweep(later(600));

      // A sweep has exactly two destinations: return the funds, or ask a
      // human. It never completes an order from any starting state.
      const after = await statusOf(order.id);
      expect(['EXPIRED', 'DISPUTED', state]).toContain(after);
      await t.pool.query(`DELETE FROM p2p_order WHERE id = $1`, [order.id]);
    }
  });

  it('a settled order is never touched by a sweep', async () => {
    const order = await broadcastSell();
    await assignments.accept(order.id, merchantId, 'accept-key');
    await settlement.submitUtr(order.id, merchantId, 'UTR-9700');
    await settlement.confirmReceipt(order.id, customerId, 'settle-1');
    const after = await balances.balance(merchantAccount, 'AVAILABLE');

    await timeouts.sweep(later(600));

    expect(await statusOf(order.id)).toBe('COMPLETED');
    expect(await balances.balance(merchantAccount, 'AVAILABLE')).toBe(after);
  });
});
