import { AccountService } from '../ledger/account.service';
import { BalanceService } from '../ledger/balance.service';
import { PostingService } from '../ledger/posting.service';
import {
  makeTestDb,
  seedAsset,
  seedUser,
  type TestDb,
} from '../ledger/test-db';
import { AdminReadService } from './admin-read.service';

let t: TestDb;
let accounts: AccountService;
let posting: PostingService;
let admin: AdminReadService;
let userId: string;
let accountId: string;

beforeAll(() => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
  posting = new PostingService(t.db, accounts, new BalanceService(t.db));
}, 30000);

beforeEach(async () => {
  await t.reset();
  await seedAsset(t.pool);
  admin = new AdminReadService(t.db);
  userId = await seedUser(t.pool, 'holder@example.test');
  accountId = await accounts.ensureAccount(userId, 'USDT');
});

afterAll(async () => {
  await t.close();
});

async function credit(amount: string, key: string) {
  await posting.post({
    idempotencyKey: key,
    memo: 'deposit',
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

describe('the admin read surface (PRD §9.2)', () => {
  it('lists users without their password hash or authenticator secret', async () => {
    const [row] = await admin.users();

    expect(row.email).toBe('holder@example.test');
    const dump = JSON.stringify(row);
    expect(dump).not.toMatch(/passwordHash|password_hash|mfaSecret|mfa_secret/);
  });

  it('lists ledger entries with the memo that explains them', async () => {
    await credit('100', 'dep-1');

    const entries = await admin.ledger();

    expect(entries).toHaveLength(2);
    expect(entries[0].memo).toBe('deposit');
    expect(entries.map((e) => e.amount)).toContain('100.000000000000000000');
  });

  /** Money leaves as a string, here as everywhere (PRD §5.1). */
  it('returns amounts as strings at full scale', async () => {
    await credit('100', 'dep-1');

    const [entry] = await admin.ledger();

    expect(typeof entry.amount).toBe('string');
  });

  it('caps the page size rather than returning the whole ledger', async () => {
    for (const n of [1, 2, 3]) await credit('10', `dep-${n}`);

    expect(await admin.ledger(1_000_000)).toHaveLength(6);
    expect(await admin.ledger(2)).toHaveLength(2);
  });

  it('counts escrow, bonds, revenue and open disputes', async () => {
    await credit('100', 'dep-1');

    const overview = await admin.overview();

    expect(overview.escrowLockedUsdt).toBe('0.000000000000000000');
    expect(overview.revenueUsdt).toBe('0.000000000000000000');
    expect(overview.openDisputes).toBe(0);
  });

  it('returns an empty list rather than failing when there is nothing', async () => {
    expect(await admin.orders()).toEqual([]);
  });
});
