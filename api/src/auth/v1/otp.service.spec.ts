import { OtpService } from './otp.service';
import { makeTestDb, seedUser, type TestDb } from '../../ledger/test-db';

let t: TestDb;
let otp: OtpService;
let userA: string;
let userB: string;

const PHONE = '+919876543210';
const CODE = '246810';

beforeAll(() => {
  process.env.OTP_STATIC_DEV = CODE;
  t = makeTestDb();
  otp = new OtpService(t.db);
}, 30000);

beforeEach(async () => {
  await t.reset();
  userA = await seedUser(t.pool, 'a@example.test');
  userB = await seedUser(t.pool, 'b@example.test');
});

afterAll(async () => {
  await t.close();
});

describe('OtpService (OTP stays static — no SMS provider is contacted)', () => {
  it('issues a challenge without returning the code', async () => {
    const res = await otp.request(userA, PHONE);
    expect(res).toEqual({ sent: true });
    expect(JSON.stringify(res)).not.toContain(CODE);
  });

  it('verifies the static development code', async () => {
    await otp.request(userA, PHONE);
    await expect(otp.verify(userA, PHONE, CODE)).resolves.toEqual({
      verified: true,
    });
  });

  it('sets phone_verified_at on success', async () => {
    await otp.request(userA, PHONE);
    await otp.verify(userA, PHONE, CODE);
    const r = await t.pool.query(
      `SELECT phone_verified_at, phone FROM "user" WHERE id = $1`,
      [userA],
    );
    expect(
      (r.rows[0] as { phone_verified_at: Date | null }).phone_verified_at,
    ).not.toBeNull();
    expect((r.rows[0] as { phone: string }).phone).toBe(PHONE);
  });

  it('rejects a wrong code', async () => {
    await otp.request(userA, PHONE);
    await expect(otp.verify(userA, PHONE, '000000')).rejects.toThrow(
      /invalid/i,
    );
  });

  it('rejects verification with no challenge issued', async () => {
    await expect(otp.verify(userA, PHONE, CODE)).rejects.toThrow(
      /no .*challenge|invalid/i,
    );
  });

  it('rejects an expired challenge', async () => {
    await otp.request(userA, PHONE);
    await t.pool.query(
      `UPDATE otp_challenge SET expires_at = now() - interval '1 minute' WHERE user_id = $1`,
      [userA],
    );
    await expect(otp.verify(userA, PHONE, CODE)).rejects.toThrow(/expired/i);
  });

  // PRD §13.5: OTP rate limiting. Without it the code is brute-forceable.
  it('rate limits repeated wrong attempts', async () => {
    await otp.request(userA, PHONE);
    for (let i = 0; i < 5; i++) {
      await otp.verify(userA, PHONE, '000000').catch(() => undefined);
    }
    await expect(otp.verify(userA, PHONE, CODE)).rejects.toThrow(/too many/i);
  });

  // One verified phone equals exactly one account — this is what stops one
  // person farming accounts to self-trade (PRD §9.1).
  it('one verified phone cannot belong to two accounts', async () => {
    await otp.request(userA, PHONE);
    await otp.verify(userA, PHONE, CODE);
    await otp.request(userB, PHONE);
    await expect(otp.verify(userB, PHONE, CODE)).rejects.toThrow(/already/i);
  });

  it('concurrent verifications of the same phone leave exactly one verified', async () => {
    await otp.request(userA, PHONE);
    await otp.request(userB, PHONE);
    const results = await Promise.allSettled([
      otp.verify(userA, PHONE, CODE),
      otp.verify(userB, PHONE, CODE),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const r = await t.pool.query(
      `SELECT count(*)::int AS n FROM "user" WHERE phone = $1 AND phone_verified_at IS NOT NULL`,
      [PHONE],
    );
    expect((r.rows[0] as { n: number }).n).toBe(1);
  });

  it('a different phone on another account is fine', async () => {
    await otp.request(userA, PHONE);
    await otp.verify(userA, PHONE, CODE);
    await otp.request(userB, '+919000000001');
    await expect(otp.verify(userB, '+919000000001', CODE)).resolves.toEqual({
      verified: true,
    });
  });
});
