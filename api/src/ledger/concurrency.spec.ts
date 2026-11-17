import { AccountService } from './account.service';
import { BalanceService } from './balance.service';
import { PostingService } from './posting.service';
import { Decimal } from '../money/money';
import { makeTestDb, seedAsset, seedUser, type TestDb } from './test-db';
import type { PostingRequest } from './ledger.types';

let t: TestDb;
let accounts: AccountService;
let balances: BalanceService;
let posting: PostingService;
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
  const userId = await seedUser(t.pool);
  accountId = await accounts.ensureAccount(userId, 'USDT');
  await posting.post({
    idempotencyKey: 'seed-credit',
    memo: 'opening balance',
    lines: [
      { accountId, accountType: 'AVAILABLE', direction: 'CREDIT', amount: '100', assetSymbol: 'USDT' },
      { accountType: 'EXTERNAL', direction: 'DEBIT', amount: '100', assetSymbol: 'USDT' },
    ],
  });
});

afterAll(async () => {
  await t.close();
});

function debit(amount: string, key: string): PostingRequest {
  return {
    idempotencyKey: key,
    memo: `debit ${amount}`,
    lines: [
      { accountId, accountType: 'AVAILABLE', direction: 'DEBIT', amount, assetSymbol: 'USDT' },
      { accountType: 'EXTERNAL', direction: 'CREDIT', amount, assetSymbol: 'USDT' },
    ],
  };
}

async function countTransactions(): Promise<number> {
  const r = await t.pool.query(`SELECT count(*)::int AS n FROM ledger_transaction`);
  return (r.rows[0] as { n: number }).n;
}

describe('concurrency (PRD §13.4)', () => {
  // Without the row lock, five callers each read a sufficient balance before
  // any of them commits, and together they overdraw the account.
  it('concurrent debits cannot overdraw an account', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        posting.postDebit(accountId, 'AVAILABLE', '30', debit('30', `debit-${i}`)),
      ),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
    expect(fulfilled).toBe(3); // 3 x 30 = 90 <= 100, a fourth would overdraw

    const remaining = await balances.balance(accountId, 'AVAILABLE');
    expect(remaining).toBe('10.000000000000000000');
  });

  it('a balance never goes negative under concurrent load', async () => {
    await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        posting.postDebit(accountId, 'AVAILABLE', '25', debit('25', `many-${i}`)),
      ),
    );
    const remaining = new Decimal(await balances.balance(accountId, 'AVAILABLE'));
    expect(remaining.isNegative()).toBe(false);
  });

  it('the same idempotency key used concurrently posts exactly once', async () => {
    const before = await countTransactions();
    await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        posting.postDebit(accountId, 'AVAILABLE', '10', debit('10', 'same-key')),
      ),
    );
    expect(await countTransactions()).toBe(before + 1);
  });

  it('every journal still sums to zero after concurrent load', async () => {
    await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        posting.postDebit(accountId, 'AVAILABLE', '15', debit('15', `mix-${i}`)),
      ),
    );
    const r = await t.pool.query(`
      SELECT COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END),0)::text AS s
        FROM ledger_entry
    `);
    expect((r.rows[0] as { s: string }).s).toBe('0.000000000000000000');
  });
});
