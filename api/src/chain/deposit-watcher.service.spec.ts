import { AccountService } from '../ledger/account.service';
import { BalanceService } from '../ledger/balance.service';
import { PostingService } from '../ledger/posting.service';
import {
  makeTestDb,
  seedAsset,
  seedUser,
  type TestDb,
} from '../ledger/test-db';
import type { ChainClient, TransferLog } from './chain.types';
import { DepositWatcherService } from './deposit-watcher.service';
import { HdWalletService } from './hd-wallet.service';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

const TOKEN = '0x1111111111111111111111111111111111111111';
const NETWORK = 'BSC_TESTNET';

/** A scripted chain. The watcher is what is under test, not the network. */
class FakeChain implements ChainClient {
  finalized = 100n;
  logs: TransferLog[] = [];
  ranges: [bigint, bigint][] = [];
  failNextLogs: Error | null = null;

  assertNetwork(): Promise<void> {
    return Promise.resolve();
  }
  nativeBalance(): Promise<string> {
    return Promise.resolve('0');
  }
  tokenBalance(): Promise<string> {
    return Promise.resolve('0');
  }
  finalizedBlockNumber(): Promise<bigint> {
    return Promise.resolve(this.finalized);
  }
  transferLogs(
    fromBlock: bigint,
    toBlock: bigint,
    _token: string,
    toAddresses: string[],
  ): Promise<TransferLog[]> {
    this.ranges.push([fromBlock, toBlock]);
    if (this.failNextLogs) {
      const err = this.failNextLogs;
      this.failNextLogs = null;
      return Promise.reject(err);
    }
    const owned = new Set(toAddresses.map((a) => a.toLowerCase()));
    return Promise.resolve(
      this.logs.filter(
        (l) =>
          owned.has(l.to.toLowerCase()) &&
          l.blockNumber >= fromBlock &&
          l.blockNumber <= toBlock,
      ),
    );
  }
}

let t: TestDb;
let accounts: AccountService;
let balances: BalanceService;
let posting: PostingService;
let wallets: HdWalletService;
let chain: FakeChain;
let watcher: DepositWatcherService;
let userId: string;
let accountId: string;
let depositAddress: string;

beforeAll(() => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
  balances = new BalanceService(t.db);
  posting = new PostingService(t.db, accounts, balances);
}, 30000);

beforeEach(async () => {
  await t.reset();
  const assetId = await seedAsset(t.pool);
  await t.pool.query(
    `INSERT INTO blockchain_network (asset_id, code, name) VALUES ($1, $2, 'BSC Testnet')`,
    [assetId, NETWORK],
  );
  wallets = new HdWalletService(t.db, accounts, {
    seedPhrase: generateMnemonic(wordlist, 128),
  });
  userId = await seedUser(t.pool, 'depositor@example.test');
  await t.pool.query(
    `UPDATE "user" SET phone = '+919812345678', phone_verified_at = now() WHERE id = $1`,
    [userId],
  );
  accountId = await accounts.ensureAccount(userId, 'USDT');
  depositAddress = await wallets.addressFor(userId);

  chain = new FakeChain();
  watcher = new DepositWatcherService(t.db, chain, posting, {
    tokenAddress: TOKEN,
    networkCode: NETWORK,
    maxBlockRange: 50n,
  });
});

afterAll(async () => {
  await t.close();
});

function transfer(over: Partial<TransferLog> = {}): TransferLog {
  return {
    from: '0x2222222222222222222222222222222222222222',
    to: depositAddress,
    amount: '100',
    txHash: `0x${'a'.repeat(64)}`,
    logIndex: 0,
    blockNumber: 100n,
    ...over,
  };
}

async function journalsFor(txHash: string): Promise<number> {
  const r = await t.pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM ledger_transaction WHERE idempotency LIKE $1`,
    [`deposit:${txHash}%`],
  );
  return r.rows[0].n;
}

describe('crediting a deposit (PRD §8.2)', () => {
  it('credits a finalized transfer to the owner', async () => {
    chain.logs = [transfer()];

    await watcher.scanOnce();

    expect(await balances.balance(accountId, 'AVAILABLE')).toBe(
      '100.000000000000000000',
    );
  });

  it('records the deposit against its transaction', async () => {
    chain.logs = [transfer()];

    await watcher.scanOnce();

    const r = await t.pool.query<{
      tx_hash: string;
      status: string;
      amount: string;
    }>(`SELECT tx_hash, status, amount FROM deposit`);
    expect(r.rows[0].tx_hash).toBe(`0x${'a'.repeat(64)}`);
    expect(r.rows[0].status).toBe('CREDITED');
    expect(r.rows[0].amount).toBe('100.000000000000000000');
  });

  /** Review Focus #1. */
  it('credits once when the same block is scanned twice', async () => {
    chain.logs = [transfer()];

    await watcher.scanOnce();
    await watcher.resetCursorTo(99n);
    await watcher.scanOnce();

    expect(await journalsFor(`0x${'a'.repeat(64)}`)).toBe(1);
    expect(await balances.balance(accountId, 'AVAILABLE')).toBe(
      '100.000000000000000000',
    );
  });

  it('treats two transfers in one transaction as two deposits', async () => {
    chain.logs = [
      transfer({ logIndex: 0, amount: '10' }),
      transfer({ logIndex: 1, amount: '15' }),
    ];

    await watcher.scanOnce();

    expect(await balances.balance(accountId, 'AVAILABLE')).toBe(
      '25.000000000000000000',
    );
  });

  it('ignores a transfer to an address we do not own', async () => {
    chain.logs = [
      transfer({ to: '0x3333333333333333333333333333333333333333' }),
    ];

    await watcher.scanOnce();

    expect(await balances.balance(accountId, 'AVAILABLE')).toBe(
      '0.000000000000000000',
    );
  });

  it('credits the external account, so the journal balances', async () => {
    chain.logs = [transfer()];

    await watcher.scanOnce();

    const r = await t.pool.query<{ s: string }>(
      `SELECT COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END),0)::text AS s
         FROM ledger_entry e JOIN ledger_transaction x ON x.id = e.transaction_id
        WHERE x.idempotency LIKE 'deposit:%'`,
    );
    expect(Number(r.rows[0].s)).toBe(0);
  });
});

/** Review Focus #2 — the failure that loses money silently. */
describe('where the watcher reads', () => {
  /**
   * A fresh watcher has nothing behind it: an address only exists once a user
   * asked for one. Starting at genesis would scan years of blocks to find
   * nothing.
   */
  it('starts at the finalized head, not at genesis', async () => {
    chain.finalized = 40_000_000n;

    await watcher.scanOnce();

    expect(chain.ranges[0][0]).toBe(40_000_000n);
  });

  it('never reads past the finalized head', async () => {
    chain.finalized = 100n;

    await watcher.scanOnce();

    for (const [, to] of chain.ranges) {
      expect(to).toBeLessThanOrEqual(100n);
    }
  });

  it('resumes from where it stopped rather than rescanning everything', async () => {
    await watcher.scanOnce();
    chain.ranges = [];
    chain.finalized = 120n;

    await watcher.scanOnce();

    expect(chain.ranges[0][0]).toBe(101n);
  });

  it('does not advance its cursor when the scan failed', async () => {
    chain.failNextLogs = new Error('rpc went away');

    await expect(watcher.scanOnce()).rejects.toThrow(/rpc/);
    const attempted = chain.ranges[0][0];

    chain.ranges = [];
    await watcher.scanOnce();
    expect(chain.ranges[0][0]).toBe(attempted);
  });

  it('walks a long gap in bounded ranges rather than one huge query', async () => {
    await watcher.resetCursorTo(0n);
    chain.finalized = 500n;
    chain.ranges = [];

    await watcher.scanOnce();

    for (const [from, to] of chain.ranges) {
      expect(to - from).toBeLessThan(50n);
    }
  });

  it('does nothing when no new block has finalized', async () => {
    await watcher.scanOnce();
    chain.ranges = [];

    const result = await watcher.scanOnce();

    expect(chain.ranges).toEqual([]);
    expect(result.credited).toEqual([]);
  });
});
