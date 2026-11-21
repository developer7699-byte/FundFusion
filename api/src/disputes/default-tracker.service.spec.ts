import {
  makeTestDb,
  seedAsset,
  seedMerchant,
  seedUser,
  type TestDb,
} from '../ledger/test-db';
import { fixedSettings } from '../settings/platform-settings';
import { AuditService } from '../audit/audit.service';
import { DefaultTrackerService } from './default-tracker.service';

let t: TestDb;
let tracker: DefaultTrackerService;
let merchantId: string;
let merchantProfileId: string;
let customerId: string;

beforeAll(() => {
  t = makeTestDb();
}, 30000);

function build(overrides: Record<string, string | number> = {}) {
  tracker = new DefaultTrackerService(
    t.db,
    new AuditService(t.db),
    fixedSettings(overrides),
  );
}

beforeEach(async () => {
  await t.reset();
  await seedAsset(t.pool);
  build();
  customerId = await seedUser(t.pool, 'customer@example.test');
  const m = await seedMerchant(t.pool, 'merchant@example.test');
  merchantId = m.userId;
  merchantProfileId = m.merchantId;
});

/**
 * A resolved dispute, written directly. The count derives from these rows
 * rather than from a tally column, so a test that did not write them would
 * be asserting against nothing.
 */
async function resolved(
  side: 'BUY' | 'SELL',
  outcome: string,
  key: string,
): Promise<string> {
  const quote = await t.pool.query(
    `INSERT INTO p2p_quote (user_id, side, usdt_amount, inr_amount, reference_rate,
                            customer_rate, markup_bps, platform_fee_usdt,
                            authoritative_side, provider, expires_at)
     VALUES ($1, $2, 100, 9700, 100, 97, 300, 3, 'CRYPTO', 'mock',
             now() + interval '1 hour')
     RETURNING id`,
    [customerId, side],
  );
  const quoteId = (quote.rows[0] as { id: string }).id;

  const order = await t.pool.query(
    `INSERT INTO p2p_order (customer_id, quote_id, status, idempotency)
     VALUES ($1, $2, 'DISPUTED', $3) RETURNING id`,
    [customerId, quoteId, `order-${key}`],
  );
  const orderId = (order.rows[0] as { id: string }).id;

  await t.pool.query(
    `INSERT INTO merchant_assignment (order_id, merchant_id, user_id, accepted_at)
     VALUES ($1, $2, $3, now())`,
    [orderId, merchantProfileId, merchantId],
  );

  const dispute = await t.pool.query(
    `INSERT INTO dispute (order_id, reason, status, outcome)
     VALUES ($1, 'test', 'RESOLVED_CUSTOMER', $2) RETURNING id`,
    [orderId, outcome],
  );
  return (dispute.rows[0] as { id: string }).id;
}

afterAll(async () => {
  await t.close();
});

async function status(): Promise<string> {
  const r = await t.pool.query(
    `SELECT status FROM merchant_profile WHERE user_id = $1`,
    [merchantId],
  );
  return (r.rows[0] as { status: string }).status;
}

/**
 * PRD §6.10. Repeated defaults auto-pause a merchant — but the rule that
 * matters more is the one stated beside it: a merchant is never penalised
 * for a customer's abandonment.
 */
describe('counting what went against the merchant', () => {
  it('counts a sell the merchant failed to pay', async () => {
    await tracker.record(
      merchantId,
      'SELL',
      'REFUND',
      await resolved('SELL', 'REFUND', 'd-1'),
    );

    expect((await tracker.stats(merchantId)).defaults).toBe(1);
  });

  it('counts a penalty as a default', async () => {
    await tracker.record(
      merchantId,
      'SELL',
      'REFUND_WITH_PENALTY',
      await resolved('SELL', 'REFUND_WITH_PENALTY', 'd-1'),
    );

    expect((await tracker.stats(merchantId)).defaults).toBe(1);
  });

  /** A split on a sell is a partial failure to pay, and still a failure. */
  it('counts a split on a sell', async () => {
    await tracker.record(
      merchantId,
      'SELL',
      'SPLIT',
      await resolved('SELL', 'SPLIT', 'd-1'),
    );

    expect((await tracker.stats(merchantId)).defaults).toBe(1);
  });

  /** The merchant was in the right; the escrow went to them. */
  it('does not count a RELEASE', async () => {
    await tracker.record(
      merchantId,
      'SELL',
      'RELEASE',
      await resolved('SELL', 'RELEASE', 'd-1'),
    );

    expect((await tracker.stats(merchantId)).defaults).toBe(0);
  });

  /**
   * The rule PRD §6.10 states twice, because it is the one most easily
   * broken: on a buy the customer is the payer, so a refund means the
   * customer walked away — §6.11's abandonment, never the merchant's fault.
   */
  it('never counts a buy-side refund against the merchant', async () => {
    await tracker.record(
      merchantId,
      'BUY',
      'REFUND',
      await resolved('BUY', 'REFUND', 'd-1'),
    );

    expect((await tracker.stats(merchantId)).defaults).toBe(0);
  });

  /**
   * The count derives from the dispute rows, so recording the same one
   * twice — a retry, a double-click — cannot inflate it.
   */
  it('does not count the same dispute twice', async () => {
    const disputeId = await resolved('SELL', 'REFUND', 'd-1');
    await tracker.record(merchantId, 'SELL', 'REFUND', disputeId);
    await tracker.record(merchantId, 'SELL', 'REFUND', disputeId);

    expect((await tracker.stats(merchantId)).defaults).toBe(1);
  });
});

describe('pausing the desk', () => {
  it('leaves the desk active below the threshold', async () => {
    await tracker.record(
      merchantId,
      'SELL',
      'REFUND',
      await resolved('SELL', 'REFUND', 'd-1'),
    );
    await tracker.record(
      merchantId,
      'SELL',
      'REFUND',
      await resolved('SELL', 'REFUND', 'd-2'),
    );

    expect(await status()).toBe('ACTIVE');
    expect((await tracker.stats(merchantId)).paused).toBe(false);
  });

  it('pauses the desk at the configured count', async () => {
    for (const n of [1, 2, 3]) {
      await tracker.record(
        merchantId,
        'SELL',
        'REFUND',
        await resolved('SELL', 'REFUND', `d-${n}`),
      );
    }

    expect(await status()).toBe('INACTIVE');
    expect((await tracker.stats(merchantId)).paused).toBe(true);
  });

  it('honours a different threshold', async () => {
    build({ 'dispute.defaultsBeforePause': 2 });
    await tracker.record(
      merchantId,
      'SELL',
      'REFUND',
      await resolved('SELL', 'REFUND', 'd-1'),
    );
    await tracker.record(
      merchantId,
      'SELL',
      'REFUND',
      await resolved('SELL', 'REFUND', 'd-2'),
    );

    expect(await status()).toBe('INACTIVE');
  });

  /** A pause an operator cannot explain later is a pause they will undo. */
  it('records the pause and what caused it', async () => {
    for (const n of [1, 2, 3]) {
      await tracker.record(
        merchantId,
        'SELL',
        'REFUND',
        await resolved('SELL', 'REFUND', `d-${n}`),
      );
    }

    const r = await t.pool.query(
      `SELECT action, new_value FROM audit_log WHERE action = 'MERCHANT_PAUSED'`,
    );
    expect(r.rowCount).toBe(1);
    expect(JSON.stringify(r.rows[0])).toMatch(/d-1|defaults/);
  });

  it('does not pause an already paused desk twice', async () => {
    for (const n of [1, 2, 3, 4]) {
      await tracker.record(
        merchantId,
        'SELL',
        'REFUND',
        await resolved('SELL', 'REFUND', `d-${n}`),
      );
    }

    const r = await t.pool.query(
      `SELECT count(*)::int AS n FROM audit_log WHERE action = 'MERCHANT_PAUSED'`,
    );
    expect((r.rows[0] as { n: number }).n).toBe(1);
  });

  it('does nothing for a user who has no desk', async () => {
    const stranger = await seedUser(t.pool, 'stranger@example.test');

    await expect(
      tracker.record(stranger, 'SELL', 'REFUND', 'd-1'),
    ).resolves.toBeUndefined();
  });
});
