import { makeTestDb, seedUser, type TestDb } from '../../ledger/test-db';
import { MfaService } from './mfa.service';
import { timeCounter, totpCode } from './totp';

let t: TestDb;
let mfa: MfaService;
let userId: string;

const STEP = 30_000;

beforeAll(() => {
  t = makeTestDb();
}, 30000);

beforeEach(async () => {
  await t.reset();
  mfa = new MfaService(t.db);
  userId = await seedUser(t.pool, 'person@example.test');
});

afterAll(async () => {
  await t.close();
});

async function enrol(at = Date.now()): Promise<string> {
  const { secret } = await mfa.beginEnrolment(userId);
  await mfa.confirmEnrolment(userId, totpCode(secret, timeCounter(at)), at);
  return secret;
}

describe('enrolling an authenticator (PRD §9.1)', () => {
  it('hands back something an app can scan', async () => {
    const { uri } = await mfa.beginEnrolment(userId);

    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain(encodeURIComponent('person@example.test'));
  });

  it('is not enrolled until a code proves the app has the secret', async () => {
    await mfa.beginEnrolment(userId);

    expect(await mfa.isEnrolled(userId)).toBe(false);
  });

  it('refuses to complete enrolment on a wrong code', async () => {
    await mfa.beginEnrolment(userId);

    await expect(mfa.confirmEnrolment(userId, '000000')).rejects.toThrow(
      /code/i,
    );
    expect(await mfa.isEnrolled(userId)).toBe(false);
  });

  it('completes enrolment on the right code', async () => {
    await enrol();

    expect(await mfa.isEnrolled(userId)).toBe(true);
  });

  it('refuses to re-enrol over a working authenticator', async () => {
    await enrol();

    // Otherwise anyone with a live session quietly swaps the second factor
    // for one they control.
    await expect(mfa.beginEnrolment(userId)).rejects.toThrow(/already/i);
  });
});

describe('verifying a code', () => {
  it('accepts the current code', async () => {
    const now = Date.now();
    const secret = await enrol(now);

    await expect(
      mfa.verify(userId, totpCode(secret, timeCounter(now + STEP)), now + STEP),
    ).resolves.toBeUndefined();
  });

  /** Phone clocks drift; one window either side is the usual allowance. */
  it('accepts a code from the previous window', async () => {
    const now = Date.now();
    const secret = await enrol(now);
    const later = now + STEP * 2;

    await expect(
      mfa.verify(userId, totpCode(secret, timeCounter(later - STEP)), later),
    ).resolves.toBeUndefined();
  });

  it('rejects a code from long ago', async () => {
    const now = Date.now();
    const secret = await enrol(now);

    await expect(
      mfa.verify(userId, totpCode(secret, timeCounter(now)), now + STEP * 10),
    ).rejects.toThrow(/code/i);
  });

  it("rejects somebody else's secret", async () => {
    const now = Date.now();
    await enrol(now);

    await expect(
      mfa.verify(userId, totpCode('AAAAAAAAAAAAAAAA', timeCounter(now)), now),
    ).rejects.toThrow(/code/i);
  });

  /**
   * PRD §8.4 wants a *fresh* code on the withdrawal itself. A code is valid
   * for its whole 30-second window, so without this the same six digits
   * authorise several withdrawals in a row.
   */
  it('refuses the same code twice', async () => {
    const now = Date.now();
    const secret = await enrol(now);
    const code = totpCode(secret, timeCounter(now + STEP));

    await mfa.verify(userId, code, now + STEP);

    await expect(mfa.verify(userId, code, now + STEP)).rejects.toThrow(
      /already.*used|reuse/i,
    );
  });

  it('accepts the next window after one was used', async () => {
    const now = Date.now();
    const secret = await enrol(now);
    await mfa.verify(
      userId,
      totpCode(secret, timeCounter(now + STEP)),
      now + STEP,
    );

    const next = now + STEP * 2;
    await expect(
      mfa.verify(userId, totpCode(secret, timeCounter(next)), next),
    ).resolves.toBeUndefined();
  });

  it('rejects anyone who never enrolled', async () => {
    await expect(mfa.verify(userId, '123456')).rejects.toThrow(/enrol/i);
  });
});
