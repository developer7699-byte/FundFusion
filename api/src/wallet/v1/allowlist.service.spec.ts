import { AuditService } from '../../audit/audit.service';
import { MfaService } from '../../auth/v1/mfa.service';
import { generateSecret, timeCounter, totpCode } from '../../auth/v1/totp';
import { makeTestDb, seedUser, type TestDb } from '../../ledger/test-db';
import { fixedSettings } from '../../settings/platform-settings';
import { AllowlistService } from './allowlist.service';

let t: TestDb;
let allowlist: AllowlistService;
let userId: string;
let secret: string;

const NETWORK = 'BSC_TESTNET';
const ADDRESS = '0x4b7877dD11Ef2d15297Cb0a013F8513d8D9EBf3C';
const OTHER = '0x356545e8Cc9aB65B7f6BA2B761653CeA86a8317A';
const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 10, 21, 9, 0, 0);

beforeAll(() => {
  t = makeTestDb();
}, 30000);

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

  allowlist = new AllowlistService(
    t.db,
    new MfaService(t.db),
    new AuditService(t.db),
    fixedSettings(),
  );

  userId = await seedUser(t.pool, 'holder@example.test');
  secret = generateSecret();
  await t.pool.query(
    `UPDATE "user" SET email_verified_at = now(), mfa_secret = $2, mfa_enrolled_at = now() WHERE id = $1`,
    [userId, secret],
  );
});

afterAll(async () => {
  await t.close();
});

/** The authenticator code for a given instant. */
function codeAt(now: number): string {
  return totpCode(secret, timeCounter(now));
}

describe('adding an address (PRD §8.4)', () => {
  it('saves the address with a cooldown', async () => {
    const saved = await allowlist.add(userId, ADDRESS, codeAt(T0), {
      label: 'ledger',
      now: T0,
    });

    expect(saved.address).toBe(ADDRESS);
    expect(saved.usableFrom.getTime()).toBe(T0 + 24 * HOUR);
  });

  it('refuses an address that is not an address', async () => {
    await expect(
      allowlist.add(userId, 'not-an-address', codeAt(T0), { now: T0 }),
    ).rejects.toThrow(/address/i);
  });

  /**
   * The session alone is never sufficient (PRD §8.4). Adding an address is
   * the first step an attacker holding a stolen session takes.
   */
  it('refuses without a valid authenticator code', async () => {
    await expect(
      allowlist.add(userId, ADDRESS, '000000', { now: T0 }),
    ).rejects.toThrow(/code/i);
  });

  /**
   * Without this, waiting out the cooldown is optional: add the address,
   * wait nothing, add it again, and the clock restarts from a later instant
   * than the one already recorded.
   */
  it('does not restart the cooldown when the same address is re-saved', async () => {
    const first = await allowlist.add(userId, ADDRESS, codeAt(T0), { now: T0 });

    const again = await allowlist.add(userId, ADDRESS, codeAt(T0 + 12 * HOUR), {
      now: T0 + 12 * HOUR,
    });

    expect(again.id).toBe(first.id);
    expect(again.usableFrom.getTime()).toBe(first.usableFrom.getTime());
  });

  it('records the addition in the audit log', async () => {
    await allowlist.add(userId, ADDRESS, codeAt(T0), { now: T0 });

    const r = await t.pool.query(
      `SELECT action FROM audit_log WHERE action = 'WITHDRAWAL_ADDRESS_ADD'`,
    );
    expect(r.rowCount).toBe(1);
  });
});

describe('using an address', () => {
  it('refuses an address that was never added', async () => {
    await expect(allowlist.assertUsable(userId, OTHER, T0)).rejects.toThrow(
      /allowlist/i,
    );
  });

  it('refuses an address inside its cooldown', async () => {
    await allowlist.add(userId, ADDRESS, codeAt(T0), { now: T0 });

    await expect(
      allowlist.assertUsable(userId, ADDRESS, T0 + 23 * HOUR),
    ).rejects.toThrow(/cooldown|usable/i);
  });

  it('allows the address once the cooldown has passed', async () => {
    await allowlist.add(userId, ADDRESS, codeAt(T0), { now: T0 });

    await expect(
      allowlist.assertUsable(userId, ADDRESS, T0 + 25 * HOUR),
    ).resolves.toBeDefined();
  });

  /** One user's allowlist is not another's (PRD §13.5, object-level checks). */
  it("refuses another user's allowlisted address", async () => {
    await allowlist.add(userId, ADDRESS, codeAt(T0), { now: T0 });
    const stranger = await seedUser(t.pool, 'stranger@example.test');

    await expect(
      allowlist.assertUsable(stranger, ADDRESS, T0 + 25 * HOUR),
    ).rejects.toThrow(/allowlist/i);
  });

  it('matches the address regardless of case', async () => {
    await allowlist.add(userId, ADDRESS, codeAt(T0), { now: T0 });

    await expect(
      allowlist.assertUsable(userId, ADDRESS.toLowerCase(), T0 + 25 * HOUR),
    ).resolves.toBeDefined();
  });

  it('refuses a revoked address', async () => {
    const saved = await allowlist.add(userId, ADDRESS, codeAt(T0), { now: T0 });
    await t.pool.query(
      `UPDATE withdrawal_address SET revoked_at = now() WHERE id = $1`,
      [saved.id],
    );

    await expect(
      allowlist.assertUsable(userId, ADDRESS, T0 + 25 * HOUR),
    ).rejects.toThrow(/allowlist|revoked/i);
  });
});
