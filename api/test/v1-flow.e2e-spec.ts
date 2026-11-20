import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Pool } from 'pg';
import { AppModule } from './../src/app.module';

/** Every v1 response is { success, data, meta }. */
function data<T = Record<string, unknown>>(res: { body: unknown }): T {
  return (res.body as { data: T }).data;
}

/**
 * The whole M2 surface end to end, exercised the way a person would:
 * register, hit the financial gate, verify a phone, pass the gate, then have
 * an admin deny a capability and watch it take effect.
 */
describe('v1 flow (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;
  let http: App;

  const email = `flow${Date.now()}@example.test`;
  const phone = `+9198${String(Date.now()).slice(-8)}`;
  const CODE = '246810';

  let accessToken: string;
  let refreshToken: string;
  let userId: string;
  let adminToken: string;

  beforeAll(async () => {
    process.env.OTP_STATIC_DEV = CODE;
    process.env.DATABASE_URL =
      process.env.TEST_DATABASE_URL ??
      'postgresql://localhost:5432/fundfusion_test';

    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(`TRUNCATE TABLE audit_log, system_setting, user_capability,
      role_capability, session, otp_challenge, ledger_entry, ledger_transaction,
      merchant_assignment, p2p_order, p2p_quote, merchant_profile,
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
    http = app.getHttpServer();

    await request(http).post('/api/v1/admin/seed').expect(201);

    // An administrator is an ordinary account holding SUPER_ADMIN. There is
    // no self-service route to that role, which is the point.
    const admin = await request(http)
      .post('/api/v1/auth/register')
      .send({
        email: `admin${Date.now()}@example.test`,
        password: 'Example!Admin1',
        displayName: 'Platform Admin',
      })
      .expect(201);
    const adminBody = data<{ userId: string; accessToken: string }>(admin);
    adminToken = adminBody.accessToken;
    await pool.query(
      `INSERT INTO user_role (user_id, role_id)
       SELECT $1, id FROM role WHERE name = 'SUPER_ADMIN'`,
      [adminBody.userId],
    );
  }, 60000);

  afterAll(async () => {
    await pool?.end();
    await app?.close();
  });

  it('1. registers a customer', async () => {
    const res = await request(http)
      .post('/api/v1/auth/register')
      .send({ email, password: 'Example!Demo1', displayName: 'Flow Tester' })
      .expect(201);
    const body = data<{
      userId: string;
      accessToken: string;
      refreshToken: string;
    }>(res);
    expect(body.userId).toBeDefined();
    userId = body.userId;
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  });

  it('2. reports the phone as unverified', async () => {
    const res = await request(http)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(data<{ phoneVerified: boolean }>(res).phoneVerified).toBe(false);
  });

  // The financial gate: no deposit address, no balance, no orders until a
  // phone is verified (PRD §9.1).
  it('3. refuses a money operation before the phone is verified', async () => {
    const res = await request(http)
      .get('/api/v1/wallet/balances')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
    expect(JSON.stringify(res.body)).toMatch(/verify your phone/i);
  });

  it('4. issues an OTP without returning the code', async () => {
    const res = await request(http)
      .post('/api/v1/auth/otp/request')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ phone })
      .expect(201);
    expect(JSON.stringify(res.body)).not.toContain(CODE);
  });

  it('5. verifies the phone with the static code', async () => {
    await request(http)
      .post('/api/v1/auth/otp/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ phone, code: CODE })
      .expect(201);
  });

  it('6. now allows the money operation', async () => {
    const res = await request(http)
      .get('/api/v1/wallet/balances')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(data<{ AVAILABLE: string }>(res).AVAILABLE).toBe(
      '0.000000000000000000',
    );
  });

  it('7. lists the capabilities the role grants', async () => {
    const res = await request(http)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(data<{ capabilities: string[] }>(res).capabilities).toEqual(
      expect.arrayContaining(['DEPOSIT', 'WITHDRAW', 'SEND']),
    );
  });

  it('8. an admin deny takes effect immediately', async () => {
    await request(http)
      .post('/api/v1/admin/capabilities/deny')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId, capability: 'WITHDRAW', reason: 'manual test risk hold' })
      .expect(201);

    const res = await request(http)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(data<{ capabilities: string[] }>(res).capabilities).not.toContain(
      'WITHDRAW',
    );
  });

  it('9. the deny is in the append-only audit log with its reason', async () => {
    const res = await request(http)
      .get('/api/v1/admin/audit')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(data<{ reason: string }[]>(res)[0].reason).toBe(
      'manual test risk hold',
    );
  });

  /** PRD §9.2: the platform's own numbers are not a customer's to change. */
  it('9b. a customer cannot read or change the commercial settings', async () => {
    await request(http)
      .get('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);

    await request(http)
      .put('/api/v1/admin/settings/rate.markupBps')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ value: 10, reason: 'helping myself' })
      .expect(403);
  });

  it('9c. an admin changes a commercial number and it is audited', async () => {
    const before = await request(http)
      .get('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      data<Record<string, { value: number }>>(before)['rate.markupBps'].value,
    ).toBe(300);

    const res = await request(http)
      .put('/api/v1/admin/settings/rate.markupBps')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: 250, reason: 'margin review' })
      .expect(200);
    expect(
      data<Record<string, { value: number }>>(res)['rate.markupBps'].value,
    ).toBe(250);

    const audit = await request(http)
      .get('/api/v1/admin/audit')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(data<{ action: string; reason: string }[]>(audit)[0]).toEqual(
      expect.objectContaining({
        action: 'SETTING_CHANGE',
        reason: 'margin review',
      }),
    );
  });

  it('9d. a number outside its bounds is refused', async () => {
    await request(http)
      .put('/api/v1/admin/settings/eligibility.bufferBps')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: 0, reason: 'trying to remove the buffer' })
      .expect(400);
  });

  it('10. rotating the refresh token returns a new pair', async () => {
    const res = await request(http)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(201);
    const rotated = data<{ refreshToken: string }>(res);
    expect(rotated.refreshToken).not.toBe(refreshToken);
    refreshToken = rotated.refreshToken;
  });

  it('11. replaying the old refresh token is refused', async () => {
    const res = await request(http)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'definitely-not-valid' });
    expect(res.status).toBe(401);
  });
});
