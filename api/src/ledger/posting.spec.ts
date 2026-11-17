import { AccountService } from './account.service';
import { BalanceService } from './balance.service';
import { PostingService } from './posting.service';
import { makeTestDb, seedAsset, seedUser, type TestDb } from './test-db';
import type { PostingRequest } from './ledger.types';

let t: TestDb;
let accounts: AccountService;
let posting: PostingService;
let accountId: string;

beforeAll(() => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
  posting = new PostingService(t.db, accounts, new BalanceService(t.db));
}, 30000);

beforeEach(async () => {
  await t.reset();
  await seedAsset(t.pool);
  const userId = await seedUser(t.pool);
  accountId = await accounts.ensureAccount(userId, 'USDT');
});

afterAll(async () => {
  await t.close();
});

function transfer(amount: string, key = 'key-1'): PostingRequest {
  return {
    idempotencyKey: key,
    memo: 'deposit credit',
    lines: [
      { accountId, accountType: 'AVAILABLE', direction: 'CREDIT', amount, assetSymbol: 'USDT' },
      { accountType: 'EXTERNAL', direction: 'DEBIT', amount, assetSymbol: 'USDT' },
    ],
  };
}

async function countTransactions(): Promise<number> {
  const r = await t.pool.query(`SELECT count(*)::int AS n FROM ledger_transaction`);
  return (r.rows[0] as { n: number }).n;
}

async function sumOfEntries(txId: string): Promise<string> {
  const r = await t.pool.query(
    `SELECT COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END),0)::text AS s
       FROM ledger_entry WHERE transaction_id = $1`,
    [txId],
  );
  return (r.rows[0] as { s: string }).s;
}

describe('PostingService.post', () => {
  it('posts a balanced two-leg journal', async () => {
    const { id, replayed } = await posting.post(transfer('10'));
    expect(replayed).toBe(false);
    expect(await sumOfEntries(id)).toBe('0.000000000000000000');
  });

  it('rejects an unbalanced journal and writes nothing', async () => {
    const bad = transfer('10');
    bad.lines[1].amount = '9';
    await expect(posting.post(bad)).rejects.toThrow(/balanced/i);
    expect(await countTransactions()).toBe(0);
  });

  it('rejects a single-leg journal', async () => {
    const one = transfer('10');
    one.lines = [one.lines[0]];
    await expect(posting.post(one)).rejects.toThrow(/at least two/i);
  });

  it('rejects a zero amount', async () => {
    await expect(posting.post(transfer('0'))).rejects.toThrow(/positive/i);
  });

  it('rejects a negative amount', async () => {
    await expect(posting.post(transfer('-1'))).rejects.toThrow(/positive/i);
  });

  it('rejects an amount with more precision than the column holds', async () => {
    await expect(posting.post(transfer('0.1234567890123456789'))).rejects.toThrow(/precision/i);
  });

  it('replaying an idempotency key returns the first transaction', async () => {
    const first = await posting.post(transfer('10'));
    const again = await posting.post(transfer('10'));
    expect(again).toEqual({ id: first.id, replayed: true });
    expect(await countTransactions()).toBe(1);
  });

  // A replayed key carrying different intent must be refused, not silently
  // answered with the old result — that would discard the second request.
  it('refuses a replayed key with a different body', async () => {
    await posting.post(transfer('10'));
    await expect(posting.post(transfer('25'))).rejects.toThrow(/idempotency/i);
    expect(await countTransactions()).toBe(1);
  });

  it('stores every amount at the column scale', async () => {
    await posting.post(transfer('10'));
    const r = await t.pool.query(`SELECT amount::text AS a FROM ledger_entry LIMIT 1`);
    expect((r.rows[0] as { a: string }).a).toBe('10.000000000000000000');
  });

  it('a multi-leg journal still sums to zero', async () => {
    const { id } = await posting.post({
      idempotencyKey: 'multi',
      memo: 'settlement',
      lines: [
        { accountId, accountType: 'LOCKED', direction: 'DEBIT', amount: '100', assetSymbol: 'USDT' },
        { accountType: 'EXTERNAL', direction: 'CREDIT', amount: '97', assetSymbol: 'USDT' },
        { accountType: 'REVENUE', direction: 'CREDIT', amount: '3', assetSymbol: 'USDT' },
      ],
    });
    expect(await sumOfEntries(id)).toBe('0.000000000000000000');
  });
});
