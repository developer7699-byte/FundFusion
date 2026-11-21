import { AuditService } from '../../audit/audit.service';
import { MfaService } from '../../auth/v1/mfa.service';
import { generateSecret, timeCounter, totpCode } from '../../auth/v1/totp';
import { CapabilityService } from '../../capability/capability.service';
import type { ChainClient } from '../../chain/chain.types';
import type { Signer } from '../../chain/signer';
import { AccountService } from '../../ledger/account.service';
import { BalanceService } from '../../ledger/balance.service';
import { PostingService } from '../../ledger/posting.service';
import { makeTestDb, seedUser, type TestDb } from '../../ledger/test-db';
import { fixedSettings } from '../../settings/platform-settings';
import { AllowlistService } from './allowlist.service';
import { PayoutService } from './payout.service';
import { WithdrawalService } from './withdrawal.service';

const NETWORK = 'BSC_TESTNET';
const ADDRESS = '0x4b7877dD11Ef2d15297Cb0a013F8513d8D9EBf3C';
const HOT = '0x356545e8Cc9aB65B7f6BA2B761653CeA86a8317A';
const T0 = Date.UTC(2026, 10, 21, 9, 0, 0);
const USABLE = T0 + 25 * 3_600_000;

/** Only the balance reads matter; nothing else is consulted. */
class FakeChain implements ChainClient {
  native = '1';

  assertNetwork(): Promise<void> {
    return Promise.resolve();
  }
  finalizedBlockNumber(): Promise<bigint> {
    return Promise.resolve(1n);
  }
  transferLogs(): Promise<never[]> {
    return Promise.resolve([]);
  }
  nativeBalance(): Promise<string> {
    return Promise.resolve(this.native);
  }
  tokenBalance(): Promise<string> {
    return Promise.resolve('0');
  }
}

class FakeSigner implements Signer {
  paid: { to: string; amount: string }[] = [];
  gassed: { to: string; amount: string }[] = [];
  fail: Error | null = null;

  gasWalletAddress() {
    return '0x1111111111111111111111111111111111111111';
  }
  hotWalletAddress() {
    return HOT;
  }
  sendGas(to: string, amountBnb: string): Promise<string> {
    this.gassed.push({ to, amount: amountBnb });
    return Promise.resolve(`0x${'a'.repeat(64)}`);
  }
  sweepToken(): Promise<string> {
    return Promise.resolve(`0x${'b'.repeat(64)}`);
  }
  payout(to: string, amount: string): Promise<string> {
    if (this.fail) return Promise.reject(this.fail);
    this.paid.push({ to, amount });
    return Promise.resolve(`0x${'c'.repeat(64)}`);
  }
}

let t: TestDb;
let accounts: AccountService;
let balances: BalanceService;
let posting: PostingService;
let withdrawals: WithdrawalService;
let payouts: PayoutService;
let signer: FakeSigner;
let chain: FakeChain;
let userId: string;
let accountId: string;
let secret: string;

beforeAll(() => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
  balances = new BalanceService(t.db);
  posting = new PostingService(t.db, accounts, balances);
}, 30000);

beforeEach(async () => {
  await t.reset();
  const asset = await t.pool.query(
    `INSERT INTO asset (symbol, name, decimals, kind)
     VALUES ('USDT', 'Tether USD', 18, 'CRYPTO') RETURNING id`,
  );
  await t.pool.query(
    `INSERT INTO blockchain_network (asset_id, code, name) VALUES ($1, $2, 'BSC Testnet')`,
    [(asset.rows[0] as { id: string }).id, NETWORK],
  );

  const settings = fixedSettings({ 'withdrawal.feeUsdt': '1' });
  const mfa = new MfaService(t.db);
  const audit = new AuditService(t.db);
  const capabilities = new CapabilityService(t.db);
  const allowlist = new AllowlistService(t.db, mfa, audit, settings);
  withdrawals = new WithdrawalService(
    t.db,
    allowlist,
    mfa,
    capabilities,
    posting,
    accounts,
    audit,
    settings,
  );
  signer = new FakeSigner();
  chain = new FakeChain();
  nth = 0;
  payouts = new PayoutService(t.db, signer, posting, audit, chain, settings);

  userId = await seedUser(t.pool, 'holder@example.test');
  secret = generateSecret();
  await t.pool.query(
    `UPDATE "user" SET email_verified_at = now(), mfa_secret = $2, mfa_enrolled_at = now() WHERE id = $1`,
    [userId, secret],
  );
  accountId = await accounts.ensureAccount(userId, 'USDT');
  await capabilities.grant(userId, 'WITHDRAW', {
    actorId: null,
    reason: 'customer onboarding',
  });
  await posting.post({
    idempotencyKey: 'fund',
    memo: 'opening balance',
    lines: [
      {
        accountId,
        accountType: 'AVAILABLE',
        direction: 'CREDIT',
        amount: '1000',
        assetSymbol: 'USDT',
      },
      {
        accountType: 'EXTERNAL',
        direction: 'DEBIT',
        amount: '1000',
        assetSymbol: 'USDT',
      },
    ],
  });
  await allowlist.add(userId, ADDRESS, totpCode(secret, timeCounter(T0)), {
    now: T0,
  });
});

afterAll(async () => {
  await t.close();
});

/**
 * An approved withdrawal of 50 USDT plus a 1 USDT fee. Each one is stamped a
 * minute later than the last, because a code is accepted exactly once.
 */
let nth = 0;
async function approved(key = 'w-1') {
  const now = USABLE + nth++ * 60_000;
  return withdrawals.request(
    userId,
    ADDRESS,
    '50',
    totpCode(secret, timeCounter(now)),
    key,
    now,
  );
}

describe('paying an approved withdrawal (PRD §8.4)', () => {
  it('sends the amount to the allowlisted address', async () => {
    const w = await approved();

    await payouts.send(w.id);

    expect(signer.paid).toEqual([{ to: ADDRESS, amount: '50' }]);
  });

  it('records the transaction hash and marks it sent', async () => {
    const w = await approved();

    const sent = await payouts.send(w.id);

    expect(sent.status).toBe('SENT');
    expect(sent.txHash).toBe(`0x${'c'.repeat(64)}`);
  });

  /**
   * The money left custody, so it leaves the ledger: locked out, external
   * in, and the fee the platform kept recognised as revenue in the same
   * journal.
   */
  it('posts the journal that takes the money off the platform', async () => {
    const w = await approved();

    await payouts.send(w.id);

    expect(await balances.balance(accountId, 'LOCKED')).toBe(
      '0.000000000000000000',
    );
    expect(await balances.balance(accountId, 'AVAILABLE')).toBe(
      '949.000000000000000000',
    );
    const r = await t.pool.query(
      `SELECT COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END),0)::text AS v
         FROM ledger_entry WHERE account_type = 'REVENUE'`,
    );
    expect((r.rows[0] as { v: string }).v).toBe('1.000000000000000000');
  });

  it('refuses a withdrawal that is still queued', async () => {
    const w = await withdrawals.request(
      userId,
      ADDRESS,
      '500',
      totpCode(secret, timeCounter(USABLE)),
      'big',
      USABLE,
    );
    expect(w.status).toBe('QUEUED');

    await expect(payouts.send(w.id)).rejects.toThrow(/QUEUED|approved/i);
  });

  it('refuses to send the same withdrawal twice', async () => {
    const w = await approved();
    await payouts.send(w.id);

    await expect(payouts.send(w.id)).rejects.toThrow(/SENT|cannot/i);
  });
});

/**
 * The single most dangerous failure here. A broadcast that errors may still
 * have reached the network, so retrying it is how one withdrawal becomes
 * two — and a token transfer, once mined, cannot be recalled.
 */
describe('when the broadcast fails', () => {
  it('leaves the withdrawal needing a human, never retryable', async () => {
    const w = await approved();
    signer.fail = new Error('rpc went away');

    await expect(payouts.send(w.id)).rejects.toThrow(/rpc went away/);

    const r = await t.pool.query(
      `SELECT status FROM withdrawal WHERE id = $1`,
      [w.id],
    );
    expect((r.rows[0] as { status: string }).status).toBe('SENDING');
  });

  it('moves no money when the broadcast failed', async () => {
    const w = await approved();
    signer.fail = new Error('rpc went away');

    await expect(payouts.send(w.id)).rejects.toThrow();

    expect(await balances.balance(accountId, 'LOCKED')).toBe(
      '51.000000000000000000',
    );
  });

  it('refuses to send again after a failed broadcast', async () => {
    const w = await approved();
    signer.fail = new Error('rpc went away');
    await expect(payouts.send(w.id)).rejects.toThrow();
    signer.fail = null;

    await expect(payouts.send(w.id)).rejects.toThrow(/SENDING|cannot/i);
    expect(signer.paid).toHaveLength(0);
  });
});

/**
 * The hot wallet pays its own gas. If it cannot, every payout fails — and a
 * failure after the row is claimed strands the withdrawal in SENDING, where
 * only a human can free it. So the gas is checked before anything is
 * claimed, and an unfunded hot wallet leaves the queue exactly as it was.
 */
describe('when the hot wallet cannot pay for gas', () => {
  it('tops it up from the gas wallet rather than failing', async () => {
    const w = await approved();
    chain.native = '0';

    await payouts.send(w.id);

    expect(signer.gassed).toEqual([{ to: HOT, amount: '0.002' }]);
    expect(signer.paid).toHaveLength(1);
  });

  it('does not top up a hot wallet that can already pay', async () => {
    const w = await approved();
    chain.native = '1';

    await payouts.send(w.id);

    expect(signer.gassed).toEqual([]);
  });

  it('leaves the withdrawal approved when the top-up itself fails', async () => {
    const w = await approved();
    chain.native = '0';
    signer.sendGas = () => Promise.reject(new Error('gas wallet is empty'));

    await expect(payouts.send(w.id)).rejects.toThrow(/gas wallet is empty/);

    const r = await t.pool.query(
      `SELECT status FROM withdrawal WHERE id = $1`,
      [w.id],
    );
    expect((r.rows[0] as { status: string }).status).toBe('APPROVED');
  });
});

describe('sending the approved queue', () => {
  it('sends every approved withdrawal and reports what went', async () => {
    await approved('w-1');
    await approved('w-2');

    const result = await payouts.sendApproved();

    expect(result.sent).toHaveLength(2);
    expect(signer.paid).toHaveLength(2);
  });

  /** One bad payout must not stop the queue behind it. */
  it('carries on past one that fails', async () => {
    await approved('w-1');
    await approved('w-2');
    let first = true;
    signer.payout = (to: string, amount: string) => {
      if (first) {
        first = false;
        return Promise.reject(new Error('rpc went away'));
      }
      signer.paid.push({ to, amount });
      return Promise.resolve(`0x${'c'.repeat(64)}`);
    };

    const result = await payouts.sendApproved();

    expect(result.sent).toHaveLength(1);
    expect(result.failed).toHaveLength(1);
  });
});
