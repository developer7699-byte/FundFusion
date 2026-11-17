import { SessionService } from './session.service';
import { makeTestDb, seedUser, type TestDb } from '../../ledger/test-db';

let t: TestDb;
let sessions: SessionService;
let userId: string;

const device = { userAgent: 'jest', ipAddress: '127.0.0.1' };

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_value';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_value';
  t = makeTestDb();
  sessions = new SessionService(t.db);
}, 30000);

beforeEach(async () => {
  await t.reset();
  userId = await seedUser(t.pool, 'session@example.test');
});

afterAll(async () => {
  await t.close();
});

describe('SessionService (PRD §19, §13.5)', () => {
  it('issues an access and a refresh token', async () => {
    const pair = await sessions.issue(userId, device);
    expect(typeof pair.accessToken).toBe('string');
    expect(typeof pair.refreshToken).toBe('string');
  });

  it('rotating returns a new pair', async () => {
    const first = await sessions.issue(userId, device);
    const second = await sessions.rotate(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
  });

  // A stolen refresh token must not outlive its theft.
  it('replaying a rotated refresh token is refused', async () => {
    const first = await sessions.issue(userId, device);
    await sessions.rotate(first.refreshToken);
    await expect(sessions.rotate(first.refreshToken)).rejects.toThrow(
      /reuse|revoked|invalid/i,
    );
  });

  it('detected reuse revokes the whole family, not just that token', async () => {
    const first = await sessions.issue(userId, device);
    const second = await sessions.rotate(first.refreshToken);
    await sessions.rotate(first.refreshToken).catch(() => undefined);
    await expect(sessions.rotate(second.refreshToken)).rejects.toThrow();
  });

  it('a second device is an independent family', async () => {
    const a = await sessions.issue(userId, device);
    const b = await sessions.issue(userId, {
      userAgent: 'other',
      ipAddress: '10.0.0.1',
    });
    await sessions.rotate(a.refreshToken);
    await sessions.rotate(a.refreshToken).catch(() => undefined);
    // device B is untouched by device A's compromise
    await expect(sessions.rotate(b.refreshToken)).resolves.toBeDefined();
  });

  it('stores a device list', async () => {
    await sessions.issue(userId, device);
    const list = await sessions.devices(userId);
    expect(list[0].userAgent).toBe('jest');
  });

  it('refresh tokens are stored hashed, never in clear text', async () => {
    const first = await sessions.issue(userId, device);
    const r = await t.pool.query(`SELECT refresh_token_hash FROM session`);
    const stored = (r.rows[0] as { refresh_token_hash: string })
      .refresh_token_hash;
    expect(stored).not.toBe(first.refreshToken);
    expect(stored).not.toContain(first.refreshToken);
  });

  it('revokeAll ends every live session', async () => {
    const a = await sessions.issue(userId, device);
    await sessions.revokeAll(userId);
    await expect(sessions.rotate(a.refreshToken)).rejects.toThrow();
  });

  it('an expired refresh token is refused', async () => {
    const a = await sessions.issue(userId, device);
    await t.pool.query(
      `UPDATE session SET expires_at = now() - interval '1 day'`,
    );
    await expect(sessions.rotate(a.refreshToken)).rejects.toThrow(
      /expired|invalid/i,
    );
  });
});

describe('access token', () => {
  it('is a signed JWT carrying the subject, not opaque bytes', async () => {
    const pair = await sessions.issue(userId, device);
    const [, payload] = pair.accessToken.split('.');
    expect(payload).toBeDefined();
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      sub: string;
      exp: number;
    };
    expect(claims.sub).toBe(userId);
  });

  it('expires in 15 minutes (PRD §19)', async () => {
    const pair = await sessions.issue(userId, device);
    const [, payload] = pair.accessToken.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      exp: number;
      iat: number;
    };
    expect(claims.exp - claims.iat).toBe(15 * 60);
  });
});
