import { AccountService } from './account.service';
import { BalanceService } from './balance.service';
import { makeTestDb, seedAsset, seedUser, type TestDb } from './test-db';

let t: TestDb;
let accounts: AccountService;
let balances: BalanceService;
let userId: string;

beforeAll(() => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
  balances = new BalanceService(t.db);
}, 30000);

beforeEach(async () => {
  await t.reset();
  await seedAsset(t.pool);
  userId = await seedUser(t.pool);
});

afterAll(async () => {
  await t.close();
});

/** Writes journal rows directly, so the test does not depend on PostingService. */
async function rawEntry(
  accountId: string,
  accountType: string,
  direction: 'DEBIT' | 'CREDIT',
  amount: string,
) {
  const tx = await t.pool.query(
    `INSERT INTO ledger_transaction (reference, memo, idempotency)
     VALUES (gen_random_uuid()::text, 'test', gen_random_uuid()::text) RETURNING id`,
  );
  await t.pool.query(
    `INSERT INTO ledger_entry (transaction_id, account_id, account_type, direction, amount, asset_symbol)
     VALUES ($1, $2, $3, $4, $5, 'USDT')`,
    [
      (tx.rows[0] as { id: string }).id,
      accountId,
      accountType,
      direction,
      amount,
    ],
  );
}

describe('AccountService', () => {
  it('creates a wallet account and returns its id', async () => {
    const id = await accounts.ensureAccount(userId, 'USDT');
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('is idempotent — the same user and asset resolve to one account', async () => {
    const a = await accounts.ensureAccount(userId, 'USDT');
    const b = await accounts.ensureAccount(userId, 'USDT');
    expect(a).toBe(b);
  });

  it('converging concurrent callers still produce one account', async () => {
    const ids = await Promise.all(
      Array.from({ length: 5 }, () => accounts.ensureAccount(userId, 'USDT')),
    );
    expect(new Set(ids).size).toBe(1);
  });
});

describe('BalanceService (PRD §5 rule 1 — derived, never stored)', () => {
  it('a new account is zero in every bucket', async () => {
    const id = await accounts.ensureAccount(userId, 'USDT');
    expect(await balances.balances(id)).toEqual({
      AVAILABLE: '0.000000000000000000',
      LOCKED: '0.000000000000000000',
      BONDED: '0.000000000000000000',
      PENDING: '0.000000000000000000',
    });
  });

  it('derives a balance by summing entries', async () => {
    const id = await accounts.ensureAccount(userId, 'USDT');
    await rawEntry(id, 'AVAILABLE', 'CREDIT', '100');
    await rawEntry(id, 'AVAILABLE', 'DEBIT', '30');
    expect(await balances.balance(id, 'AVAILABLE')).toBe(
      '70.000000000000000000',
    );
  });

  it('keeps buckets independent', async () => {
    const id = await accounts.ensureAccount(userId, 'USDT');
    await rawEntry(id, 'AVAILABLE', 'CREDIT', '70');
    await rawEntry(id, 'LOCKED', 'CREDIT', '30');
    expect(await balances.balance(id, 'LOCKED')).toBe('30.000000000000000000');
    expect(await balances.balance(id, 'AVAILABLE')).toBe(
      '70.000000000000000000',
    );
  });

  it('preserves all 18 decimal places', async () => {
    const id = await accounts.ensureAccount(userId, 'USDT');
    await rawEntry(id, 'AVAILABLE', 'CREDIT', '0.123456789012345678');
    expect(await balances.balance(id, 'AVAILABLE')).toBe(
      '0.123456789012345678',
    );
  });

  it('wallet_account still has no balance column to read', async () => {
    const res = await t.pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'wallet_account'`,
    );
    const names = res.rows.map((r: { column_name: string }) => r.column_name);
    expect(names).not.toContain('available');
    expect(names).not.toContain('locked');
  });
});
