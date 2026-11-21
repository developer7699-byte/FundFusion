import { AuditService } from '../../audit/audit.service';
import { MfaService } from '../../auth/v1/mfa.service';
import { generateSecret, timeCounter, totpCode } from '../../auth/v1/totp';
import { CapabilityService } from '../../capability/capability.service';
import { AccountService } from '../../ledger/account.service';
import { BalanceService } from '../../ledger/balance.service';
import { PostingService } from '../../ledger/posting.service';
import { makeTestDb, seedUser, type TestDb } from '../../ledger/test-db';
import { fixedSettings } from '../../settings/platform-settings';
import { AllowlistService } from './allowlist.service';
import { WithdrawalService } from './withdrawal.service';

let t: TestDb;
let accounts: AccountService;
let balances: BalanceService;
let posting: PostingService;
let capabilities: CapabilityService;
let allowlist: AllowlistService;
let withdrawals: WithdrawalService;
let userId: string;
let accountId: string;
let adminId: string;
let secret: string;

const NETWORK = 'BSC_TESTNET';
const ADDRESS = '0x4b7877dD11Ef2d15297Cb0a013F8513d8D9EBf3C';
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = Date.UTC(2026, 10, 21, 9, 0, 0);
/** Every test withdraws to an address whose cooldown has already run. */
const USABLE = T0 + 25 * HOUR;

beforeAll(() => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
  balances = new BalanceService(t.db);
  posting = new PostingService(t.db, accounts, balances);
  capabilities = new CapabilityService(t.db);
}, 30000);

function build(overrides: Record<string, string | number> = {}) {
  const settings = fixedSettings(overrides);
  const mfa = new MfaService(t.db);
  const audit = new AuditService(t.db);
  allowlist = new AllowlistService(t.db, mfa, audit, settings);
  withdrawals = new WithdrawalService(
    t.db,
    allowlist,
    mfa,
    capabilities,
    posting,
    accounts,
    audit,
    settings,
  );
}

beforeEach(async () => {
  await t.reset();
  const asset = await t.pool.query(
    `INSERT INTO asset (symbol, name, decimals, kind)
     VALUES ('USDT', 'Tether USD', 18, 'CRYPTO') RETURNING id`,
  );
  await t.pool.query(
    `INSERT INTO blockchain_network (asset_id, code, name) VALUES ($1, $2, 'BSC Testnet')`,
    [(asset.rows[0] as { id: string }).id, NETWORK],
  );

  build();

  userId = await seedUser(t.pool, 'holder@example.test');
  adminId = await seedUser(t.pool, 'admin@example.test');
  secret = generateSecret();
  await t.pool.query(
    `UPDATE "user" SET email_verified_at = now(), mfa_secret = $2, mfa_enrolled_at = now() WHERE id = $1`,
    [userId, secret],
  );
  accountId = await accounts.ensureAccount(userId, 'USDT');
  await capabilities.grant(userId, 'WITHDRAW', {
    actorId: null,
    reason: 'customer onboarding',
  });
  await fund('10000');
  await allowlist.add(userId, ADDRESS, codeAt(T0), { now: T0 });
});

afterAll(async () => {
  await t.close();
});

function codeAt(now: number): string {
  return totpCode(secret, timeCounter(now));
}

async function fund(amount: string) {
  await posting.post({
    idempotencyKey: `fund-${amount}`,
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

/** A request at `now`, with the authenticator code for that instant. */
function request(amount: string, key: string, now = USABLE) {
  return withdrawals.request(userId, ADDRESS, amount, codeAt(now), key, now);
}

describe('the three controls (PRD §8.4)', () => {
  it('refuses an address that is not on the allowlist', async () => {
    await expect(
      withdrawals.request(
        userId,
        '0x356545e8Cc9aB65B7f6BA2B761653CeA86a8317A',
        '50',
        codeAt(USABLE),
        'w-1',
        USABLE,
      ),
    ).rejects.toThrow(/allowlist/i);
  });

  it('refuses an allowlisted address inside its cooldown', async () => {
    await expect(request('50', 'w-1', T0 + 2 * HOUR)).rejects.toThrow(
      /usable|cooldown/i,
    );
  });

  /** A valid session is never sufficient — the code is a separate proof. */
  it('refuses without a valid authenticator code', async () => {
    await expect(
      withdrawals.request(userId, ADDRESS, '50', '000000', 'w-1', USABLE),
    ).rejects.toThrow(/code/i);
  });

  /**
   * A TOTP code is valid for a whole 30-second window. Without this, one
   * code authorises every withdrawal submitted inside it.
   */
  it('refuses a code already used for a different withdrawal', async () => {
    const code = codeAt(USABLE);
    await withdrawals.request(userId, ADDRESS, '50', code, 'w-1', USABLE);

    await expect(
      withdrawals.request(userId, ADDRESS, '50', code, 'w-2', USABLE),
    ).rejects.toThrow(/already/i);
  });

  it('refuses a user without the WITHDRAW capability', async () => {
    await capabilities.deny(userId, 'WITHDRAW', {
      actorId: adminId,
      reason: 'risk hold',
    });

    await expect(request('50', 'w-1')).rejects.toThrow(/capab|withdraw/i);
  });
});

describe('review threshold and caps (PRD §8.4)', () => {
  it('auto-approves at or below the threshold', async () => {
    const w = await request('100', 'w-1');

    expect(w.status).toBe('APPROVED');
  });

  it('queues above the threshold', async () => {
    const w = await request('101', 'w-1');

    expect(w.status).toBe('QUEUED');
  });

  it('locks the funds at request, whether queued or approved', async () => {
    await request('500', 'w-1');

    expect(await balances.balance(accountId, 'LOCKED')).toBe(
      '500.000000000000000000',
    );
    expect(await balances.balance(accountId, 'AVAILABLE')).toBe(
      '9500.000000000000000000',
    );
  });

  it('enforces the daily cap across several withdrawals', async () => {
    await request('600', 'w-1');
    await request('300', 'w-2', USABLE + 60_000);

    await expect(request('200', 'w-3', USABLE + 120_000)).rejects.toThrow(
      /daily/i,
    );
  });

  it('lets the daily cap lapse after a rolling day', async () => {
    await request('900', 'w-1');

    await expect(
      request('900', 'w-2', USABLE + DAY + 60_000),
    ).resolves.toBeDefined();
  });

  /**
   * A day apart plus a minute, so each request clears the previous one's
   * rolling day and only the weekly window can bind.
   */
  it('enforces the weekly cap across several days', async () => {
    const dayApart = (n: number) => USABLE + n * (DAY + 60_000);
    for (const day of [0, 1, 2, 3, 4]) {
      await request('1000', `w-${day}`, dayApart(day));
    }

    await expect(request('1000', 'w-over', dayApart(5))).rejects.toThrow(
      /weekly/i,
    );
  });

  it('counts a rejected withdrawal against neither cap', async () => {
    const w = await request('900', 'w-1');
    await withdrawals.reject(w.id, adminId, 'customer asked to cancel');

    await expect(request('900', 'w-2', USABLE + 60_000)).resolves.toBeDefined();
  });

  it('refuses an amount below the minimum', async () => {
    await expect(request('1', 'w-1')).rejects.toThrow(/minimum|smallest/i);
  });

  it('refuses more than the balance holds', async () => {
    build({
      'withdrawal.dailyCapUsdt': '100000',
      'withdrawal.weeklyCapUsdt': '100000',
    });

    await expect(request('20000', 'w-1')).rejects.toThrow(/insufficient/i);
  });
});

describe('the fee', () => {
  it('locks the amount plus the fee', async () => {
    build({ 'withdrawal.feeUsdt': '2' });

    await request('100', 'w-1');

    expect(await balances.balance(accountId, 'LOCKED')).toBe(
      '102.000000000000000000',
    );
  });

  it('posts no zero fee leg when the fee is zero', async () => {
    await request('100', 'w-1');

    const r = await t.pool.query(
      `SELECT count(*)::int AS n FROM ledger_entry WHERE amount = 0`,
    );
    expect((r.rows[0] as { n: number }).n).toBe(0);
  });
});

describe('review', () => {
  it('returns the funds when a queued withdrawal is rejected', async () => {
    const w = await request('500', 'w-1');

    await withdrawals.reject(w.id, adminId, 'address linked to a known scam');

    expect(await balances.balance(accountId, 'LOCKED')).toBe(
      '0.000000000000000000',
    );
    expect(await balances.balance(accountId, 'AVAILABLE')).toBe(
      '10000.000000000000000000',
    );
  });

  it('keeps the funds locked when a queued withdrawal is approved', async () => {
    const w = await request('500', 'w-1');

    const approved = await withdrawals.approve(w.id, adminId, 'reviewed');

    expect(approved.status).toBe('APPROVED');
    expect(await balances.balance(accountId, 'LOCKED')).toBe(
      '500.000000000000000000',
    );
  });

  it('refuses to reject a withdrawal twice', async () => {
    const w = await request('500', 'w-1');
    await withdrawals.reject(w.id, adminId, 'first');

    await expect(withdrawals.reject(w.id, adminId, 'again')).rejects.toThrow(
      /REJECTED|cannot/i,
    );
  });

  it('records who reviewed it and why', async () => {
    const w = await request('500', 'w-1');

    await withdrawals.reject(w.id, adminId, 'address linked to a known scam');

    const r = await t.pool.query(
      `SELECT reviewed_by, review_reason FROM withdrawal WHERE id = $1`,
      [w.id],
    );
    const row = r.rows[0] as { reviewed_by: string; review_reason: string };
    expect(row.reviewed_by).toBe(adminId);
    expect(row.review_reason).toMatch(/scam/);
  });

  it('refuses a review with no reason', async () => {
    const w = await request('500', 'w-1');

    await expect(withdrawals.reject(w.id, adminId, '  ')).rejects.toThrow(
      /reason/i,
    );
  });
});

describe('idempotency (PRD §5 rule 2)', () => {
  it('returns the same withdrawal for a repeated key', async () => {
    const first = await request('500', 'w-1');

    const again = await withdrawals.request(
      userId,
      ADDRESS,
      '500',
      codeAt(USABLE),
      'w-1',
      USABLE,
    );

    expect(again.id).toBe(first.id);
  });

  /**
   * A retry arrives with the code already consumed by the attempt it is
   * retrying. Replaying before the code is checked is what makes the retry
   * safe rather than a second failure.
   */
  it('replays without needing a fresh code', async () => {
    const first = await request('500', 'w-1');

    const again = await withdrawals.request(
      userId,
      ADDRESS,
      '500',
      '000000',
      'w-1',
      USABLE,
    );

    expect(again.id).toBe(first.id);
  });

  it('locks the funds only once', async () => {
    await request('500', 'w-1');
    await withdrawals.request(
      userId,
      ADDRESS,
      '500',
      codeAt(USABLE),
      'w-1',
      USABLE,
    );

    expect(await balances.balance(accountId, 'LOCKED')).toBe(
      '500.000000000000000000',
    );
  });
});
