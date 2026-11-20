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
import { SettlementService } from './settlement.service';

let t: TestDb;
let accounts: AccountService;
let balances: BalanceService;
let posting: PostingService;
let capabilities: CapabilityService;
let provider: MockRateProvider;
let rates: RateService;
let quotes: QuoteService;
let orders: OrderService;
let assignments: AssignmentService;
let settlement: SettlementService;
let customerId: string;
let customerAccount: string;
let merchantId: string;
let merchantAccount: string;

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

  provider = new MockRateProvider();
  // PRD §15 item 1 quotes a customer sell rate of ₹97.00, which is a ₹100 mid
  // less the 300bps markup.
  provider.next('100.00');
  rates = new RateService(provider);
  quotes = new QuoteService(t.db, rates, { ttlSeconds: 90, buyFeeBps: 100 });
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

  customerId = await seedUser(t.pool, 'customer@example.test');
  customerAccount = await accounts.ensureAccount(customerId, 'USDT');
  const m = await seedMerchant(t.pool, 'merchant@example.test');
  merchantId = m.userId;
  merchantAccount = await accounts.ensureAccount(merchantId, 'USDT');
  await capabilities.grant(merchantId, 'P2P_SELL', {
    actorId: null,
    reason: 'merchant onboarding',
  });
  await capabilities.grant(merchantId, 'P2P_BUY', {
    actorId: null,
    reason: 'merchant onboarding',
  });
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

/** Customer sells `qty` USDT; the merchant accepts and owes rupees. */
async function sellToSettlement(qty = '100', merchantFunds = '200') {
  await fund(customerAccount, qty, 'customer-funds');
  await fund(merchantAccount, merchantFunds, 'merchant-funds');
  const quote = await quotes.create({
    userId: customerId,
    side: 'SELL',
    usdtAmount: qty,
  });
  const order = await orders.confirm(quote.id, 'order-key');
  await assignments.accept(order.id, merchantId, 'accept-key');
  return { order, quote };
}

/** Customer buys `qty` USDT; the merchant supplies it and receives rupees. */
async function buyToSettlement(qty = '97') {
  await fund(merchantAccount, '200', 'merchant-funds');
  const quote = await quotes.create({
    userId: customerId,
    side: 'BUY',
    usdtAmount: qty,
  });
  const order = await orders.confirm(quote.id, 'order-key');
  await assignments.accept(order.id, merchantId, 'accept-key');
  return { order, quote };
}

async function journalFor(orderId: string): Promise<string> {
  const r = await t.pool.query(
    `SELECT id FROM ledger_transaction WHERE memo LIKE $1 ORDER BY created_at DESC LIMIT 1`,
    [`%settlement for order ${orderId}%`],
  );
  return (r.rows[0] as { id: string }).id;
}

async function amountAt(txId: string, accountType: string): Promise<string> {
  const r = await t.pool.query(
    `SELECT COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END),0)::numeric(38,18)::text AS s
       FROM ledger_entry WHERE transaction_id = $1 AND account_type = $2`,
    [txId, accountType],
  );
  return (r.rows[0] as { s: string }).s;
}

async function sumOfEntries(txId: string): Promise<string> {
  const r = await t.pool.query(
    `SELECT COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END),0)::numeric(38,18)::text AS s
       FROM ledger_entry WHERE transaction_id = $1`,
    [txId],
  );
  return (r.rows[0] as { s: string }).s;
}

async function statusOf(orderId: string): Promise<string> {
  const r = await t.pool.query(`SELECT status FROM p2p_order WHERE id = $1`, [
    orderId,
  ]);
  return (r.rows[0] as { status: string }).status;
}

/** PRD §15 item 1, verbatim. */
describe('sell-side settlement (PRD §6.3)', () => {
  it('100 USDT at ₹97 yields ₹9,700 to the customer, 97.00 to the merchant and 3.00 to revenue', async () => {
    const { order, quote } = await sellToSettlement();
    expect(quote.customerRate).toBe('97.00');
    expect(quote.inrAmount).toBe('9700.00');

    await settlement.submitUtr(order.id, merchantId, 'UTR-9700');
    await settlement.confirmReceipt(order.id, customerId, 'settle-1');

    const txId = await journalFor(order.id);
    expect(await amountAt(txId, 'REVENUE')).toBe('3.000000000000000000');
    expect(await balances.balance(customerAccount, 'LOCKED')).toBe(
      '0.000000000000000000',
    );
    // 200 funded − 100 bonded, then the bond back plus 97 earned.
    expect(await balances.balance(merchantAccount, 'AVAILABLE')).toBe(
      '297.000000000000000000',
    );
    expect(await balances.balance(merchantAccount, 'BONDED')).toBe(
      '0.000000000000000000',
    );
  });

  it('never credits the merchant the full quantity', async () => {
    const { order } = await sellToSettlement();
    await settlement.submitUtr(order.id, merchantId, 'UTR-9700');
    await settlement.confirmReceipt(order.id, customerId, 'settle-1');

    const txId = await journalFor(order.id);
    // The merchant's leg is the quantity less the platform's cut, never 100.
    expect(await amountAt(txId, 'AVAILABLE')).toBe('197.000000000000000000');
  });

  it('moves the order to COMPLETED', async () => {
    const { order } = await sellToSettlement();
    await settlement.submitUtr(order.id, merchantId, 'UTR-9700');
    await settlement.confirmReceipt(order.id, customerId, 'settle-1');

    expect(await statusOf(order.id)).toBe('COMPLETED');
  });
});

/** PRD §15 item 2. */
describe('buy-side settlement (PRD §6.4)', () => {
  it('the customer receives exactly the quantity they asked for', async () => {
    const { order, quote } = await buyToSettlement('97');
    expect(quote.usdtAmount).toBe('97.000000000000000000');

    await settlement.submitUtr(order.id, customerId, 'UTR-9991');
    await settlement.confirmReceipt(order.id, merchantId, 'settle-1');

    expect(await balances.balance(customerAccount, 'AVAILABLE')).toBe(
      '97.000000000000000000',
    );
  });

  it('the platform fee posts from the merchant in the settlement journal', async () => {
    const { order } = await buyToSettlement('97');
    await settlement.submitUtr(order.id, customerId, 'UTR-9991');
    await settlement.confirmReceipt(order.id, merchantId, 'settle-1');

    const txId = await journalFor(order.id);
    expect(await amountAt(txId, 'REVENUE')).toBe('0.970000000000000000');
    expect(await balances.balance(merchantAccount, 'LOCKED')).toBe(
      '0.000000000000000000',
    );
    // 200 funded, less the 97 supplied and the 0.97 fee.
    expect(await balances.balance(merchantAccount, 'AVAILABLE')).toBe(
      '102.030000000000000000',
    );
  });
});

/**
 * PRD §6.8. Whoever receives the rupees confirms them — they are the only
 * party who can see their own bank account.
 */
describe('who may confirm (PRD §6.8)', () => {
  it('a payer UTR alone does not release escrow', async () => {
    const { order } = await sellToSettlement();

    await settlement.submitUtr(order.id, merchantId, 'UTR-FAKE');

    expect(await statusOf(order.id)).toBe('PAYMENT_SUBMITTED');
    expect(await balances.balance(customerAccount, 'LOCKED')).toBe(
      '100.000000000000000000',
    );
  });

  it('only the rupee receiver can confirm receipt', async () => {
    const { order } = await sellToSettlement();
    await settlement.submitUtr(order.id, merchantId, 'UTR-9700');

    // On a sell the customer receives the rupees, so the merchant confirming
    // their own payment would be marking their own homework.
    await expect(
      settlement.confirmReceipt(order.id, merchantId, 'settle-bad'),
    ).rejects.toThrow(/not .*receiver/i);
  });

  /**
   * PRD §13.5 wants object-level checks, not just route-level ones. A settled
   * order must not answer a stranger just because there is nothing left to
   * move: the reply itself tells them the order exists and is done.
   */
  it('a stranger cannot read a settled order through confirmReceipt', async () => {
    const { order } = await sellToSettlement();
    await settlement.submitUtr(order.id, merchantId, 'UTR-9700');
    await settlement.confirmReceipt(order.id, customerId, 'settle-1');

    await expect(
      settlement.confirmReceipt(order.id, merchantId, 'settle-again'),
    ).rejects.toThrow(/not .*receiver/i);
  });

  it('only the payer can submit a UTR', async () => {
    const { order } = await sellToSettlement();

    await expect(
      settlement.submitUtr(order.id, customerId, 'UTR-WRONG'),
    ).rejects.toThrow(/not .*payer/i);
  });

  it('receipt cannot be confirmed before a payment is submitted', async () => {
    const { order } = await sellToSettlement();

    await expect(
      settlement.confirmReceipt(order.id, customerId, 'settle-early'),
    ).rejects.toThrow();
    expect(await balances.balance(customerAccount, 'LOCKED')).toBe(
      '100.000000000000000000',
    );
  });
});

describe('the invariants', () => {
  /** Review Focus #5. */
  it('a settlement journal sums to zero at full precision', async () => {
    // A quantity whose 3% cut does not fit in 18 decimal places.
    const { order } = await sellToSettlement('0.333333333333333333', '1');
    await settlement.submitUtr(order.id, merchantId, 'UTR-x');
    await settlement.confirmReceipt(order.id, customerId, 'settle-1');

    const txId = await journalFor(order.id);
    expect(await sumOfEntries(txId)).toBe('0.000000000000000000');
  });

  it('settlement is idempotent', async () => {
    const { order } = await sellToSettlement();
    await settlement.submitUtr(order.id, merchantId, 'UTR-9700');

    await settlement.confirmReceipt(order.id, customerId, 'settle-1');
    await settlement.confirmReceipt(order.id, customerId, 'settle-1');

    expect(await balances.balance(merchantAccount, 'AVAILABLE')).toBe(
      '297.000000000000000000',
    );
    const r = await t.pool.query(
      `SELECT count(*)::int AS n FROM ledger_transaction WHERE memo LIKE $1`,
      [`%settlement for order ${order.id}%`],
    );
    expect((r.rows[0] as { n: number }).n).toBe(1);
  });

  /** PRD §7: the snapshot is law, however far the market has moved. */
  it('the order settles at its snapshot rate, not the current one', async () => {
    const { order } = await sellToSettlement();
    await settlement.submitUtr(order.id, merchantId, 'UTR-9700');

    provider.next('120.00');

    await settlement.confirmReceipt(order.id, customerId, 'settle-1');

    const txId = await journalFor(order.id);
    expect(await amountAt(txId, 'REVENUE')).toBe('3.000000000000000000');
    expect(await balances.balance(merchantAccount, 'AVAILABLE')).toBe(
      '297.000000000000000000',
    );
  });
});
