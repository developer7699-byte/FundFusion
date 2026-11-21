import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Pool } from 'pg';
import { AppModule } from './../src/app.module';
import { timeCounter, totpCode } from './../src/auth/v1/totp';

function data<T = Record<string, unknown>>(res: { body: unknown }): T {
  return (res.body as { data: T }).data;
}

const CODE = '246810';

interface Party {
  userId: string;
  token: string;
  secret: string;
}

describe('disputes over http (e2e)', () => {
  let app: INestApplication;
  let pool: Pool;
  let http: App;
  let customer: Party;
  let merchant: Party;
  let admin: Party;
  let support: Party;
  let orderId: string;
  let disputeId: string;

  beforeAll(async () => {
    process.env.OTP_STATIC_DEV = CODE;
    process.env.DATABASE_URL =
      process.env.TEST_DATABASE_URL ??
      'postgresql://fundfusion:fundfusion_dev_only@localhost:5433/fundfusion_test';

    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(`TRUNCATE TABLE audit_log, system_setting, user_capability,
      role_capability, session, otp_challenge, ledger_entry, ledger_transaction,
      dispute, support_message, support_ticket,
      merchant_assignment, payment_proof, p2p_order, p2p_quote, merchant_profile,
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

    customer = await signUp('customer');
    merchant = await signUp('merchant');
    admin = await signUp('admin');
    support = await signUp('support');
    await grantRole(admin.userId, 'SUPER_ADMIN');
    await grantRole(support.userId, 'SUPPORT');

    await pool.query(
      `INSERT INTO merchant_profile (user_id, desk_name, status, buy_enabled, sell_enabled)
       VALUES ($1, 'desk-one', 'ACTIVE', true, true)`,
      [merchant.userId],
    );
    await grantRole(merchant.userId, 'MERCHANT');
    await fund(customer, '500');
    await fund(merchant, '500');
  }, 90000);

  afterAll(async () => {
    await pool?.end();
    await app?.close();
  });

  async function signUp(name: string): Promise<Party> {
    const email = `${name}${Date.now()}@example.test`;
    const registered = await request(http)
      .post('/api/v1/auth/register')
      .send({ email, password: 'Example!Demo1', displayName: name })
      .expect(201);
    const userId = data<{ userId: string }>(registered).userId;
    const verified = await request(http)
      .post('/api/v1/auth/register/verify')
      .send({ email, code: CODE })
      .expect(201);
    const token = data<{ accessToken: string }>(verified).accessToken;

    const begun = await request(http)
      .post('/api/v1/auth/mfa/begin')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    const secret = data<{ secret: string }>(begun).secret;
    await request(http)
      .post('/api/v1/auth/mfa/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: totpCode(secret, timeCounter(Date.now())) })
      .expect(201);

    return { userId, token, secret };
  }

  async function grantRole(userId: string, name: string) {
    await pool.query(
      `INSERT INTO user_role (user_id, role_id)
       SELECT $1, id FROM role WHERE name = $2`,
      [userId, name],
    );
  }

  async function fund(party: Party, amount: string) {
    await asUser(party, 'get', '/api/v1/wallet/balances').expect(200);
    const account = await pool.query(
      `SELECT wa.id FROM wallet_account wa
         JOIN wallet w ON w.id = wa.wallet_id WHERE w.user_id = $1`,
      [party.userId],
    );
    const accountId = (account.rows[0] as { id: string }).id;
    const tx = await pool.query(
      `INSERT INTO ledger_transaction (reference, memo, idempotency, fingerprint)
       VALUES (gen_random_uuid()::text, 'opening balance', $1, $1) RETURNING id`,
      [`fund-${party.userId}`],
    );
    await pool.query(
      `INSERT INTO ledger_entry (transaction_id, account_id, account_type, direction, amount, asset_symbol)
       VALUES ($1, $2, 'AVAILABLE', 'CREDIT', $3, 'USDT'),
              ($1, NULL, 'EXTERNAL', 'DEBIT', $3, 'USDT')`,
      [(tx.rows[0] as { id: string }).id, accountId, amount],
    );
  }

  function asUser(party: Party, method: 'post' | 'get', path: string) {
    return request(http)
      [method](path)
      .set('Authorization', `Bearer ${party.token}`);
  }

  it('reaches a disputable order', async () => {
    const quote = await asUser(customer, 'post', '/api/v1/p2p/quotes')
      .send({ side: 'SELL', usdtAmount: '100' })
      .expect(201);
    const order = await asUser(customer, 'post', '/api/v1/p2p/orders')
      .set('Idempotency-Key', 'order-1')
      .send({ quoteId: data<{ id: string }>(quote).id })
      .expect(201);
    orderId = data<{ id: string }>(order).id;

    await asUser(merchant, 'post', `/api/v1/p2p/orders/${orderId}/accept`)
      .set('Idempotency-Key', 'accept-1')
      .expect(201);
  });

  it('lets a party open a dispute', async () => {
    const res = await asUser(
      customer,
      'post',
      `/api/v1/p2p/orders/${orderId}/dispute`,
    )
      .send({ reason: 'the rupees never arrived' })
      .expect(201);

    disputeId = data<{ id: string }>(res).id;
    expect(data<{ status: string }>(res).status).toBe('OPEN');
  });

  it('refuses a dispute from someone not party to the order', async () => {
    await asUser(support, 'post', `/api/v1/p2p/orders/${orderId}/dispute`)
      .send({ reason: 'curious' })
      .expect(403);
  });

  /** PRD §9.2: SUPPORT reads everything. */
  it('lets SUPPORT read the dispute queue', async () => {
    const res = await asUser(support, 'get', '/api/v1/admin/disputes').expect(
      200,
    );

    expect(data<{ id: string }[]>(res).map((d) => d.id)).toContain(disputeId);
  });

  it('lets SUPPORT read users, orders and the ledger', async () => {
    for (const path of ['users', 'orders', 'ledger', 'overview']) {
      await asUser(support, 'get', `/api/v1/admin/${path}`).expect(200);
    }
  });

  /**
   * Review Focus #4, and the reason the SUPPORT role exists at all: a
   * support account able to release escrow is the most common insider-fraud
   * path in platforms like this.
   */
  it('refuses SUPPORT the resolve route', async () => {
    await asUser(support, 'post', `/api/v1/admin/disputes/${disputeId}/resolve`)
      .set('Idempotency-Key', 'resolve-support')
      .send({ outcome: 'RELEASE', reason: 'trying it on' })
      .expect(403);
  });

  it('refuses an ordinary user every admin read', async () => {
    for (const path of ['disputes', 'users', 'orders', 'ledger', 'overview']) {
      await asUser(customer, 'get', `/api/v1/admin/${path}`).expect(403);
    }
  });

  it('refuses a resolve with no Idempotency-Key', async () => {
    const res = await asUser(
      admin,
      'post',
      `/api/v1/admin/disputes/${disputeId}/resolve`,
    )
      .send({ outcome: 'RELEASE', reason: 'bank statement checked' })
      .expect(400);

    expect(JSON.stringify(res.body)).toMatch(/Idempotency-Key/);
  });

  it('refuses an outcome outside the closed list', async () => {
    await asUser(admin, 'post', `/api/v1/admin/disputes/${disputeId}/resolve`)
      .set('Idempotency-Key', 'resolve-bad')
      .send({ outcome: 'FORGIVE_EVERYTHING', reason: 'generous' })
      .expect(400);
  });

  it('resolves the dispute and moves the money', async () => {
    await asUser(admin, 'post', `/api/v1/admin/disputes/${disputeId}/resolve`)
      .set('Idempotency-Key', 'resolve-1')
      .send({ outcome: 'REFUND', reason: 'no transfer found on the statement' })
      .expect(201);

    const balances = await asUser(
      customer,
      'get',
      '/api/v1/wallet/balances',
    ).expect(200);
    expect(data<Record<string, string>>(balances).AVAILABLE).toBe(
      '500.000000000000000000',
    );
    expect(data<Record<string, string>>(balances).LOCKED).toBe(
      '0.000000000000000000',
    );
  });

  it('shows the resolution to SUPPORT afterwards', async () => {
    const res = await asUser(
      support,
      'get',
      `/api/v1/admin/disputes/${disputeId}`,
    ).expect(200);

    const d = data<{ outcome: string; resolutionReason: string }>(res);
    expect(d.outcome).toBe('REFUND');
    expect(d.resolutionReason).toMatch(/no transfer/);
  });
});
