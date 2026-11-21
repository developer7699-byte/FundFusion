import { CapabilityService } from '../capability/capability.service';
import { AccountService } from '../ledger/account.service';
import { BalanceService } from '../ledger/balance.service';
import { PostingService } from '../ledger/posting.service';
import {
  makeTestDb,
  seedAsset,
  seedMerchant,
  seedUser,
  type TestDb,
} from '../ledger/test-db';
import { AbandonmentService } from '../p2p/abandonment.service';
import { AssignmentService } from '../p2p/assignment.service';
import { EligibilityService } from '../p2p/eligibility.service';
import { OrderService } from '../p2p/order.service';
import { QuoteService } from '../p2p/quote.service';
import { SettlementService } from '../p2p/settlement.service';
import { MockRateProvider } from '../rates/rate.provider';
import { RateService } from '../rates/rate.service';
import { fixedSettings } from '../settings/platform-settings';
import { AuditService } from '../audit/audit.service';
import { DisputeService } from './dispute.service';

let t: TestDb;
let accounts: AccountService;
let balances: BalanceService;
let posting: PostingService;
let quotes: QuoteService;
let orders: OrderService;
let assignments: AssignmentService;
let settlement: SettlementService;
let disputes: DisputeService;
let customerId: string;
let customerAccount: string;
let merchantId: string;
let merchantAccount: string;

beforeAll(() => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
  balances = new BalanceService(t.db);
  posting = new PostingService(t.db, accounts, balances);
}, 30000);

beforeEach(async () => {
  await t.reset();
  await seedAsset(t.pool);
  const settings = fixedSettings();
  const capabilities = new CapabilityService(t.db);
  const provider = new MockRateProvider();
  provider.next('100.00');
  quotes = new QuoteService(t.db, new RateService(provider), settings);
  orders = new OrderService(
    t.db,
    quotes,
    posting,
    accounts,
    new AbandonmentService(t.db, settings),
  );
  const eligibility = new EligibilityService(
    t.db,
    quotes,
    balances,
    capabilities,
    accounts,
    settings,
  );
  assignments = new AssignmentService(
    t.db,
    quotes,
    eligibility,
    posting,
    accounts,
    settings,
  );
  settlement = new SettlementService(
    t.db,
    quotes,
    eligibility,
    posting,
    accounts,
  );
  disputes = new DisputeService(t.db, new AuditService(t.db));

  customerId = await seedUser(t.pool, 'customer@example.test');
  customerAccount = await accounts.ensureAccount(customerId, 'USDT');
  await fund(customerAccount, '500', 'customer-funds');

  const m = await seedMerchant(t.pool, 'merchant@example.test');
  merchantId = m.userId;
  merchantAccount = await accounts.ensureAccount(merchantId, 'USDT');
  await fund(merchantAccount, '500', 'merchant-funds');
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

/** An accepted sell: the customer's 100 USDT is escrowed, merchant bonded. */
async function acceptedSell(key = 'order-1') {
  const quote = await quotes.create({
    userId: customerId,
    side: 'SELL',
    usdtAmount: '100',
  });
  const order = await orders.confirm(quote.id, customerId, key);
  await assignments.accept(order.id, merchantId, `accept-${key}`);
  return order;
}

describe('opening a dispute (PRD §6.10)', () => {
  it('opens on an accepted order', async () => {
    const order = await acceptedSell();

    const dispute = await disputes.open(
      order.id,
      customerId,
      'no rupees arrived',
    );

    expect(dispute.status).toBe('OPEN');
    expect(dispute.orderId).toBe(order.id);
  });

  it('opens on an order whose payment is claimed but unconfirmed', async () => {
    const order = await acceptedSell();
    await settlement.submitUtr(order.id, merchantId, 'UTR-1');

    await expect(
      disputes.open(order.id, customerId, 'that reference is not mine'),
    ).resolves.toBeDefined();
  });

  it('moves the order to DISPUTED', async () => {
    const order = await acceptedSell();

    await disputes.open(order.id, customerId, 'no rupees arrived');

    const r = await t.pool.query(`SELECT status FROM p2p_order WHERE id = $1`, [
      order.id,
    ]);
    expect((r.rows[0] as { status: string }).status).toBe('DISPUTED');
  });

  /**
   * Opening a dispute is a claim, not a decision. The escrow stays exactly
   * where the engine put it until an admin resolves it — anything else would
   * let either party move money by complaining.
   */
  it('moves no money', async () => {
    const order = await acceptedSell();
    const before = {
      customerLocked: await balances.balance(customerAccount, 'LOCKED'),
      merchantBonded: await balances.balance(merchantAccount, 'BONDED'),
      merchantAvailable: await balances.balance(merchantAccount, 'AVAILABLE'),
    };

    await disputes.open(order.id, customerId, 'no rupees arrived');

    expect(await balances.balance(customerAccount, 'LOCKED')).toBe(
      before.customerLocked,
    );
    expect(await balances.balance(merchantAccount, 'BONDED')).toBe(
      before.merchantBonded,
    );
    expect(await balances.balance(merchantAccount, 'AVAILABLE')).toBe(
      before.merchantAvailable,
    );
  });

  it('can be opened by the merchant as well as the customer', async () => {
    const order = await acceptedSell();

    await expect(
      disputes.open(order.id, merchantId, 'the customer is unreachable'),
    ).resolves.toBeDefined();
  });

  /** An order id is not a capability (PRD §13.5). */
  it('refuses someone who is not party to the order', async () => {
    const order = await acceptedSell();
    const stranger = await seedUser(t.pool, 'stranger@example.test');

    await expect(disputes.open(order.id, stranger, 'curious')).rejects.toThrow(
      /not yours|party/i,
    );
  });

  /** Money has settled; nothing moves it again (PRD §6.6, terminal states). */
  it('refuses a dispute on a completed order', async () => {
    const order = await acceptedSell();
    await settlement.submitUtr(order.id, merchantId, 'UTR-1');
    await settlement.confirmReceipt(order.id, customerId, 'settle-1');

    await expect(
      disputes.open(order.id, customerId, 'changed my mind'),
    ).rejects.toThrow(/COMPLETED|cannot/i);
  });

  it('refuses a dispute on an order still looking for a merchant', async () => {
    const quote = await quotes.create({
      userId: customerId,
      side: 'SELL',
      usdtAmount: '100',
    });
    const order = await orders.confirm(quote.id, customerId, 'unmatched');

    await expect(
      disputes.open(order.id, customerId, 'too slow'),
    ).rejects.toThrow(/AWAITING_MERCHANT|cannot/i);
  });

  /** UNIQUE(order_id) is the arbiter, not a read. */
  it('refuses a second dispute on the same order', async () => {
    const order = await acceptedSell();
    await disputes.open(order.id, customerId, 'no rupees arrived');

    await expect(
      disputes.open(order.id, merchantId, 'I did pay'),
    ).rejects.toThrow(/already/i);
  });

  it('refuses a blank reason', async () => {
    const order = await acceptedSell();

    await expect(disputes.open(order.id, customerId, '   ')).rejects.toThrow(
      /reason/i,
    );
  });

  it('records who opened it and why', async () => {
    const order = await acceptedSell();

    const dispute = await disputes.open(
      order.id,
      customerId,
      'no rupees arrived',
    );

    expect(dispute.openedBy).toBe(customerId);
    expect(dispute.reason).toBe('no rupees arrived');
    const audit = await t.pool.query(
      `SELECT action FROM audit_log WHERE action = 'DISPUTE_OPEN'`,
    );
    expect(audit.rowCount).toBe(1);
  });

  /**
   * §6.9's sweep already moves an order to DISPUTED on a receiver's silence.
   * A dispute row must be openable on an order that is already there, or the
   * timeout path produces disputes no admin can see.
   */
  it('opens on an order the timeout sweep already disputed', async () => {
    const order = await acceptedSell();
    await t.pool.query(
      `UPDATE p2p_order SET status = 'DISPUTED' WHERE id = $1`,
      [order.id],
    );

    await expect(
      disputes.open(order.id, customerId, 'the merchant went quiet'),
    ).resolves.toBeDefined();
  });
});

describe('the dispute queue', () => {
  it('lists open disputes', async () => {
    const order = await acceptedSell();
    await disputes.open(order.id, customerId, 'no rupees arrived');

    const queue = await disputes.queue();

    expect(queue).toHaveLength(1);
    expect(queue[0].orderId).toBe(order.id);
  });

  it('carries the order and its snapshot, so an admin need not go looking', async () => {
    const order = await acceptedSell();
    await disputes.open(order.id, customerId, 'no rupees arrived');

    const [row] = await disputes.queue();

    expect(row.usdtAmount).toBe('100.000000000000000000');
    expect(row.inrAmount).toBe('9700.00');
    expect(row.side).toBe('SELL');
    expect(row.merchantUserId).toBe(merchantId);
  });

  it('reads one dispute by id', async () => {
    const order = await acceptedSell();
    const opened = await disputes.open(order.id, customerId, 'no rupees');

    expect((await disputes.get(opened.id)).id).toBe(opened.id);
  });

  it('refuses a dispute that does not exist', async () => {
    await expect(
      disputes.get('00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow(/does not exist/i);
  });
});
