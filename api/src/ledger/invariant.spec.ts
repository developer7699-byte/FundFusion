import { AccountService } from './account.service';
import { BalanceService } from './balance.service';
import { PostingService } from './posting.service';
import { Decimal } from '../money/money';
import { makeTestDb, seedAsset, seedUser, type TestDb } from './test-db';
import { BUCKETS, type Bucket, type PostingRequest } from './ledger.types';

/**
 * PRD §13.4 calls this the highest-value layer and the one most often skipped.
 * It finds ordering bugs that example-based tests miss, and keeps finding them
 * as the code changes.
 *
 * The sequence is seeded, so a failure reproduces exactly.
 */
const SEED = 20261118;
const OPERATIONS = 200;

/** mulberry32 — small, deterministic, no dependency. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let v = Math.imul(a ^ (a >>> 15), 1 | a);
    v = (v + Math.imul(v ^ (v >>> 7), 61 | v)) ^ v;
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  };
}

let t: TestDb;
let accounts: AccountService;
let balances: BalanceService;
let posting: PostingService;
let customerId: string;
let merchantId: string;

beforeAll(async () => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
  balances = new BalanceService(t.db);
  posting = new PostingService(t.db, accounts, balances);

  await t.reset();
  await seedAsset(t.pool);
  customerId = await accounts.ensureAccount(await seedUser(t.pool, 'c@example.test'), 'USDT');
  merchantId = await accounts.ensureAccount(await seedUser(t.pool, 'm@example.test'), 'USDT');
}, 60000);

afterAll(async () => {
  await t.close();
});

async function everyJournalSumsToZero(): Promise<boolean> {
  const r = await t.pool.query(`
    SELECT count(*)::int AS bad FROM (
      SELECT transaction_id,
             SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END) AS net
        FROM ledger_entry GROUP BY transaction_id
    ) j WHERE j.net <> 0
  `);
  return (r.rows[0] as { bad: number }).bad === 0;
}

async function anyNegativeBalance(): Promise<boolean> {
  for (const accountId of [customerId, merchantId]) {
    for (const bucket of BUCKETS) {
      const v = new Decimal(await balances.balance(accountId, bucket));
      if (v.isNegative()) return true;
    }
  }
  return false;
}

async function ledgerWideSum(): Promise<string> {
  const r = await t.pool.query(`
    SELECT COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END),0)::text AS s
      FROM ledger_entry
  `);
  return (r.rows[0] as { s: string }).s;
}

/** Move value between two buckets of one account, or in from EXTERNAL. */
function move(
  accountId: string,
  from: Bucket | 'EXTERNAL',
  to: Bucket | 'EXTERNAL',
  amount: string,
  key: string,
): PostingRequest {
  return {
    idempotencyKey: key,
    memo: `${from}->${to} ${amount}`,
    lines: [
      {
        accountId: from === 'EXTERNAL' ? undefined : accountId,
        accountType: from,
        direction: 'DEBIT',
        amount,
        assetSymbol: 'USDT',
      },
      {
        accountId: to === 'EXTERNAL' ? undefined : accountId,
        accountType: to,
        direction: 'CREDIT',
        amount,
        assetSymbol: 'USDT',
      },
    ],
  };
}

describe('ledger invariants', () => {
  it('every journal sums to zero and no balance is ever negative', async () => {
    const rand = rng(SEED);
    const kinds: [Bucket | 'EXTERNAL', Bucket | 'EXTERNAL'][] = [
      ['EXTERNAL', 'PENDING'],
      ['PENDING', 'AVAILABLE'],
      ['AVAILABLE', 'LOCKED'],
      ['LOCKED', 'AVAILABLE'],
      ['AVAILABLE', 'BONDED'],
      ['BONDED', 'AVAILABLE'],
      ['AVAILABLE', 'EXTERNAL'],
      ['LOCKED', 'EXTERNAL'],
    ];

    for (let i = 0; i < OPERATIONS; i++) {
      const accountId = rand() < 0.5 ? customerId : merchantId;
      const [from, to] = kinds[Math.floor(rand() * kinds.length)];
      // Amounts land on awkward decimal places on purpose.
      const amount = (rand() * 20 + 0.000000000000000001).toFixed(18);
      const req = move(accountId, from, to, amount, `inv-${i}`);

      if (from === 'EXTERNAL') {
        await posting.post(req).catch(() => undefined);
      } else {
        // A rejection for insufficient funds is a legal outcome, not a failure.
        await posting.postDebit(accountId, from, amount, req).catch(() => undefined);
      }

      expect(await everyJournalSumsToZero()).toBe(true);
      expect(await anyNegativeBalance()).toBe(false);
    }
  }, 300000);

  it('total credits equal total debits across the whole ledger', async () => {
    expect(await ledgerWideSum()).toBe('0.000000000000000000');
  });

  it('the sequence actually posted something', async () => {
    const r = await t.pool.query(`SELECT count(*)::int AS n FROM ledger_transaction`);
    expect((r.rows[0] as { n: number }).n).toBeGreaterThan(10);
  });
});
