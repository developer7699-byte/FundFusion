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

/** A registered, verified, authenticator-enrolled account with a session. */
interface Party {
  userId: string;
  token: string;
  secret: string;
  email: string;
}

describe('p2p over http (e2e)', () => {
  let app: INestApplication;
  let pool: Pool;
  let http: App;
  let customer: Party;
  let merchant: Party;
  let other: Party;
  let admin: Party;

  beforeAll(async () => {
    process.env.OTP_STATIC_DEV = CODE;
    process.env.DATABASE_URL =
      process.env.TEST_DATABASE_URL ??
      'postgresql://fundfusion:fundfusion_dev_only@localhost:5433/fundfusion_test';

    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(`TRUNCATE TABLE audit_log, system_setting, user_capability,
      role_capability, session, otp_challenge, ledger_entry, ledger_transaction,
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

    admin = await signUp('admin');
    await pool.query(
      `INSERT INTO user_role (user_id, role_id)
       SELECT $1, id FROM role WHERE name = 'SUPER_ADMIN'`,
      [admin.userId],
    );
    customer = await signUp('customer');
    merchant = await signUp('merchant');
    other = await signUp('other');

    await becomeMerchant(merchant.userId, 'desk-one');
    await becomeMerchant(other.userId, 'desk-two');
    await fund(customer, '1000');
    await fund(merchant, '1000');
    await fund(other, '1000');
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

    return { userId, token, secret, email };
  }

  async function becomeMerchant(userId: string, desk: string) {
    await pool.query(
      `INSERT INTO merchant_profile (user_id, desk_name, status, buy_enabled, sell_enabled)
       VALUES ($1, $2, 'ACTIVE', true, true)`,
      [userId, desk],
    );
    await pool.query(
      `INSERT INTO user_role (user_id, role_id)
       SELECT $1, id FROM role WHERE name = 'MERCHANT'`,
      [userId],
    );
  }

  /** An opening balance, posted as a journal like every other movement. */
  async function fund(party: Party, amount: string) {
    // The wallet account is created on first use, and reading a balance is
    // a first use. Nothing else here would create it.
    await asUser(party, 'get', '/api/v1/wallet/balances').expect(200);

    const userId = party.userId;
    const account = await pool.query(
      `SELECT wa.id FROM wallet_account wa
         JOIN wallet w ON w.id = wa.wallet_id
        WHERE w.user_id = $1`,
      [userId],
    );
    const accountId = (account.rows[0] as { id: string } | undefined)?.id;
    if (!accountId) throw new Error(`no wallet account for ${userId}`);

    const tx = await pool.query(
      `INSERT INTO ledger_transaction (reference, memo, idempotency, fingerprint)
       VALUES (gen_random_uuid()::text, 'opening balance', $1, $1) RETURNING id`,
      [`fund-${userId}`],
    );
    const txId = (tx.rows[0] as { id: string }).id;
    await pool.query(
      `INSERT INTO ledger_entry (transaction_id, account_id, account_type, direction, amount, asset_symbol)
       VALUES ($1, $2, 'AVAILABLE', 'CREDIT', $3, 'USDT'),
              ($1, NULL, 'EXTERNAL', 'DEBIT', $3, 'USDT')`,
      [txId, accountId, amount],
    );
  }

  function asUser(party: Party, method: 'post' | 'get', path: string) {
    return request(http)
      [method](path)
      .set('Authorization', `Bearer ${party.token}`);
  }

  let quoteId: string;
  let orderId: string;

  it('prices a quote and returns every amount as a string', async () => {
    const res = await asUser(customer, 'post', '/api/v1/p2p/quotes')
      .send({ side: 'SELL', usdtAmount: '100' })
      .expect(201);

    const quote = data<{
      id: string;
      usdtAmount: string;
      inrAmount: string;
      customerRate: string;
    }>(res);
    quoteId = quote.id;
    expect(typeof quote.inrAmount).toBe('string');
    expect(typeof quote.customerRate).toBe('string');
    expect(quote.usdtAmount).toBe('100.000000000000000000');
  });

  /** Review Focus #3 — without the header a retry is a second order. */
  it('refuses an order confirmation with no Idempotency-Key', async () => {
    const res = await asUser(customer, 'post', '/api/v1/p2p/orders')
      .send({ quoteId })
      .expect(400);

    expect(JSON.stringify(res.body)).toMatch(/Idempotency-Key/);
  });

  it('confirms the order and broadcasts it', async () => {
    const res = await asUser(customer, 'post', '/api/v1/p2p/orders')
      .set('Idempotency-Key', 'order-1')
      .send({ quoteId })
      .expect(201);

    const order = data<{ id: string; status: string }>(res);
    orderId = order.id;
    expect(order.status).toBe('AWAITING_MERCHANT');
  });

  it('returns the same order when the key is replayed', async () => {
    const res = await asUser(customer, 'post', '/api/v1/p2p/orders')
      .set('Idempotency-Key', 'order-1')
      .send({ quoteId })
      .expect(201);

    expect(data<{ id: string }>(res).id).toBe(orderId);
  });

  /** The snapshot is law: nothing may edit a price after it was quoted. */
  it('refuses to let anything change a quote after it is written', async () => {
    await expect(
      pool.query(`UPDATE p2p_quote SET customer_rate = 1 WHERE id = $1`, [
        quoteId,
      ]),
    ).rejects.toThrow(/immutable/i);
  });

  /**
   * Review Focus #5 — a lapsed price must reach the screen as a refusal it
   * can show, not a 500. The quote row is immutable, so the only way to age
   * one is to quote it with a short life and wait: the TTL is lowered to its
   * floor through the admin API, which is the same path an operator uses.
   */
  it('refuses a quote confirmed after its TTL', async () => {
    await request(http)
      .put('/api/v1/admin/settings/quote.ttlSeconds')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ value: 15, reason: 'e2e: age a quote' })
      .expect(200);

    const quote = await asUser(customer, 'post', '/api/v1/p2p/quotes')
      .send({ side: 'SELL', usdtAmount: '10' })
      .expect(201);
    const staleId = data<{ id: string }>(quote).id;

    await new Promise((resolve) => setTimeout(resolve, 16_000));

    const res = await asUser(customer, 'post', '/api/v1/p2p/orders')
      .set('Idempotency-Key', 'order-stale')
      .send({ quoteId: staleId })
      .expect(400);

    expect(JSON.stringify(res.body)).toMatch(/expired/i);

    await request(http)
      .put('/api/v1/admin/settings/quote.ttlSeconds')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ value: 90, reason: 'e2e: restore' })
      .expect(200);
  }, 30000);

  it('offers the order in the merchant feed with its obligation', async () => {
    const res = await asUser(
      merchant,
      'get',
      '/api/v1/p2p/merchant/feed',
    ).expect(200);

    const offered = data<{ orderId: string; obligationUsdt: string }[]>(res);
    expect(offered.map((o) => o.orderId)).toContain(orderId);
    expect(typeof offered[0].obligationUsdt).toBe('string');
  });

  /** Review Focus #1 — the customer is a merchant too, and still refused. */
  it('never offers a merchant their own order', async () => {
    await becomeMerchant(customer.userId, 'desk-self');

    const res = await asUser(
      customer,
      'get',
      '/api/v1/p2p/merchant/feed',
    ).expect(200);

    expect(
      data<{ orderId: string }[]>(res).map((o) => o.orderId),
    ).not.toContain(orderId);
  });

  it('refuses a self-dealing accept even when asked directly', async () => {
    const res = await asUser(
      customer,
      'post',
      `/api/v1/p2p/orders/${orderId}/accept`,
    )
      .set('Idempotency-Key', 'self-accept')
      .expect(403);

    expect(JSON.stringify(res.body)).toMatch(/SELF_DEALING_REFUSED/);
  });

  it('refuses to show the order to a stranger', async () => {
    await asUser(other, 'get', `/api/v1/p2p/orders/${orderId}`).expect(403);
  });

  it('gives exactly one winner when two merchants accept at once', async () => {
    const [a, b] = await Promise.all([
      asUser(merchant, 'post', `/api/v1/p2p/orders/${orderId}/accept`)
        .set('Idempotency-Key', 'accept-a')
        .send({}),
      asUser(other, 'post', `/api/v1/p2p/orders/${orderId}/accept`)
        .set('Idempotency-Key', 'accept-b')
        .send({}),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);
    const loser = a.status === 409 ? a : b;
    expect(JSON.stringify(loser.body)).toMatch(/ORDER_ALREADY_ASSIGNED/);
  });

  it('completes the sell: merchant pays, customer confirms, ledger settles', async () => {
    const detail = await asUser(
      customer,
      'get',
      `/api/v1/p2p/orders/${orderId}`,
    ).expect(200);
    const winner = data<{ merchantUserId: string }>(detail).merchantUserId;
    const payer = [merchant, other].find((p) => p.userId === winner)!;

    await asUser(payer, 'post', `/api/v1/p2p/orders/${orderId}/utr`)
      .send({ utr: 'UTR-E2E-0001' })
      .expect(201);

    await asUser(customer, 'post', `/api/v1/p2p/orders/${orderId}/confirm`)
      .set('Idempotency-Key', 'settle-1')
      .expect(201);

    const settled = await asUser(
      customer,
      'get',
      `/api/v1/p2p/orders/${orderId}`,
    ).expect(200);
    expect(data<{ status: string }>(settled).status).toBe('COMPLETED');

    // PRD §15 item 1: 100 USDT at ₹97 yields 97.00 to the merchant and 3.00
    // to platform revenue.
    const revenue = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END),0)::text AS v
         FROM ledger_entry WHERE account_type = 'REVENUE'`,
    );
    expect((revenue.rows[0] as { v: string }).v).toBe('3.000000000000000000');
  });
});
