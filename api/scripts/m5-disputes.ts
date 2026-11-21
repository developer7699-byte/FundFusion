/**
 * M5's done condition: **every** dispute outcome exercised (PRD §6.10).
 *
 * Run: `npm run disputes:exercise --workspace api` with the API running.
 *
 * Four orders, four outcomes, over HTTP, against a real ledger. The code
 * existing is not the condition — each outcome having actually run, and the
 * ledger having moved the way §6.10 says it should, is.
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
loadEnv({ path: resolve(__dirname, '..', '.env') });

import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { timeCounter, totpCode } from '../src/auth/v1/totp';

const API = process.env.SPINE_API ?? 'http://localhost:3001/api/v1';
const EMAIL_CODE = process.env.OTP_STATIC_DEV ?? '246810';

interface Party {
  label: string;
  userId: string;
  token: string;
}

async function call<T>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
    idempotencyKey?: string;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.idempotencyKey)
    headers['Idempotency-Key'] = options.idempotencyKey;

  const res = await fetch(`${API}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: T;
    error?: { message: string };
    message?: string;
  };

  if (!res.ok || body.success === false) {
    const why = body.error?.message ?? body.message ?? res.statusText;
    throw new Error(
      `${options.method ?? 'GET'} ${path} → ${res.status}: ${why}`,
    );
  }
  return body.data as T;
}

async function signUp(label: string): Promise<Party> {
  const email = `${label}-${Date.now()}@example.test`;
  const registered = await call<{ userId: string }>('/auth/register', {
    method: 'POST',
    body: { email, password: 'Example!Demo1', displayName: label },
  });
  const session = await call<{ accessToken: string }>('/auth/register/verify', {
    method: 'POST',
    body: { email, code: EMAIL_CODE },
  });
  const token = session.accessToken;

  const begun = await call<{ secret: string }>('/auth/mfa/begin', {
    method: 'POST',
    token,
  });
  await call('/auth/mfa/confirm', {
    method: 'POST',
    token,
    body: { code: totpCode(begun.secret, timeCounter(Date.now())) },
  });

  return { label, userId: registered.userId, token };
}

async function balances(party: Party) {
  return call<Record<string, string>>('/wallet/balances', {
    token: party.token,
  });
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await call('/admin/seed', { method: 'POST' });

  console.log('── Setting up');
  const customer = await signUp('customer');
  const merchant = await signUp('merchant');
  const admin = await signUp('admin');

  await pool.query(
    `INSERT INTO user_role (user_id, role_id)
     SELECT $1, id FROM role WHERE name = 'SUPER_ADMIN'`,
    [admin.userId],
  );
  await pool.query(
    `INSERT INTO merchant_profile (user_id, desk_name, status, buy_enabled, sell_enabled)
     VALUES ($1, $2, 'ACTIVE', true, true)`,
    [merchant.userId, `desk-${Date.now()}`],
  );
  await pool.query(
    `INSERT INTO user_role (user_id, role_id)
     SELECT $1, id FROM role WHERE name = 'MERCHANT'`,
    [merchant.userId],
  );

  // A high pause threshold, so exercising four defaults does not stop the
  // desk halfway through the thing being exercised.
  await call('/admin/settings/dispute.defaultsBeforePause', {
    method: 'PUT',
    token: admin.token,
    body: { value: 20, reason: 'exercising every outcome in one run' },
  });

  for (const party of [customer, merchant]) {
    await balances(party);
    const account = await pool.query(
      `SELECT wa.id FROM wallet_account wa
         JOIN wallet w ON w.id = wa.wallet_id WHERE w.user_id = $1`,
      [party.userId],
    );
    const tx = await pool.query(
      `INSERT INTO ledger_transaction (reference, memo, idempotency, fingerprint)
       VALUES (gen_random_uuid()::text, 'opening balance', $1, $1) RETURNING id`,
      [`fund-${party.userId}`],
    );
    await pool.query(
      `INSERT INTO ledger_entry (transaction_id, account_id, account_type, direction, amount, asset_symbol)
       VALUES ($1, $2, 'AVAILABLE', 'CREDIT', 1000, 'USDT'),
              ($1, NULL, 'EXTERNAL', 'DEBIT', 1000, 'USDT')`,
      [
        (tx.rows[0] as { id: string }).id,
        (account.rows[0] as { id: string }).id,
      ],
    );
  }
  console.log('customer and merchant funded with 1000 USDT each');

  /** A sell, accepted, then disputed — ready for an admin to decide. */
  async function disputedSell(label: string): Promise<string> {
    const quote = await call<{ id: string }>('/p2p/quotes', {
      method: 'POST',
      token: customer.token,
      body: { side: 'SELL', usdtAmount: '100' },
    });
    const order = await call<{ id: string }>('/p2p/orders', {
      method: 'POST',
      token: customer.token,
      idempotencyKey: randomUUID(),
      body: { quoteId: quote.id },
    });
    await call(`/p2p/orders/${order.id}/accept`, {
      method: 'POST',
      token: merchant.token,
      idempotencyKey: randomUUID(),
    });
    const dispute = await call<{ id: string }>(
      `/p2p/orders/${order.id}/dispute`,
      {
        method: 'POST',
        token: customer.token,
        body: { reason: `exercising ${label}` },
      },
    );
    return dispute.id;
  }

  const outcomes: {
    outcome: string;
    reason: string;
    counterpartyAmount?: string;
  }[] = [
    { outcome: 'RELEASE', reason: 'bank statement shows the transfer' },
    { outcome: 'REFUND', reason: 'no transfer found' },
    {
      outcome: 'SPLIT',
      reason: 'partial transfer evidenced',
      counterpartyAmount: '40',
    },
    {
      outcome: 'REFUND_WITH_PENALTY',
      reason: 'merchant confirmed they never sent it',
    },
  ];

  for (const decision of outcomes) {
    console.log(`\n── ${decision.outcome}`);
    const before = {
      customer: await balances(customer),
      merchant: await balances(merchant),
    };
    const disputeId = await disputedSell(decision.outcome);

    await call(`/admin/disputes/${disputeId}/resolve`, {
      method: 'POST',
      token: admin.token,
      idempotencyKey: randomUUID(),
      body: decision,
    });

    const after = {
      customer: await balances(customer),
      merchant: await balances(merchant),
    };
    console.log(
      `customer ${before.customer.AVAILABLE} → ${after.customer.AVAILABLE}`,
    );
    console.log(
      `merchant ${before.merchant.AVAILABLE} → ${after.merchant.AVAILABLE}`,
    );

    const resolved = await call<{ outcome: string; penaltyAmount: string }>(
      `/admin/disputes/${disputeId}`,
      { token: admin.token },
    );
    if (resolved.outcome !== decision.outcome) {
      throw new Error(
        `Expected ${decision.outcome}, the dispute recorded ${resolved.outcome}.`,
      );
    }
    if (decision.outcome === 'REFUND_WITH_PENALTY') {
      console.log(`penalty drawn from the bond: ${resolved.penaltyAmount}`);
    }
  }

  console.log('\n── The ledger afterwards');
  const revenue = await pool.query(
    `SELECT COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END),0)::numeric(38,18)::text AS v
       FROM ledger_entry WHERE account_type = 'REVENUE'`,
  );
  console.log(`platform revenue ${(revenue.rows[0] as { v: string }).v}`);

  const stranded = await pool.query(
    `SELECT COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END),0)::numeric(38,18)::text AS v
       FROM ledger_entry WHERE account_type IN ('LOCKED','BONDED')`,
  );
  console.log(
    `still locked or bonded ${(stranded.rows[0] as { v: string }).v}`,
  );

  const unbalanced = await pool.query(
    `SELECT transaction_id FROM ledger_entry GROUP BY transaction_id
      HAVING SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END) <> 0`,
  );
  console.log(`unbalanced journals ${unbalanced.rowCount}`);

  const negative = await pool.query(
    `SELECT account_id FROM ledger_entry WHERE account_id IS NOT NULL
      GROUP BY account_id, account_type
     HAVING SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END) < 0`,
  );
  console.log(`negative balances ${negative.rowCount}`);

  await pool.end();
  if (unbalanced.rowCount !== 0) throw new Error('A journal does not balance.');
  if (negative.rowCount !== 0) throw new Error('A balance went negative.');
  if ((stranded.rows[0] as { v: string }).v !== '0.000000000000000000') {
    throw new Error(
      'Something is still locked or bonded after every resolution.',
    );
  }
  console.log('\nEVERY OUTCOME EXERCISED ✓');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
