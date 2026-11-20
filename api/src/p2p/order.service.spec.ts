import { AccountService } from '../ledger/account.service';
import { BalanceService } from '../ledger/balance.service';
import { PostingService } from '../ledger/posting.service';
import { MockRateProvider } from '../rates/rate.provider';
import { RateService } from '../rates/rate.service';
import {
  makeTestDb,
  seedAsset,
  seedUser,
  type TestDb,
} from '../ledger/test-db';
import { canTransition, ORDER_STATES } from './order.state';
import { OrderService } from './order.service';
import { QuoteService } from './quote.service';

let t: TestDb;
let accounts: AccountService;
let balances: BalanceService;
let posting: PostingService;
let quotes: QuoteService;
let orders: OrderService;
let customerId: string;
let accountId: string;

beforeAll(() => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
  balances = new BalanceService(t.db);
  posting = new PostingService(t.db, accounts, balances);
}, 30000);

beforeEach(async () => {
  await t.reset();
  await seedAsset(t.pool);
  customerId = await seedUser(t.pool, 'customer@example.test');
  accountId = await accounts.ensureAccount(customerId, 'USDT');
  quotes = new QuoteService(t.db, new RateService(new MockRateProvider()));
  orders = new OrderService(t.db, quotes, posting, accounts);
});

afterAll(async () => {
  await t.close();
});

async function fund(amount: string): Promise<void> {
  await posting.post({
    idempotencyKey: `seed-${amount}`,
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

function sellQuote() {
  return quotes.create({ userId: customerId, side: 'SELL', usdtAmount: '100' });
}

describe('confirming an order (PRD §6.3, §6.4)', () => {
  it('a sell order locks the customer USDT: available falls, locked rises', async () => {
    await fund('100');
    const quote = await sellQuote();

    await orders.confirm(quote.id, 'confirm-1');

    expect(await balances.balance(accountId, 'AVAILABLE')).toBe(
      '0.000000000000000000',
    );
    expect(await balances.balance(accountId, 'LOCKED')).toBe(
      '100.000000000000000000',
    );
  });

  it('a buy order moves no customer money — they hold nothing yet', async () => {
    const quote = await quotes.create({
      userId: customerId,
      side: 'BUY',
      usdtAmount: '97',
    });

    await orders.confirm(quote.id, 'confirm-buy');

    expect(await balances.balance(accountId, 'AVAILABLE')).toBe(
      '0.000000000000000000',
    );
    expect(await balances.balance(accountId, 'LOCKED')).toBe(
      '0.000000000000000000',
    );
  });

  it('the order starts in AWAITING_MERCHANT once funds are locked', async () => {
    await fund('100');
    const quote = await sellQuote();

    const order = await orders.confirm(quote.id, 'confirm-2');

    expect(order.status).toBe('AWAITING_MERCHANT');
    expect(order.quoteId).toBe(quote.id);
  });

  /**
   * PRD §7: a quote that outlives its TTL is a free option on the platform.
   * Whoever holds one only exercises it when the market has moved their way.
   */
  it('confirming an expired quote is refused', async () => {
    await fund('100');
    const expiring = new QuoteService(
      t.db,
      new RateService(new MockRateProvider()),
      { ttlSeconds: 0, buyFeeBps: 0 },
    );
    const quote = await expiring.create({
      userId: customerId,
      side: 'SELL',
      usdtAmount: '100',
    });

    await expect(orders.confirm(quote.id, 'confirm-3')).rejects.toThrow(
      /expired/i,
    );
    expect(await balances.balance(accountId, 'LOCKED')).toBe(
      '0.000000000000000000',
    );
  });

  it('confirm is idempotent', async () => {
    await fund('100');
    const quote = await sellQuote();

    const first = await orders.confirm(quote.id, 'confirm-4');
    const second = await orders.confirm(quote.id, 'confirm-4');

    expect(second.id).toBe(first.id);
    expect(await balances.balance(accountId, 'LOCKED')).toBe(
      '100.000000000000000000',
    );
    const r = await t.pool.query(`SELECT count(*)::int AS n FROM p2p_order`);
    expect((r.rows[0] as { n: number }).n).toBe(1);
  });

  it('a customer with insufficient available balance cannot confirm a sell', async () => {
    await fund('99');
    const quote = await sellQuote();

    await expect(orders.confirm(quote.id, 'confirm-5')).rejects.toThrow(
      /insufficient/i,
    );
    expect(await balances.balance(accountId, 'AVAILABLE')).toBe(
      '99.000000000000000000',
    );
    expect(await balances.balance(accountId, 'LOCKED')).toBe(
      '0.000000000000000000',
    );
  });

  it('an order that failed to lock never reaches a merchant', async () => {
    await fund('99');
    const quote = await sellQuote();

    await expect(orders.confirm(quote.id, 'confirm-6')).rejects.toThrow();

    const r = await t.pool.query(`SELECT status FROM p2p_order`);
    const rows = r.rows as { status: string }[];
    expect(rows.every((row) => row.status !== 'AWAITING_MERCHANT')).toBe(true);
  });
});

/** PRD §6.6. */
describe('the state machine', () => {
  const legal: [string, string][] = [
    ['QUOTED', 'AWAITING_MERCHANT'],
    ['QUOTED', 'EXPIRED'],
    ['AWAITING_MERCHANT', 'ACCEPTED'],
    ['AWAITING_MERCHANT', 'EXPIRED'],
    ['ACCEPTED', 'PAYMENT_SUBMITTED'],
    ['ACCEPTED', 'DISPUTED'],
    ['PAYMENT_SUBMITTED', 'COMPLETED'],
    ['PAYMENT_SUBMITTED', 'DISPUTED'],
    ['DISPUTED', 'COMPLETED'],
    ['DISPUTED', 'REFUNDED'],
  ];

  it('every legal transition in §6.6 is allowed', () => {
    for (const [from, to] of legal) {
      expect(canTransition(from, to)).toBe(true);
    }
  });

  it('an illegal transition is refused', () => {
    expect(canTransition('QUOTED', 'COMPLETED')).toBe(false);
  });

  /**
   * A timeout may return funds to where they started. It may never advance
   * them to someone's benefit (PRD §6.9), so silence can never reach a
   * paying state from a waiting one.
   */
  it('nothing advances out of a terminal state', () => {
    for (const terminal of ['COMPLETED', 'REFUNDED', 'EXPIRED']) {
      for (const to of ORDER_STATES) {
        expect(canTransition(terminal, to)).toBe(false);
      }
    }
  });

  it('an order can never jump straight from waiting to completed', () => {
    expect(canTransition('AWAITING_MERCHANT', 'COMPLETED')).toBe(false);
    expect(canTransition('AWAITING_MERCHANT', 'PAYMENT_SUBMITTED')).toBe(false);
  });
});

/**
 * PRD §5 rule 2: every money operation is atomic, idempotent and auditable.
 * The two ways a confirmation can collide are a quote confirmed twice and a
 * key reused for something else; both must be refused rather than silently
 * answered with the wrong order.
 */
describe('collisions', () => {
  it('a quote can be confirmed only once', async () => {
    await fund('100');
    const quote = await sellQuote();
    await orders.confirm(quote.id, 'key-a');

    await expect(orders.confirm(quote.id, 'key-b')).rejects.toThrow(
      /already been confirmed/i,
    );
  });

  it('refuses a key already used for a different quote', async () => {
    await fund('200');
    const first = await sellQuote();
    const second = await sellQuote();
    await orders.confirm(first.id, 'shared-key');

    await expect(orders.confirm(second.id, 'shared-key')).rejects.toThrow(
      /different quote/i,
    );
  });
});
