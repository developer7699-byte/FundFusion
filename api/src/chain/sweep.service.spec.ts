import { AccountService } from '../ledger/account.service';
import { BalanceService } from '../ledger/balance.service';
import {
  makeTestDb,
  seedAsset,
  seedUser,
  type TestDb,
} from '../ledger/test-db';
import { fixedSettings } from '../settings/platform-settings';
import type { ChainClient, TransferLog } from './chain.types';
import { HdWalletService } from './hd-wallet.service';
import type { Signer } from './signer';
import { SweepService } from './sweep.service';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

const TOKEN = '0x1111111111111111111111111111111111111111';
const HOT = '0x9999999999999999999999999999999999999999';
const GAS = '0x8888888888888888888888888888888888888888';

class FakeChain implements ChainClient {
  native = new Map<string, string>();
  token = new Map<string, string>();

  assertNetwork(): Promise<void> {
    return Promise.resolve();
  }
  finalizedBlockNumber(): Promise<bigint> {
    return Promise.resolve(1n);
  }
  transferLogs(): Promise<TransferLog[]> {
    return Promise.resolve([]);
  }
  nativeBalance(address: string): Promise<string> {
    return Promise.resolve(this.native.get(address.toLowerCase()) ?? '0');
  }
  tokenBalance(_token: string, address: string): Promise<string> {
    return Promise.resolve(this.token.get(address.toLowerCase()) ?? '0');
  }
}

class FakeSigner implements Signer {
  sent: { kind: 'BNB' | 'USDT'; to: string; amount: string }[] = [];
  failTokenSweep: Error | null = null;

  gasWalletAddress(): string {
    return GAS;
  }
  sendGas(to: string, amountBnb: string): Promise<string> {
    this.sent.push({ kind: 'BNB', to, amount: amountBnb });
    return Promise.resolve(`0x${'f'.repeat(64)}`);
  }
  sweepToken(_index: number, to: string, amount: string): Promise<string> {
    if (this.failTokenSweep) return Promise.reject(this.failTokenSweep);
    this.sent.push({ kind: 'USDT', to, amount });
    return Promise.resolve(`0x${'e'.repeat(64)}`);
  }
}

let t: TestDb;
let accounts: AccountService;
let balances: BalanceService;
let chain: FakeChain;
let signer: FakeSigner;
let sweeps: SweepService;
let depositAddress: string;
let accountId: string;

beforeAll(() => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
  balances = new BalanceService(t.db);
}, 30000);

beforeEach(async () => {
  await t.reset();
  const assetId = await seedAsset(t.pool);
  await t.pool.query(
    `INSERT INTO blockchain_network (asset_id, code, name)
     VALUES ($1, 'BSC_TESTNET', 'BSC Testnet')`,
    [assetId],
  );
  const userId = await seedUser(t.pool, 'depositor@example.test');
  // The §9.1 gate: verified email plus an enrolled authenticator.
  await t.pool.query(
    `UPDATE "user"
        SET email_verified_at = now(),
            mfa_secret = 'AAAAAAAAAAAAAAAA',
            mfa_enrolled_at = now()
      WHERE id = $1`,
    [userId],
  );
  accountId = await accounts.ensureAccount(userId, 'USDT');
  const wallets = new HdWalletService(t.db, accounts, {
    seedPhrase: generateMnemonic(wordlist, 128),
  });
  depositAddress = await wallets.addressFor(userId);

  chain = new FakeChain();
  signer = new FakeSigner();
  chain.native.set(GAS.toLowerCase(), '1');
  sweeps = new SweepService(t.db, chain, signer, fixedSettings(), {
    tokenAddress: TOKEN,
    hotWalletAddress: HOT,
    networkCode: 'BSC_TESTNET',
  });
});

afterAll(async () => {
  await t.close();
});

function holds(usdt: string, bnb = '0') {
  chain.token.set(depositAddress.toLowerCase(), usdt);
  chain.native.set(depositAddress.toLowerCase(), bnb);
}

describe('sweeping (PRD §8.3)', () => {
  it('sweeps an address that is over the threshold', async () => {
    holds('100');

    await sweeps.sweepOnce();

    expect(signer.sent.at(-1)).toEqual({
      kind: 'USDT',
      to: HOT,
      amount: '100',
    });
  });

  it('leaves an address under the threshold alone', async () => {
    holds('1');

    await sweeps.sweepOnce();

    expect(signer.sent).toEqual([]);
  });

  /**
   * The BEP-20 gas trap: moving USDT out of a deposit address needs BNB in
   * that address, and a freshly derived one has none. Every sweep is two
   * transactions, in this order.
   */
  it('funds the address with BNB before moving the USDT', async () => {
    holds('100', '0');

    await sweeps.sweepOnce();

    expect(signer.sent.map((s) => s.kind)).toEqual(['BNB', 'USDT']);
    expect(signer.sent[0].to).toBe(depositAddress);
  });

  it('does not re-fund an address that already has gas', async () => {
    holds('100', '0.01');

    await sweeps.sweepOnce();

    expect(signer.sent.map((s) => s.kind)).toEqual(['USDT']);
  });

  /**
   * Review Focus #4. A dry gas wallet halts every sweep while nothing errors
   * and every dashboard stays green, so it has to say so loudly.
   */
  it('refuses to sweep when the gas wallet is below its floor', async () => {
    holds('100');
    chain.native.set(GAS.toLowerCase(), '0.0001');

    await expect(sweeps.sweepOnce()).rejects.toThrow(/gas wallet/i);
    expect(signer.sent).toEqual([]);
  });

  it('does not report a sweep that failed on the second transaction', async () => {
    holds('100');
    signer.failTokenSweep = new Error('out of gas');

    await expect(sweeps.sweepOnce()).rejects.toThrow(/out of gas/);

    const r = await t.pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM transfer`,
    );
    expect(r.rows[0].n).toBe(0);
  });

  /**
   * A sweep moves the platform's own custody. It is not a user movement, and
   * posting one would double-count every deposit.
   */
  it('posts no ledger journal', async () => {
    holds('100');
    const before = await t.pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM ledger_transaction`,
    );

    await sweeps.sweepOnce();

    const after = await t.pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM ledger_transaction`,
    );
    expect(after.rows[0].n).toBe(before.rows[0].n);
    expect(await balances.balance(accountId, 'AVAILABLE')).toBe(
      '0.000000000000000000',
    );
  });

  it('reports what it swept', async () => {
    holds('100');

    const result = await sweeps.sweepOnce();

    expect(result.swept).toEqual([
      expect.objectContaining({ address: depositAddress, amount: '100' }),
    ]);
  });
});
