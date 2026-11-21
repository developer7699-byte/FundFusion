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
import { MockRateProvider } from '../rates/rate.provider';
import { RateService } from '../rates/rate.service';
import { fixedSettings } from '../settings/platform-settings';
import { AuditService } from '../audit/audit.service';
import { DisputeService } from './dispute.service';
import { ResolutionService } from './resolution.service';

let t: TestDb;
let accounts: AccountService;
let balances: BalanceService;
let posting: PostingService;
let quotes: QuoteService;
let orders: OrderService;
let assignments: AssignmentService;
let disputes: DisputeService;
let resolution: ResolutionService;
let customerId: string;
let customerAccount: string;
let merchantId: string;
let merchantAccount: string;
let adminId: string;
let supportId: string;

beforeAll(() => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
  balances = new BalanceService(t.db);
  posting = new PostingService(t.db, accounts, balances);
}, 30000);

function build(overrides: Record<string, string | number> = {}) {
  const settings = fixedSettings(overrides);
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
  const audit = new AuditService(t.db);
  disputes = new DisputeService(t.db, audit);
  resolution = new ResolutionService(
    t.db,
    quotes,
    eligibility,
    posting,
    accounts,
    audit,
    settings,
  );
  return capabilities;
}

beforeEach(async () => {
  await t.reset();
  await seedAsset(t.pool);
  const capabilities = build();

  customerId = await seedUser(t.pool, 'customer@example.test');
  customerAccount = await accounts.ensureAccount(customerId, 'USDT');
  await fund(customerAccount, '500', 'customer-funds');

  const m = await seedMerchant(t.pool, 'merchant@example.test');
  merchantId = m.userId;
  merchantAccount = await accounts.ensureAccount(merchantId, 'USDT');
  await fund(merchantAccount, '500', 'merchant-funds');
  for (const capability of ['P2P_SELL', 'P2P_BUY'] as const) {
    await capabilities.grant(merchantId, capability, {
      actorId: null,
      reason: 'merchant onboarding',
    });
  }

  adminId = await seedUser(t.pool, 'admin@example.test');
  await grantRole(adminId, 'SUPER_ADMIN');
  supportId = await seedUser(t.pool, 'support@example.test');
  await grantRole(supportId, 'SUPPORT');
});

afterAll(async () => {
  await t.close();
});

async function grantRole(userId: string, name: string) {
  await t.pool.query(
    `INSERT INTO role (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
    [name],
  );
  await t.pool.query(
    `INSERT INTO user_role (user_id, role_id)
     SELECT $1, id FROM role WHERE name = $2`,
    [userId, name],
  );
}

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

/** A disputed sell: 100 USDT escrowed by the customer, 100 bonded by the merchant. */
async function disputedSell(key = 'order-1') {
  const quote = await quotes.create({
    userId: customerId,
    side: 'SELL',
    usdtAmount: '100',
  });
  const order = await orders.confirm(quote.id, customerId, key);
  await assignments.accept(order.id, merchantId, `accept-${key}`);
  return disputes.open(order.id, customerId, 'no rupees arrived');
}

/** A disputed buy: the merchant locked 100 + fee; the customer owes rupees. */
async function disputedBuy(key = 'buy-1') {
  const quote = await quotes.create({
    userId: customerId,
    side: 'BUY',
    usdtAmount: '100',
  });
  const order = await orders.confirm(quote.id, customerId, key);
  await assignments.accept(order.id, merchantId, `accept-${key}`);
  return disputes.open(order.id, merchantId, 'the customer never paid');
}

const RELEASE = {
  outcome: 'RELEASE' as const,
  reason: 'bank statement shows the transfer',
};
const REFUND = { outcome: 'REFUND' as const, reason: 'no transfer found' };

describe('RELEASE — the payer did pay (PRD §6.10)', () => {
  it('pays the merchant and takes the platform fee on a sell', async () => {
    const dispute = await disputedSell();

    await resolution.resolve(dispute.id, adminId, RELEASE, 'r-1');

    // 500 opening, 100 bonded at accept, then 97 earned and the bond back.
    expect(await balances.balance(merchantAccount, 'AVAILABLE')).toBe(
      '597.000000000000000000',
    );
    expect(await revenue()).toBe('3.000000000000000000');
    expect(await balances.balance(customerAccount, 'LOCKED')).toBe(
      '0.000000000000000000',
    );
  });

  it('releases the bond in the same journal', async () => {
    const dispute = await disputedSell();

    await resolution.resolve(dispute.id, adminId, RELEASE, 'r-1');

    expect(await balances.balance(merchantAccount, 'BONDED')).toBe(
      '0.000000000000000000',
    );
  });

  it('credits the customer the quantity on a buy', async () => {
    const dispute = await disputedBuy();

    await resolution.resolve(dispute.id, adminId, RELEASE, 'r-1');

    expect(await balances.balance(customerAccount, 'AVAILABLE')).toBe(
      '600.000000000000000000',
    );
    expect(await balances.balance(merchantAccount, 'LOCKED')).toBe(
      '0.000000000000000000',
    );
  });

  it('moves the order to COMPLETED', async () => {
    const dispute = await disputedSell();

    await resolution.resolve(dispute.id, adminId, RELEASE, 'r-1');

    expect(await orderStatus(dispute.orderId)).toBe('COMPLETED');
  });
});

describe('REFUND — the payer did not pay (PRD §6.10)', () => {
  it('returns the whole escrow to the customer on a sell', async () => {
    const dispute = await disputedSell();

    await resolution.resolve(dispute.id, adminId, REFUND, 'r-1');

    expect(await balances.balance(customerAccount, 'AVAILABLE')).toBe(
      '500.000000000000000000',
    );
    expect(await balances.balance(customerAccount, 'LOCKED')).toBe(
      '0.000000000000000000',
    );
  });

  /** Nothing was sold, so the platform earns nothing. */
  it('takes no platform fee', async () => {
    const dispute = await disputedSell();

    await resolution.resolve(dispute.id, adminId, REFUND, 'r-1');

    expect(await revenue()).toBe('0.000000000000000000');
  });

  it('releases the merchant bond untouched', async () => {
    const dispute = await disputedSell();

    await resolution.resolve(dispute.id, adminId, REFUND, 'r-1');

    expect(await balances.balance(merchantAccount, 'BONDED')).toBe(
      '0.000000000000000000',
    );
    expect(await balances.balance(merchantAccount, 'AVAILABLE')).toBe(
      '500.000000000000000000',
    );
  });

  it('returns the locked USDT to the merchant on a buy', async () => {
    const dispute = await disputedBuy();

    await resolution.resolve(dispute.id, adminId, REFUND, 'r-1');

    expect(await balances.balance(merchantAccount, 'AVAILABLE')).toBe(
      '500.000000000000000000',
    );
    expect(await balances.balance(customerAccount, 'AVAILABLE')).toBe(
      '500.000000000000000000',
    );
  });

  it('moves the order to REFUNDED', async () => {
    const dispute = await disputedSell();

    await resolution.resolve(dispute.id, adminId, REFUND, 'r-1');

    expect(await orderStatus(dispute.orderId)).toBe('REFUNDED');
  });
});

describe('who may resolve, and how often', () => {
  /**
   * Review Focus #1. A resolution is triggered by a person, and a person may
   * double-click. The ledger may not double-pay.
   */
  it('is idempotent under the same key', async () => {
    const dispute = await disputedSell();
    await resolution.resolve(dispute.id, adminId, RELEASE, 'r-1');

    await resolution.resolve(dispute.id, adminId, RELEASE, 'r-1');

    expect(await balances.balance(merchantAccount, 'AVAILABLE')).toBe(
      '597.000000000000000000',
    );
    expect(await revenue()).toBe('3.000000000000000000');
  });

  it('refuses a second resolution under a different key', async () => {
    const dispute = await disputedSell();
    await resolution.resolve(dispute.id, adminId, RELEASE, 'r-1');

    await expect(
      resolution.resolve(dispute.id, adminId, REFUND, 'r-2'),
    ).rejects.toThrow(/already resolved|cannot/i);
  });

  /**
   * Review Focus #4. PRD §9.2 exists to separate people who look at things
   * from people who move money, and this is the largest discretionary
   * movement in the product.
   */
  it('refuses a SUPPORT account', async () => {
    const dispute = await disputedSell();

    await expect(
      resolution.resolve(dispute.id, supportId, RELEASE, 'r-1'),
    ).rejects.toThrow(/administrator|SUPER_ADMIN/i);
  });

  it('refuses an ordinary user', async () => {
    const dispute = await disputedSell();

    await expect(
      resolution.resolve(dispute.id, customerId, RELEASE, 'r-1'),
    ).rejects.toThrow(/administrator|SUPER_ADMIN/i);
  });

  it('moves no money when a SUPPORT account tries', async () => {
    const dispute = await disputedSell();

    await expect(
      resolution.resolve(dispute.id, supportId, RELEASE, 'r-1'),
    ).rejects.toThrow();
    expect(await balances.balance(customerAccount, 'LOCKED')).toBe(
      '100.000000000000000000',
    );
  });

  /** PRD §9.4: every privileged action carries a typed reason, stored. */
  it('refuses a resolution with no reason', async () => {
    const dispute = await disputedSell();

    await expect(
      resolution.resolve(
        dispute.id,
        adminId,
        { outcome: 'RELEASE', reason: '  ' },
        'r-1',
      ),
    ).rejects.toThrow(/reason/i);
  });

  it('records who resolved it, how, and why', async () => {
    const dispute = await disputedSell();

    await resolution.resolve(dispute.id, adminId, RELEASE, 'r-1');

    const row = await t.pool.query(
      `SELECT outcome, resolved_by, resolution_reason, status FROM dispute WHERE id = $1`,
      [dispute.id],
    );
    const d = row.rows[0] as {
      outcome: string;
      resolved_by: string;
      resolution_reason: string;
      status: string;
    };
    expect(d.outcome).toBe('RELEASE');
    expect(d.resolved_by).toBe(adminId);
    expect(d.resolution_reason).toMatch(/bank statement/);
    expect(d.status).toBe('RESOLVED_MERCHANT');

    const audit = await t.pool.query(
      `SELECT action FROM audit_log WHERE action = 'DISPUTE_RESOLVE'`,
    );
    expect(audit.rowCount).toBe(1);
  });

  it('refuses a dispute that does not exist', async () => {
    await expect(
      resolution.resolve(
        '00000000-0000-0000-0000-000000000000',
        adminId,
        RELEASE,
        'r-1',
      ),
    ).rejects.toThrow(/does not exist/i);
  });
});

describe('what every resolution leaves behind', () => {
  it('leaves every journal balanced', async () => {
    const dispute = await disputedSell();

    await resolution.resolve(dispute.id, adminId, RELEASE, 'r-1');

    const bad = await t.pool.query(
      `SELECT transaction_id FROM ledger_entry GROUP BY transaction_id
        HAVING SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END) <> 0`,
    );
    expect(bad.rowCount).toBe(0);
  });

  it('leaves no balance negative', async () => {
    const dispute = await disputedSell();

    await resolution.resolve(dispute.id, adminId, REFUND, 'r-1');

    const negative = await t.pool.query(
      `SELECT account_id FROM ledger_entry
        WHERE account_id IS NOT NULL
        GROUP BY account_id, account_type
       HAVING SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END) < 0`,
    );
    expect(negative.rowCount).toBe(0);
  });
});

async function revenue(): Promise<string> {
  const r = await t.pool.query(
    `SELECT COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END),0)::numeric(38,18)::text AS v
       FROM ledger_entry WHERE account_type = 'REVENUE'`,
  );
  return (r.rows[0] as { v: string }).v;
}

async function orderStatus(orderId: string): Promise<string> {
  const r = await t.pool.query(`SELECT status FROM p2p_order WHERE id = $1`, [
    orderId,
  ]);
  return (r.rows[0] as { status: string }).status;
}
