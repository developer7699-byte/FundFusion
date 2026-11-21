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
import { MockRateProvider } from '../rates/rate.provider';
import { RateService } from '../rates/rate.service';
import { fixedSettings } from '../settings/platform-settings';
import { AbandonmentService } from './abandonment.service';
import { AssignmentService } from './assignment.service';
import { EligibilityService } from './eligibility.service';
import { OrderFeedService } from './order-feed.service';
import { OrderService } from './order.service';
import { QuoteService } from './quote.service';

let t: TestDb;
let accounts: AccountService;
let balances: BalanceService;
let posting: PostingService;
let capabilities: CapabilityService;
let quotes: QuoteService;
let orders: OrderService;
let assignments: AssignmentService;
let eligibility: EligibilityService;
let feed: OrderFeedService;
let customerId: string;
let customerAccount: string;
let merchantId: string;

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
  const settings = fixedSettings();
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
  eligibility = new EligibilityService(
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
  feed = new OrderFeedService(t.db, quotes, eligibility, settings);

  customerId = await seedUser(t.pool, 'customer@example.test');
  customerAccount = await accounts.ensureAccount(customerId, 'USDT');
  await fund(customerAccount, '1000', 'customer-funds');

  const m = await seedMerchant(t.pool, 'merchant@example.test');
  merchantId = m.userId;
  const merchantAccount = await accounts.ensureAccount(merchantId, 'USDT');
  await fund(merchantAccount, '1000', 'merchant-funds');
  await capabilities.grant(merchantId, 'P2P_SELL', {
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

async function sellOrder(key = 'order-1') {
  const quote = await quotes.create({
    userId: customerId,
    side: 'SELL',
    usdtAmount: '100',
  });
  return orders.confirm(quote.id, customerId, key);
}

describe('what a merchant may accept (PRD §6.7)', () => {
  it('offers an order the merchant can take', async () => {
    const order = await sellOrder();

    const offered = await feed.availableFor(merchantId);

    expect(offered.map((o) => o.orderId)).toEqual([order.id]);
  });

  /** Money crosses the boundary as strings (PRD §5.1). */
  it('states the snapshot and the obligation as strings', async () => {
    await sellOrder();

    const [offered] = await feed.availableFor(merchantId);

    expect(offered.usdtAmount).toBe('100.000000000000000000');
    expect(offered.inrAmount).toBe('9700.00');
    expect(typeof offered.obligationUsdt).toBe('string');
  });

  /** Review Focus #1 — the same refusal the engine makes, made earlier. */
  it('never offers a merchant their own order', async () => {
    await t.pool.query(
      `INSERT INTO merchant_profile (user_id, desk_name, status, buy_enabled, sell_enabled)
       VALUES ($1, 'own-desk', 'ACTIVE', true, true)`,
      [customerId],
    );
    await capabilities.grant(customerId, 'P2P_SELL', {
      actorId: null,
      reason: 'merchant onboarding',
    });
    await sellOrder();

    expect(await feed.availableFor(customerId)).toEqual([]);
  });

  /**
   * Review Focus #2. A feed that lists what cannot be accepted costs the
   * merchant a wasted request and costs us their trust in the queue.
   */
  it('omits an order already assigned', async () => {
    const order = await sellOrder();
    await assignments.accept(order.id, merchantId, 'a-1');

    const other = await seedMerchant(t.pool, 'other@example.test');
    const otherAccount = await accounts.ensureAccount(other.userId, 'USDT');
    await fund(otherAccount, '1000', 'other-funds');
    await capabilities.grant(other.userId, 'P2P_SELL', {
      actorId: null,
      reason: 'merchant onboarding',
    });

    expect(await feed.availableFor(other.userId)).toEqual([]);
  });

  it('omits an order past its search window', async () => {
    const order = await sellOrder();
    await t.pool.query(
      `UPDATE p2p_order SET broadcast_at = now() - interval '10 minutes' WHERE id = $1`,
      [order.id],
    );

    expect(await feed.availableFor(merchantId)).toEqual([]);
  });

  it('omits a side the merchant has no capability for', async () => {
    await sellOrder();
    await capabilities.deny(merchantId, 'P2P_SELL', {
      actorId: null,
      reason: 'risk hold',
    });

    expect(await feed.availableFor(merchantId)).toEqual([]);
  });

  it('omits an order the merchant cannot afford', async () => {
    const poor = await seedMerchant(t.pool, 'poor@example.test');
    await accounts.ensureAccount(poor.userId, 'USDT');
    await capabilities.grant(poor.userId, 'P2P_SELL', {
      actorId: null,
      reason: 'merchant onboarding',
    });
    await sellOrder();

    expect(await feed.availableFor(poor.userId)).toEqual([]);
  });

  it('offers nothing to someone who is not a merchant', async () => {
    await sellOrder();
    const stranger = await seedUser(t.pool, 'stranger@example.test');

    expect(await feed.availableFor(stranger)).toEqual([]);
  });

  it('lists the oldest broadcast first', async () => {
    const first = await sellOrder('order-a');
    const second = await sellOrder('order-b');
    await t.pool.query(
      `UPDATE p2p_order SET broadcast_at = now() - interval '30 seconds' WHERE id = $1`,
      [first.id],
    );

    const offered = await feed.availableFor(merchantId);

    expect(offered.map((o) => o.orderId)).toEqual([first.id, second.id]);
  });
});

describe('reading one order (PRD §13.5)', () => {
  it('shows the customer their own order with its snapshot', async () => {
    const order = await sellOrder();

    const detail = await feed.detail(order.id, customerId);

    expect(detail.orderId).toBe(order.id);
    expect(detail.status).toBe('AWAITING_MERCHANT');
    expect(detail.usdtAmount).toBe('100.000000000000000000');
    expect(detail.role).toBe('CUSTOMER');
  });

  it('shows the assigned merchant the same order', async () => {
    const order = await sellOrder();
    await assignments.accept(order.id, merchantId, 'a-1');

    const detail = await feed.detail(order.id, merchantId);

    expect(detail.role).toBe('MERCHANT');
    expect(detail.status).toBe('ACCEPTED');
  });

  /** An order id is not a capability. */
  it('refuses a stranger', async () => {
    const order = await sellOrder();
    const stranger = await seedUser(t.pool, 'stranger@example.test');

    await expect(feed.detail(order.id, stranger)).rejects.toThrow(
      /not yours|forbidden/i,
    );
  });

  it('refuses a merchant who did not win the order', async () => {
    const order = await sellOrder();
    const other = await seedMerchant(t.pool, 'other@example.test');

    await expect(feed.detail(order.id, other.userId)).rejects.toThrow(
      /not yours|forbidden/i,
    );
  });

  it('refuses an order that does not exist', async () => {
    await expect(
      feed.detail('00000000-0000-0000-0000-000000000000', customerId),
    ).rejects.toThrow(/does not exist/i);
  });
});

describe('the orders I am party to (PRD §13.5)', () => {
  it('lists orders where I am the customer', async () => {
    const order = await sellOrder();

    const mine = await feed.minePaged(customerId);

    expect(mine.map((o) => o.orderId)).toEqual([order.id]);
    expect(mine[0].role).toBe('CUSTOMER');
  });

  it('lists orders where I am the assigned merchant', async () => {
    const order = await sellOrder();
    await assignments.accept(order.id, merchantId, 'accept-1');

    const mine = await feed.minePaged(merchantId);

    expect(mine.map((o) => o.orderId)).toEqual([order.id]);
    expect(mine[0].role).toBe('MERCHANT');
  });

  it('never lists an order I am not party to', async () => {
    await sellOrder();
    const stranger = await seedUser(t.pool, 'stranger@example.test');

    expect(await feed.minePaged(stranger)).toEqual([]);
  });
});
