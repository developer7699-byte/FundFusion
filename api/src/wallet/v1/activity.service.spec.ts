import { AccountService } from '../../ledger/account.service';
import {
  makeTestDb,
  seedAsset,
  seedUser,
  type TestDb,
} from '../../ledger/test-db';
import { ActivityService } from './activity.service';

let t: TestDb;
let accounts: AccountService;
let activity: ActivityService;
let userId: string;
let accountId: string;

const T0 = '2026-11-21T09:00:00Z';

beforeAll(() => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
  activity = new ActivityService(t.db);
}, 30000);

beforeEach(async () => {
  await t.reset();
  await seedAsset(t.pool);
  userId = await seedUser(t.pool);
  accountId = await accounts.ensureAccount(userId, 'USDT');
});

afterAll(async () => {
  await t.close();
});

/**
 * Writes journal rows directly, so the test does not depend on whichever
 * posting service happens to write this memo today.
 */
async function rawEntry(
  account: string,
  memo: string,
  opts: {
    bucket?: string;
    direction?: 'DEBIT' | 'CREDIT';
    amount?: string;
    at?: string;
  } = {},
) {
  const tx = await t.pool.query<{ id: string }>(
    `INSERT INTO ledger_transaction (reference, memo, idempotency, fingerprint, created_at)
     VALUES (gen_random_uuid()::text, $1, gen_random_uuid()::text, 'x', $2)
     RETURNING id`,
    [memo, opts.at ?? T0],
  );
  await t.pool.query(
    `INSERT INTO ledger_entry (transaction_id, account_id, account_type, direction, amount, asset_symbol)
     VALUES ($1, $2, $3, $4, $5, 'USDT')`,
    [
      tx.rows[0].id,
      account,
      opts.bucket ?? 'AVAILABLE',
      opts.direction ?? 'CREDIT',
      opts.amount ?? '1',
    ],
  );
}

describe('ActivityService (PRD §5 rule 1, §13.5)', () => {
  it("lists this user's ledger entries, newest first", async () => {
    await rawEntry(accountId, 'deposit 0xaaa', { at: '2026-11-21T09:00:00Z' });
    await rawEntry(accountId, 'deposit 0xbbb', { at: '2026-11-21T11:00:00Z' });
    await rawEntry(accountId, 'deposit 0xccc', { at: '2026-11-21T10:00:00Z' });

    const rows = await activity.forUser(userId);

    expect(rows.map((r) => r.memo)).toEqual([
      'deposit 0xbbb',
      'deposit 0xccc',
      'deposit 0xaaa',
    ]);
  });

  it("never includes another user's entries", async () => {
    const otherId = await seedUser(t.pool, 'other@example.test');
    const otherAccount = await accounts.ensureAccount(otherId, 'USDT');
    await rawEntry(accountId, 'deposit mine');
    await rawEntry(otherAccount, 'deposit theirs');

    const rows = await activity.forUser(userId);

    expect(rows).toHaveLength(1);
    expect(rows[0].memo).toBe('deposit mine');
  });

  it('returns amounts as strings at full scale', async () => {
    await rawEntry(accountId, 'deposit 0xaaa', {
      amount: '1.234567890123456789',
    });

    const [row] = await activity.forUser(userId);

    expect(row.amount).toBe('1.234567890123456789');
    expect(typeof row.amount).toBe('string');
  });

  it('labels a deposit, a withdrawal and a settlement differently', async () => {
    await rawEntry(accountId, 'deposit 0xaaa', { at: '2026-11-21T09:00:00Z' });
    await rawEntry(accountId, 'withdrawal to 0xbbb', {
      at: '2026-11-21T10:00:00Z',
    });
    await rawEntry(accountId, 'settlement for order abc', {
      at: '2026-11-21T11:00:00Z',
    });

    const rows = await activity.forUser(userId);

    expect(rows.map((r) => r.kind)).toEqual([
      'SETTLEMENT',
      'WITHDRAWAL',
      'DEPOSIT',
    ]);
  });

  it('caps the page size rather than returning a ledger', async () => {
    const tx = await t.pool.query<{ id: string }>(
      `INSERT INTO ledger_transaction (reference, memo, idempotency, fingerprint)
       VALUES (gen_random_uuid()::text, 'deposit bulk', gen_random_uuid()::text, 'x')
       RETURNING id`,
    );
    await t.pool.query(
      `INSERT INTO ledger_entry (transaction_id, account_id, account_type, direction, amount, asset_symbol)
       SELECT $1, $2, 'AVAILABLE', 'CREDIT', '1', 'USDT' FROM generate_series(1, 201)`,
      [tx.rows[0].id, accountId],
    );

    const rows = await activity.forUser(userId, 10_000);

    expect(rows).toHaveLength(200);
  });

  it('reports the bucket the entry moved, so locked is not shown as spendable', async () => {
    await rawEntry(accountId, 'escrow lock for order abc', {
      bucket: 'LOCKED',
      direction: 'CREDIT',
    });

    const [row] = await activity.forUser(userId);

    expect(row.bucket).toBe('LOCKED');
    expect(row.direction).toBe('CREDIT');
    expect(row.kind).toBe('ESCROW');
  });
});
