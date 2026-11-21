/**
 * Two accounts a person can sign into, so the v1 API can be demonstrated by
 * clicking rather than by curl.
 *
 * Run: `npm run demo:seed --workspace api` with the API running.
 *
 * Like `m45-spine.ts` it speaks only HTTP, and funds through the real deposit
 * path — test USDT is sent on chain and the watcher credits it on finality.
 * Unlike that script the credentials are fixed and printed, which is exactly
 * why it refuses to run against a database that is not local.
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
loadEnv({ path: resolve(__dirname, '..', '.env') });

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
const PASSWORD = 'Example!Demo1';
const FUNDING_USDT = '150';
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

async function call<T>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

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

/**
 * A known password on a reachable database is a account anybody can take.
 * The check is on the host rather than on NODE_ENV, because the thing that
 * makes this dangerous is where the rows land, not what the process calls
 * itself.
 */
function refuseIfNotLocal(url: string): void {
  const host = new URL(url).hostname;
  if (!['localhost', '127.0.0.1', '::1', 'postgres'].includes(host)) {
    throw new Error(
      `demo:seed creates accounts with the published password "${PASSWORD}". ` +
        `It refuses to run against ${host}. Point DATABASE_URL at a local database.`,
    );
  }
}

async function signUp(label: string, pool: Pool): Promise<Party> {
  const email = `${label}@demo.test`;

  // Fixed credentials mean a re-run collides with itself. Clearing the row
  // is what makes this script idempotent, and the local-only check above is
  // what makes clearing it safe.
  await pool.query(`DELETE FROM "user" WHERE email = $1`, [email]);

  const registered = await call<{ userId: string }>('/auth/register', {
    method: 'POST',
    body: { email, password: PASSWORD, displayName: label },
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

  return {
    label,
    email,
    userId: registered.userId,
    token,
    secret: begun.secret,
  };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set.');
  refuseIfNotLocal(databaseUrl);

  const cfg = chainConfigFrom();
  const usdt = cfg.usdtAddress as `0x${string}`;
  if (!usdt) throw new Error('USDT_CONTRACT_ADDRESS is not set.');

  const pool = new Pool({ connectionString: databaseUrl });
  const faucet = gasAccount(process.env.BSC_HD_SEED ?? '');
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

  console.log('\n── Two accounts, each with an authenticator');
  const customer = await signUp('customer', pool);
  const merchant = await signUp('merchant', pool);

  console.log('\n── A merchant desk, through the API');
  await call('/p2p/merchant/desk', {
    method: 'POST',
    token: merchant.token,
    body: { deskName: 'Demo Desk' },
  });

  console.log(`\n── ${FUNDING_USDT} test USDT each, by real deposit`);
  for (const party of [customer, merchant]) {
    const got = await call<{ address: string }>('/wallet/address', {
      token: party.token,
    });
    party.address = got.address;
    const hash = await wallet.writeContract({
      account: faucet,
      chain: bscTestnet,
      address: usdt,
      abi: [TRANSFER],
      functionName: 'transfer',
      args: [got.address as `0x${string}`, parseUnits(FUNDING_USDT, 18)],
    });
    await pub.waitForTransactionReceipt({ hash });
    console.log(`${party.label} → ${got.address} in ${hash}`);
  }

  console.log(
    '\nThe watcher credits these after 15 confirmations; balances appear then.',
  );
  console.log('\n── Sign in with');
  for (const party of [customer, merchant]) {
    console.log(`  ${party.label.padEnd(9)} ${party.email}`);
    console.log(`  ${''.padEnd(9)} password         ${PASSWORD}`);
    console.log(`  ${''.padEnd(9)} emailed code     ${EMAIL_CODE}`);
    console.log(`  ${''.padEnd(9)} authenticator    ${party.secret}`);
  }
  console.log(
    '\nAdd the authenticator secret to any TOTP app to pass the money gate.\n',
  );

  await pool.end();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
