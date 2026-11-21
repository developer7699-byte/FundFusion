import { makeTestDb, seedUser, type TestDb } from '../../ledger/test-db';
import { EmailOtpService } from './email-otp.service';
import type { EmailSender } from './email-sender';

let t: TestDb;
let otp: EmailOtpService;
let sent: { to: string; body: string }[];
let userId: string;

const EMAIL = 'person@example.test';
const CODE = '246810';

beforeAll(() => {
  process.env.OTP_STATIC_DEV = CODE;
  t = makeTestDb();
}, 30000);

beforeEach(async () => {
  await t.reset();
  sent = [];
  const mail: EmailSender = {
    send: (to, _subject, body) => {
      sent.push({ to, body });
      return Promise.resolve();
    },
  };
  otp = new EmailOtpService(t.db, mail);
  userId = await seedUser(t.pool, EMAIL);
});

afterAll(async () => {
  await t.close();
});

describe('sending a code (PRD §9.1)', () => {
  it('emails it to the address that asked', async () => {
    await otp.request(userId, EMAIL, 'LOGIN');

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(EMAIL);
    expect(sent[0].body).toContain(CODE);
  });

  /** A development shortcut in a response body is the same in production. */
  it('never returns the code', async () => {
    const result = await otp.request(userId, EMAIL, 'LOGIN');

    expect(JSON.stringify(result)).not.toContain(CODE);
  });

  it('stores only a hash of it', async () => {
    await otp.request(userId, EMAIL, 'LOGIN');

    const r = await t.pool.query<{ code_hash: string }>(
      `SELECT code_hash FROM otp_challenge`,
    );
    expect(r.rows[0].code_hash).not.toContain(CODE);
  });
});

describe('consuming a code', () => {
  it('accepts the right code', async () => {
    await otp.request(userId, EMAIL, 'LOGIN');

    await expect(
      otp.consume(userId, EMAIL, 'LOGIN', CODE),
    ).resolves.toBeUndefined();
  });

  it('refuses the same code twice', async () => {
    await otp.request(userId, EMAIL, 'LOGIN');
    await otp.consume(userId, EMAIL, 'LOGIN', CODE);

    await expect(otp.consume(userId, EMAIL, 'LOGIN', CODE)).rejects.toThrow(
      /invalid|new one/i,
    );
  });

  it('refuses a wrong code', async () => {
    await otp.request(userId, EMAIL, 'LOGIN');

    await expect(otp.consume(userId, EMAIL, 'LOGIN', '000000')).rejects.toThrow(
      /invalid/i,
    );
  });

  /** A login code must not complete a registration, or the reverse. */
  it('refuses a code issued for a different purpose', async () => {
    await otp.request(userId, EMAIL, 'REGISTER');

    await expect(otp.consume(userId, EMAIL, 'LOGIN', CODE)).rejects.toThrow(
      /invalid|new one/i,
    );
  });

  it('refuses an expired code', async () => {
    await otp.request(userId, EMAIL, 'LOGIN');
    await t.pool.query(
      `UPDATE otp_challenge SET expires_at = now() - interval '1 hour'`,
    );

    await expect(otp.consume(userId, EMAIL, 'LOGIN', CODE)).rejects.toThrow(
      /expired/i,
    );
  });

  it('stops guessing after five attempts', async () => {
    await otp.request(userId, EMAIL, 'LOGIN');
    for (let n = 0; n < 5; n++) {
      await expect(
        otp.consume(userId, EMAIL, 'LOGIN', '000000'),
      ).rejects.toThrow();
    }

    await expect(otp.consume(userId, EMAIL, 'LOGIN', CODE)).rejects.toThrow(
      /too many/i,
    );
  });
});
