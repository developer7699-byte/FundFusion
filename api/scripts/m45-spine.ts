/**
 * M4.5's done condition: a full sell and a full buy, over HTTP, on testnet.
 *
 * Run: `npm run spine:roundtrip --workspace api` with the API running.
 *
 * It speaks only HTTP, using exactly the routes and headers the browser
 * spine uses — no service is reached directly. Funding is a real deposit:
 * test USDT is sent on chain and the watcher credits it on finality, so the
 * balances these orders settle against came from the chain, not a fixture.
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
loadEnv({ path: resolve(__dirname, '..', '.env') });

import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import {
  createPublicClient,
  createWalletClient,
  http as viemHttp,
  parseAbiItem,
  parseUnits,
} from 'viem';
import { bscTestnet } from 'viem/chains';
import { chainConfigFrom } from '../src/chain/chain.config';
import { gasAccount } from '../src/chain/derivation';
import { timeCounter, totpCode } from '../src/auth/v1/totp';

const API = process.env.SPINE_API ?? 'http://localhost:3001/api/v1';
const EMAIL_CODE = process.env.OTP_STATIC_DEV ?? '246810';
const TRANSFER = parseAbiItem(
  'function transfer(address to, uint256 value) returns (bool)',
);

interface Party {
  label: string;
  email: string;
  userId: string;
  token: string;
  secret: string;
  address?: string;
}

function step(n: string, what: string) {
  console.log(`\n── ${n} ${what}`);
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

/** Register, verify the emailed code, enrol an authenticator. */
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

  console.log(`${label}: ${email}`);
  return {
    label,
    email,
    userId: registered.userId,
    token,
    secret: begun.secret,
  };
}

async function balances(party: Party) {
  return call<Record<string, string>>('/wallet/balances', {
    token: party.token,
  });
}

async function until<T>(
  work: () => Promise<T | null>,
  attempts: number,
  waitMs: number,
  what: string,
): Promise<T> {
  for (let n = 0; n < attempts; n++) {
    const got = await work();
    if (got) return got;
    await new Promise((r) => setTimeout(r, waitMs));
  }
  throw new Error(`Gave up waiting for ${what}.`);
}

async function main() {
  const cfg = chainConfigFrom();
  const seed = process.env.BSC_HD_SEED ?? '';
  const token = cfg.usdtAddress as `0x${string}`;
  if (!token) throw new Error('USDT_CONTRACT_ADDRESS is not set.');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const faucet = gasAccount(seed);
  const wallet = createWalletClient({
    account: faucet,
    chain: bscTestnet,
    transport: viemHttp(cfg.httpUrl),
  });
  const pub = createPublicClient({
    chain: bscTestnet,
    transport: viemHttp(cfg.httpUrl),
  });

  await call('/admin/seed', { method: 'POST' });

  step('1.', 'Two accounts, each with an authenticator');
  const customer = await signUp('customer');
  const merchant = await signUp('merchant');

  step('2.', 'Make one of them a merchant desk');
  await pool.query(
    `INSERT INTO merchant_profile (user_id, desk_name, status, buy_enabled, sell_enabled)
     VALUES ($1, $2, 'ACTIVE', true, true)
     ON CONFLICT DO NOTHING`,
    [merchant.userId, `desk-${Date.now()}`],
  );
  await pool.query(
    `INSERT INTO user_role (user_id, role_id)
     SELECT $1, id FROM role WHERE name = 'MERCHANT'
     ON CONFLICT DO NOTHING`,
    [merchant.userId],
  );

  step('3.', 'Deposit real test USDT to both, credited by the watcher');
  for (const party of [customer, merchant]) {
    const got = await call<{ address: string }>('/wallet/address', {
      token: party.token,
    });
    party.address = got.address;
    console.log(`${party.label} deposit address ${got.address}`);
  }

  for (const party of [customer, merchant]) {
    const hash = await wallet.writeContract({
      account: faucet,
      chain: bscTestnet,
      address: token,
      abi: [TRANSFER],
      functionName: 'transfer',
      args: [party.address as `0x${string}`, parseUnits('150', 18)],
    });
    await pub.waitForTransactionReceipt({ hash });
    console.log(`sent 150 USDT to ${party.label} in ${hash}`);
  }

  for (const party of [customer, merchant]) {
    const credited = await until(
      async () => {
        const b = await balances(party);
        return Number(b.AVAILABLE) >= 150 ? b : null;
      },
      60,
      3000,
      `${party.label}'s deposit to be credited`,
    );
    console.log(`${party.label} AVAILABLE ${credited.AVAILABLE}`);
  }

  // ── The sell ────────────────────────────────────────────────────────────
  step('4.', 'SELL — the customer sells 100 USDT');
  const sellQuote = await call<{
    id: string;
    usdtAmount: string;
    inrAmount: string;
    customerRate: string;
    platformFeeUsdt: string;
  }>('/p2p/quotes', {
    method: 'POST',
    token: customer.token,
    body: { side: 'SELL', usdtAmount: '100' },
  });
  console.log(
    `quoted ${sellQuote.usdtAmount} USDT = ₹${sellQuote.inrAmount} at ${sellQuote.customerRate}, fee ${sellQuote.platformFeeUsdt}`,
  );

  const sellOrder = await call<{ id: string }>('/p2p/orders', {
    method: 'POST',
    token: customer.token,
    idempotencyKey: randomUUID(),
    body: { quoteId: sellQuote.id },
  });
  console.log(`order ${sellOrder.id} broadcast`);

  const feed = await call<{ orderId: string; obligationUsdt: string }[]>(
    '/p2p/merchant/feed',
    { token: merchant.token },
  );
  const offered = feed.find((o) => o.orderId === sellOrder.id);
  if (!offered) throw new Error('The order did not reach the merchant feed.');
  console.log(`merchant sees it, obligation ${offered.obligationUsdt}`);

  await call(`/p2p/orders/${sellOrder.id}/accept`, {
    method: 'POST',
    token: merchant.token,
    idempotencyKey: randomUUID(),
  });
  console.log('merchant accepted');

  await call(`/p2p/orders/${sellOrder.id}/utr`, {
    method: 'POST',
    token: merchant.token,
    body: { utr: `UTR-SELL-${Date.now()}` },
  });
  console.log('merchant paid the rupees, reference submitted');

  await call(`/p2p/orders/${sellOrder.id}/confirm`, {
    method: 'POST',
    token: customer.token,
    idempotencyKey: randomUUID(),
  });
  const settledSell = await call<{ status: string }>(
    `/p2p/orders/${sellOrder.id}`,
    { token: customer.token },
  );
  console.log(`sell order ${settledSell.status}`);

  // ── The buy ─────────────────────────────────────────────────────────────
  step('5.', 'BUY — the customer buys 50 USDT');
  const buyQuote = await call<{
    id: string;
    usdtAmount: string;
    inrAmount: string;
    customerRate: string;
  }>('/p2p/quotes', {
    method: 'POST',
    token: customer.token,
    body: { side: 'BUY', usdtAmount: '50' },
  });
  console.log(
    `quoted ${buyQuote.usdtAmount} USDT = ₹${buyQuote.inrAmount} at ${buyQuote.customerRate}`,
  );

  const buyOrder = await call<{ id: string }>('/p2p/orders', {
    method: 'POST',
    token: customer.token,
    idempotencyKey: randomUUID(),
    body: { quoteId: buyQuote.id },
  });
  await call(`/p2p/orders/${buyOrder.id}/accept`, {
    method: 'POST',
    token: merchant.token,
    idempotencyKey: randomUUID(),
  });
  console.log('merchant accepted and locked the USDT');

  await call(`/p2p/orders/${buyOrder.id}/utr`, {
    method: 'POST',
    token: customer.token,
    body: { utr: `UTR-BUY-${Date.now()}` },
  });
  await call(`/p2p/orders/${buyOrder.id}/confirm`, {
    method: 'POST',
    token: merchant.token,
    idempotencyKey: randomUUID(),
  });
  const settledBuy = await call<{ status: string }>(
    `/p2p/orders/${buyOrder.id}`,
    { token: merchant.token },
  );
  console.log(`buy order ${settledBuy.status}`);

  // ── What the ledger says ────────────────────────────────────────────────
  step('6.', 'The ledger');
  console.log('customer', JSON.stringify(await balances(customer)));
  console.log('merchant', JSON.stringify(await balances(merchant)));
  const revenue = await pool.query(
    `SELECT COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END),0)::text AS v
       FROM ledger_entry WHERE account_type = 'REVENUE'`,
  );
  console.log(`platform revenue ${(revenue.rows[0] as { v: string }).v}`);

  const unbalanced = await pool.query(
    `SELECT transaction_id FROM ledger_entry GROUP BY transaction_id
      HAVING SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END) <> 0`,
  );
  console.log(`unbalanced journals ${unbalanced.rowCount}`);

  await pool.end();
  if (settledSell.status !== 'COMPLETED' || settledBuy.status !== 'COMPLETED') {
    throw new Error('An order did not complete.');
  }
  if (unbalanced.rowCount !== 0) throw new Error('A journal does not balance.');
  console.log('\nSELL AND BUY COMPLETE ✓');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
