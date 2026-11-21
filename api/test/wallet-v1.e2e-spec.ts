import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Pool } from 'pg';
import { AppModule } from './../src/app.module';
import { timeCounter, totpCode } from './../src/auth/v1/totp';
import { isChainConfigured } from './../src/chain/chain.module';

function data<T = Record<string, unknown>>(res: { body: unknown }): T {
  return (res.body as { data: T }).data;
}

/**
 * The wallet over HTTP (PRD §8).
 *
 * Deposit addresses need a custody seed, so the whole suite is skipped
 * without one — CI runs the ledger and engine suites with no chain at all,
 * and that is a legitimate configuration rather than a failure.
 */
const describeChain = isChainConfigured() ? describe : describe.skip;

describeChain('wallet v1 (e2e)', () => {
  let app: INestApplication;
  let pool: Pool;
  let http: App;

  const email = `wallet${Date.now()}@example.test`;
  const CODE = '246810';
  const DESTINATION = '0x570ec515914CC54da8Ebc50c6AC69f0330727455';

  let token: string;
  let userId: string;
  let secret: string;

  function authCode(): string {
    return totpCode(secret, timeCounter(Date.now()));
  }

  /**
   * A code is accepted once and only within one window either side, so a
   * test doing several authenticated operations inside thirty seconds runs
   * out of valid codes. The replay rule itself is proven in
   * `mfa.service.spec.ts`; here the subject is the HTTP surface, so the
   * counter is cleared between calls rather than waiting out the clock.
   */
  async function freshCode(): Promise<string> {
    await pool.query(
      `UPDATE "user" SET mfa_last_counter = NULL WHERE id = $1`,
      [userId],
    );
    return authCode();
  }

  beforeAll(async () => {
    process.env.OTP_STATIC_DEV = CODE;
    process.env.DATABASE_URL =
      process.env.TEST_DATABASE_URL ??
      'postgresql://fundfusion:fundfusion_dev_only@localhost:5433/fundfusion_test';

    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(`TRUNCATE TABLE audit_log, system_setting, user_capability,
      role_capability, session, otp_challenge, ledger_entry, ledger_transaction,
      merchant_assignment, p2p_order, p2p_quote, merchant_profile,
      withdrawal, withdrawal_address, deposit, chain_cursor,
      wallet_address, wallet_account, wallet, blockchain_network, asset,
      user_role, "user", role
      RESTART IDENTITY CASCADE`);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    http = app.getHttpServer() as App;

    await request(http).post('/api/v1/admin/seed').expect(201);

    const registered = await request(http)
      .post('/api/v1/auth/register')
      .send({ email, password: 'Example!Demo1', displayName: 'Wallet Tester' })
      .expect(201);
    userId = data<{ userId: string }>(registered).userId;

    const verified = await request(http)
      .post('/api/v1/auth/register/verify')
      .send({ email, code: CODE })
      .expect(201);
    token = data<{ accessToken: string }>(verified).accessToken;
  }, 60000);

  afterAll(async () => {
    await pool?.end();
    await app?.close();
  });

  /** PRD §9.1: browsing needs a verified email; holding money needs more. */
  it('refuses a deposit address before an authenticator is enrolled', async () => {
    await request(http)
      .get('/api/v1/wallet/address')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('enrols an authenticator', async () => {
    const begun = await request(http)
      .post('/api/v1/auth/mfa/begin')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    secret = data<{ secret: string }>(begun).secret;

    await request(http)
      .post('/api/v1/auth/mfa/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: authCode() })
      .expect(201);
  });

  it('issues a deposit address once enrolled', async () => {
    const res = await request(http)
      .get('/api/v1/wallet/address')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = data<{ address: string; network: string }>(res);
    expect(body.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(body.network).toBe('BSC_TESTNET');
  });

  /** The same user keeps the same address; a new one would strand deposits. */
  it('returns the same address on a second call', async () => {
    const first = await request(http)
      .get('/api/v1/wallet/address')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const second = await request(http)
      .get('/api/v1/wallet/address')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(data<{ address: string }>(second).address).toBe(
      data<{ address: string }>(first).address,
    );
  });

  it('summarises the wallet in one request, with balances and the address', async () => {
    const res = await request(http)
      .get('/api/v1/wallet/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = data<{
      balances: Record<string, string>;
      address: string | null;
      network: string;
    }>(res);
    expect(body.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(body.balances.AVAILABLE).toBe('0.000000000000000000');
    expect(body.balances.LOCKED).toBe('0.000000000000000000');
  });

  it('lists an empty activity feed for a wallet that has never moved', async () => {
    const res = await request(http)
      .get('/api/v1/wallet/activity')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(data<unknown[]>(res)).toEqual([]);
  });

  it('refuses the activity feed before an authenticator is enrolled', async () => {
    const stranger = `stranger${Date.now()}@example.test`;
    await request(http)
      .post('/api/v1/auth/register')
      .send({ email: stranger, password: 'Password123!', displayName: 'S' })
      .expect(201);
    const verified = await request(http)
      .post('/api/v1/auth/register/verify')
      .send({ email: stranger, code: CODE })
      .expect(201);

    await request(http)
      .get('/api/v1/wallet/activity')
      .set(
        'Authorization',
        `Bearer ${data<{ accessToken: string }>(verified).accessToken}`,
      )
      .expect(403);
  });

  it('refuses an allowlist addition with a bad authenticator code', async () => {
    await request(http)
      .post('/api/v1/wallet/allowlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ address: DESTINATION, code: '000000', label: 'cold' })
      .expect(400);
  });

  it('allowlists an address and lists it with its cooldown', async () => {
    await request(http)
      .post('/api/v1/wallet/allowlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ address: DESTINATION, code: await freshCode(), label: 'cold' })
      .expect(201);

    const res = await request(http)
      .get('/api/v1/wallet/allowlist')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const list = data<{ address: string; usableFrom: string }[]>(res);
    expect(list).toHaveLength(1);
    expect(list[0].address).toBe(DESTINATION);
    expect(new Date(list[0].usableFrom).getTime()).toBeGreaterThan(Date.now());
  });

  /** Review Focus #3: without the header a retry is a second withdrawal. */
  it('refuses a withdrawal with no Idempotency-Key', async () => {
    const res = await request(http)
      .post('/api/v1/wallet/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .send({ address: DESTINATION, amount: '10', code: await freshCode() })
      .expect(400);

    expect(JSON.stringify(res.body)).toMatch(/Idempotency-Key/);
  });

  it('refuses a withdrawal inside the address cooldown', async () => {
    await request(http)
      .post('/api/v1/wallet/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'w-cooldown')
      .send({ address: DESTINATION, amount: '10', code: await freshCode() })
      .expect(403);
  });

  it('refuses a withdrawal to an address that was never allowlisted', async () => {
    await pool.query(
      `UPDATE withdrawal_address SET usable_from = now() - interval '1 hour'`,
    );

    await request(http)
      .post('/api/v1/wallet/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'w-stranger')
      .send({
        address: '0x1111111111111111111111111111111111111111',
        amount: '10',
        code: await freshCode(),
      })
      .expect(403);
  });

  it('refuses a withdrawal larger than the balance', async () => {
    const res = await request(http)
      .post('/api/v1/wallet/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'w-broke')
      .send({ address: DESTINATION, amount: '10', code: await freshCode() })
      .expect(400);

    expect(JSON.stringify(res.body)).toMatch(/[Ii]nsufficient/);
  });

  it('never exposes the custody seed through any wallet route', async () => {
    const res = await request(http)
      .get('/api/v1/wallet/address')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const words = (process.env.BSC_HD_SEED ?? '').split(' ').filter(Boolean);
    const dump = JSON.stringify(res.body);
    for (const word of words) {
      expect(dump.split(/\W+/)).not.toContain(word);
    }
  });
});
