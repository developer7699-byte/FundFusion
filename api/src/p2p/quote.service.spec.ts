import { BadRequestException } from '@nestjs/common';
import { MockRateProvider } from '../rates/rate.provider';
import { RateService } from '../rates/rate.service';
import { makeTestDb, seedUser, type TestDb } from '../ledger/test-db';
import { QuoteService } from './quote.service';

let t: TestDb;
let rates: RateService;
let quotes: QuoteService;
let userId: string;

beforeAll(() => {
  t = makeTestDb();
}, 30000);

beforeEach(async () => {
  await t.reset();
  userId = await seedUser(t.pool, 'quote@example.test');
  rates = new RateService(new MockRateProvider());
  quotes = new QuoteService(t.db, rates);
});

afterAll(async () => {
  await t.close();
});

/**
 * PRD §6.2 and §7. The mock feed sits at ₹97.00 and the default markup is
 * 300bps, so a sell quotes at ₹94.09 and a buy at ₹99.91.
 */
describe('solving the derived side (PRD §6.2)', () => {
  it('solves INR from a USDT quantity', async () => {
    const q = await quotes.create({ userId, side: 'SELL', usdtAmount: '100' });
    expect(q.inrAmount).toBe('9409.00');
  });

  it('solves USDT from an INR amount', async () => {
    const q = await quotes.create({ userId, side: 'SELL', inrAmount: '10000' });
    expect(q.usdtAmount).toBe('106.281220108406844511');
  });

  it('records which side was authoritative', async () => {
    const q = await quotes.create({ userId, side: 'SELL', usdtAmount: '100' });
    expect(q.authoritativeSide).toBe('CRYPTO');
  });

  it('records the fiat side as authoritative when that is what was typed', async () => {
    const q = await quotes.create({ userId, side: 'SELL', inrAmount: '10000' });
    expect(q.authoritativeSide).toBe('FIAT');
  });

  it('the typed side is exact', async () => {
    const q = await quotes.create({ userId, side: 'SELL', inrAmount: '10000' });
    expect(q.inrAmount).toBe('10000.00');
  });

  /**
   * The derived side absorbs the remainder, and it absorbs it in the
   * platform's favour: what the customer gives up rounds up, what they
   * receive rounds down (PRD §5.1).
   */
  it('a derived payable rounds up, never down', async () => {
    const q = await quotes.create({ userId, side: 'SELL', inrAmount: '10000' });
    const paid = Number(q.usdtAmount) * Number(q.customerRate);
    expect(paid).toBeGreaterThanOrEqual(10000);
  });

  it('a derived payout rounds down, never up', async () => {
    const q = await quotes.create({ userId, side: 'BUY', inrAmount: '10000' });
    const received = Number(q.usdtAmount) * Number(q.customerRate);
    expect(received).toBeLessThanOrEqual(10000);
  });
});

describe('the snapshot (PRD §7)', () => {
  it('stores the reference rate, customer rate, fee and expiry', async () => {
    const q = await quotes.create({ userId, side: 'SELL', usdtAmount: '100' });
    expect(q.referenceRate).toBe('97.00');
    expect(q.customerRate).toBe('94.09');
    expect(q.markupBps).toBe(300);
    // PRD §6.3: the platform's cut is taken from the asset it custodies.
    expect(q.platformFeeUsdt).toBe('3.000000000000000000');
    expect(q.expiresAt.getTime() - q.createdAt.getTime()).toBe(90_000);
  });

  /**
   * PRD §6.4: the fee is charged to the merchant in USDT, and the merchant
   * must see it in the order preview before accepting.
   */
  it('snapshots the buy-side merchant fee', async () => {
    quotes = new QuoteService(t.db, rates, { ttlSeconds: 90, buyFeeBps: 100 });
    const q = await quotes.create({ userId, side: 'BUY', usdtAmount: '97' });
    expect(q.platformFeeUsdt).toBe('0.970000000000000000');
  });

  it('expires after the configured TTL', async () => {
    quotes = new QuoteService(t.db, rates, { ttlSeconds: 30, buyFeeBps: 0 });
    const q = await quotes.create({ userId, side: 'SELL', usdtAmount: '100' });
    expect(q.expiresAt.getTime() - q.createdAt.getTime()).toBe(30_000);
  });

  it('reads back exactly what was written', async () => {
    const q = await quotes.create({ userId, side: 'SELL', usdtAmount: '100' });
    expect(await quotes.get(q.id)).toEqual(q);
  });

  /**
   * The snapshot is law. A snapshot that can be edited is not one, so the
   * refusal lives in the database — not in application discipline.
   */
  it('a snapshot is immutable once written', async () => {
    const q = await quotes.create({ userId, side: 'SELL', usdtAmount: '100' });
    await expect(
      t.pool.query(
        `UPDATE p2p_quote SET customer_rate = '1.00' WHERE id = $1`,
        [q.id],
      ),
    ).rejects.toThrow(/immutable|append-only/i);
  });

  it('a snapshot cannot be deleted either', async () => {
    const q = await quotes.create({ userId, side: 'SELL', usdtAmount: '100' });
    await expect(
      t.pool.query(`DELETE FROM p2p_quote WHERE id = $1`, [q.id]),
    ).rejects.toThrow(/immutable|append-only/i);
  });
});

describe('the customer enters exactly one side (PRD §6.2)', () => {
  it('rejects an order with neither amount', async () => {
    await expect(quotes.create({ userId, side: 'SELL' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects an order with both amounts', async () => {
    await expect(
      quotes.create({
        userId,
        side: 'SELL',
        usdtAmount: '100',
        inrAmount: '10000',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a non-positive amount', async () => {
    await expect(
      quotes.create({ userId, side: 'SELL', usdtAmount: '0' }),
    ).rejects.toThrow(BadRequestException);
  });
});
