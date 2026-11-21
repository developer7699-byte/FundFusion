/**
 * M3's done condition, end to end on BSC testnet.
 *
 * Run: `npm run chain:roundtrip --workspace api`
 *
 * Derives a deposit address, sends test USDT to it from the faucet account,
 * waits for the watcher to credit it on finality, sweeps it to the hot
 * wallet, withdraws it back out through the allowlist and the authenticator,
 * then reconciles the ledger against the chain.
 *
 * It uses the real services throughout — the same code the API runs. The one
 * thing it fast-forwards is the 24-hour address cooldown, which is proven in
 * `allowlist.service.spec.ts` and would otherwise make this a two-day script.
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
loadEnv({ path: resolve(__dirname, '..', '.env') });

import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbiItem,
  parseUnits,
} from 'viem';
import { bscTestnet } from 'viem/chains';
import * as schema from '../src/db/schema';
import { AuditService } from '../src/audit/audit.service';
import { MfaService } from '../src/auth/v1/mfa.service';
import { generateSecret, timeCounter, totpCode } from '../src/auth/v1/totp';
import { CapabilityService } from '../src/capability/capability.service';
import { chainConfigFrom } from '../src/chain/chain.config';
import { gasAccount } from '../src/chain/derivation';
import { DepositWatcherService } from '../src/chain/deposit-watcher.service';
import { HdWalletService } from '../src/chain/hd-wallet.service';
import { ReconciliationService } from '../src/chain/reconciliation.service';
import { SweepService } from '../src/chain/sweep.service';
import { ViemChainClient } from '../src/chain/viem-chain.client';
import { ViemSigner } from '../src/chain/viem-signer';
import { AccountService } from '../src/ledger/account.service';
import { BalanceService } from '../src/ledger/balance.service';
import { PostingService } from '../src/ledger/posting.service';
import { PlatformSettingsService } from '../src/settings/platform-settings.service';
import { AllowlistService } from '../src/wallet/v1/allowlist.service';
import { PayoutService } from '../src/wallet/v1/payout.service';
import { WithdrawalService } from '../src/wallet/v1/withdrawal.service';

const TRANSFER = parseAbiItem(
  'function transfer(address to, uint256 value) returns (bool)',
);
const NETWORK = 'BSC_TESTNET';
const DEPOSIT_AMOUNT = '25';
const WITHDRAW_AMOUNT = '20';

function step(n: number, what: string) {
  console.log(`\n── ${n}. ${what}`);
}

async function main() {
  const cfg = chainConfigFrom();
  const seed = process.env.BSC_HD_SEED ?? '';
  const token = cfg.usdtAddress as `0x${string}`;
  if (!token) throw new Error('USDT_CONTRACT_ADDRESS is not set.');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema, casing: 'snake_case' });

  const chain = new ViemChainClient(cfg);
  const signer = new ViemSigner({
    httpUrl: cfg.httpUrl,
    seedPhrase: seed,
    tokenAddress: token,
  });
  const accounts = new AccountService(db);
  const balances = new BalanceService(db);
  const posting = new PostingService(db, accounts, balances);
  const audit = new AuditService(db);
  const settings = new PlatformSettingsService(db, audit);
  const mfa = new MfaService(db);
  const capabilities = new CapabilityService(db);
  const wallets = new HdWalletService(db, accounts, { seedPhrase: seed });
  const allowlist = new AllowlistService(db, mfa, audit, settings);
  const withdrawals = new WithdrawalService(
    db,
    allowlist,
    mfa,
    capabilities,
    posting,
    accounts,
    audit,
    settings,
  );
  const payouts = new PayoutService(
    db,
    signer,
    posting,
    audit,
    chain,
    settings,
  );
  const reconcile = new ReconciliationService(db, chain, settings, {
    tokenAddress: token,
    networkCode: NETWORK,
    hotWalletAddress: signer.hotWalletAddress(),
  });

  await chain.assertNetwork();
  console.log(`chain 97 · token ${token}`);
  console.log(`hot wallet ${signer.hotWalletAddress()}`);

  // ── a user who may hold funds ────────────────────────────────────────────
  step(1, 'Create a verified user with an authenticator');
  await ensureSeedRows(pool);
  const email = `roundtrip-${Date.now()}@example.test`;
  const secret = generateSecret();
  const userRes = await pool.query(
    `INSERT INTO "user" (email, password_hash, display_name, status,
                         email_verified_at, mfa_secret, mfa_enrolled_at)
     VALUES ($1, 'x', 'Round Trip', 'ACTIVE', now(), $2, now()) RETURNING id`,
    [email, secret],
  );
  const userId = (userRes.rows[0] as { id: string }).id;
  await capabilities.grant(userId, 'WITHDRAW', {
    actorId: null,
    reason: 'round trip',
  });
  const accountId = await accounts.ensureAccount(userId, 'USDT');
  console.log(`user ${email}`);

  step(2, 'Derive a deposit address');
  const depositAddress = await wallets.addressFor(userId);
  console.log(`deposit address ${depositAddress}`);

  // ── the watcher starts at the finalized head, so establish the cursor
  //    before the deposit is sent, exactly as a running API would ──────────
  const watcher = new DepositWatcherService(db, chain, posting, {
    tokenAddress: token,
    networkCode: NETWORK,
    maxBlockRange: 500n,
  });
  const primed = await watcher.scanOnce();
  console.log(`watcher cursor at block ${primed.to}`);

  step(3, `Send ${DEPOSIT_AMOUNT} USDT to it from the faucet account`);
  const faucet = gasAccount(seed);
  const wallet = createWalletClient({
    account: faucet,
    chain: bscTestnet,
    transport: http(cfg.httpUrl),
  });
  const pub = createPublicClient({
    chain: bscTestnet,
    transport: http(cfg.httpUrl),
  });
  const depositTx = await wallet.writeContract({
    account: faucet,
    chain: bscTestnet,
    address: token,
    abi: [TRANSFER],
    functionName: 'transfer',
    args: [depositAddress as `0x${string}`, parseUnits(DEPOSIT_AMOUNT, 18)],
  });
  await pub.waitForTransactionReceipt({ hash: depositTx });
  console.log(`deposit tx ${depositTx}`);

  step(4, 'Wait for the watcher to credit it on finality');
  const credited = await until(
    async () => {
      const scan = await watcher.scanOnce();
      return scan.credited.length > 0 ? scan : null;
    },
    60,
    2000,
  );
  console.log(`credited ${credited.credited.length} deposit(s)`);
  console.log(`AVAILABLE ${await balances.balance(accountId, 'AVAILABLE')}`);

  step(5, 'Sweep the deposit address to the hot wallet');
  const sweeps = new SweepService(db, chain, signer, settings, {
    tokenAddress: token,
    hotWalletAddress: signer.hotWalletAddress(),
    networkCode: NETWORK,
  });
  const swept = await sweeps.sweepOnce();
  for (const s of swept.swept) {
    console.log(`swept ${s.amount} from ${s.address} in ${s.txHash}`);
  }
  console.log(
    `deposit address now holds ${await chain.tokenBalance(token, depositAddress)} USDT`,
  );

  step(6, 'Allowlist a withdrawal address');
  const destination = faucet.address;
  const now = Date.now();
  const saved = await allowlist.add(
    userId,
    destination,
    totpCode(secret, timeCounter(now)),
    { label: 'round trip', now },
  );
  console.log(
    `allowlisted ${destination}, usable from ${saved.usableFrom.toISOString()}`,
  );
  await pool.query(
    `UPDATE withdrawal_address SET usable_from = now() - interval '1 minute' WHERE id = $1`,
    [saved.id],
  );
  console.log('cooldown fast-forwarded (proven in allowlist.service.spec.ts)');

  step(7, `Withdraw ${WITHDRAW_AMOUNT} USDT back out`);
  const later = Date.now() + 60_000;
  const requested = await withdrawals.request(
    userId,
    destination,
    WITHDRAW_AMOUNT,
    totpCode(secret, timeCounter(later)),
    randomUUID(),
    later,
  );
  console.log(`withdrawal ${requested.id} is ${requested.status}`);
  console.log(`LOCKED ${await balances.balance(accountId, 'LOCKED')}`);

  const sent = await payouts.send(requested.id);
  console.log(`paid out in ${sent.txHash}`);
  console.log(`AVAILABLE ${await balances.balance(accountId, 'AVAILABLE')}`);
  console.log(`LOCKED ${await balances.balance(accountId, 'LOCKED')}`);

  step(8, 'Reconcile the ledger against the chain (PRD §13.1)');
  const report = await reconcile.check();
  console.log(`ledger   ${report.ledgerUsdt}`);
  console.log(`on chain ${report.onChainUsdt}`);
  console.log(`drift    ${report.drift} (tolerance ${report.tolerance})`);
  console.log(`unbalanced journals: ${report.unbalancedJournals.length}`);
  console.log(report.clean ? '\nRECONCILED ✓' : '\nDRIFT ✗');

  await pool.end();
  if (!report.clean) process.exit(1);
}

/** Poll until `work` returns something, or give up loudly. */
async function until<T>(
  work: () => Promise<T | null>,
  attempts: number,
  waitMs: number,
): Promise<T> {
  for (let n = 0; n < attempts; n++) {
    const result = await work();
    if (result) return result;
    await new Promise((r) => setTimeout(r, waitMs));
  }
  throw new Error(`Gave up after ${attempts} attempts.`);
}

/** The asset and network rows the wallet needs, if this database has none. */
async function ensureSeedRows(pool: Pool) {
  await pool.query(
    `INSERT INTO asset (symbol, name, decimals, kind)
     VALUES ('USDT', 'Tether USD', 18, 'CRYPTO')
     ON CONFLICT (symbol) DO NOTHING`,
  );
  await pool.query(
    `INSERT INTO blockchain_network (asset_id, code, name)
     SELECT id, $1, 'BSC Testnet' FROM asset WHERE symbol = 'USDT'
     ON CONFLICT (asset_id, code) DO NOTHING`,
    [NETWORK],
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
