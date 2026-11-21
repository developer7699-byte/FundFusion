import { AccountService } from '../ledger/account.service';
import { BalanceService } from '../ledger/balance.service';
import { PostingService } from '../ledger/posting.service';
import { makeTestDb, seedUser, type TestDb } from '../ledger/test-db';
import { fixedSettings } from '../settings/platform-settings';
import type { ChainClient } from './chain.types';
import { ReconciliationService } from './reconciliation.service';

const NETWORK = 'BSC_TESTNET';
const TOKEN = '0x1111111111111111111111111111111111111111';
const HOT = '0x356545e8Cc9aB65B7f6BA2B761653CeA86a8317A';
const DEPOSIT = '0x4b7877dD11Ef2d15297Cb0a013F8513d8D9EBf3C';

/** Only the balance reads matter here; the rest of the chain is not consulted. */
class FakeChain implements ChainClient {
  balances = new Map<string, string>();

  assertNetwork(): Promise<void> {
    return Promise.resolve();
  }
  finalizedBlockNumber(): Promise<bigint> {
    return Promise.resolve(100n);
  }
  transferLogs(): Promise<never[]> {
    return Promise.resolve([]);
  }
  nativeBalance(): Promise<string> {
    return Promise.resolve('0');
  }
  tokenBalance(_token: string, address: string): Promise<string> {
    return Promise.resolve(this.balances.get(address.toLowerCase()) ?? '0');
  }
}

let t: TestDb;
let accounts: AccountService;
let posting: PostingService;
let chain: FakeChain;
let reconcile: ReconciliationService;
let accountId: string;
let networkId: string;

beforeAll(() => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
  posting = new PostingService(t.db, accounts, new BalanceService(t.db));
}, 30000);

beforeEach(async () => {
  await t.reset();
  const asset = await t.pool.query(
    `INSERT INTO asset (symbol, name, decimals, kind)
     VALUES ('USDT', 'Tether USD', 18, 'CRYPTO') RETURNING id`,
  );
  const net = await t.pool.query(
    `INSERT INTO blockchain_network (asset_id, code, name)
     VALUES ($1, $2, 'BSC Testnet') RETURNING id`,
    [(asset.rows[0] as { id: string }).id, NETWORK],
  );
  networkId = (net.rows[0] as { id: string }).id;

  const userId = await seedUser(t.pool, 'holder@example.test');
  accountId = await accounts.ensureAccount(userId, 'USDT');
  await t.pool.query(
    `INSERT INTO wallet_address (account_id, network_id, address, derivation_index, is_default)
     VALUES ($1, $2, $3, 0, true)`,
    [accountId, networkId, DEPOSIT],
  );

  chain = new FakeChain();
  reconcile = new ReconciliationService(t.db, chain, fixedSettings(), {
    tokenAddress: TOKEN,
    networkCode: NETWORK,
    hotWalletAddress: HOT,
  });
});

afterAll(async () => {
  await t.close();
});

async function credit(amount: string, key = 'dep-1') {
  await posting.post({
    idempotencyKey: key,
    memo: 'deposit',
    lines: [
      {
        accountId,
        accountType: 'AVAILABLE',
        direction: 'CREDIT',
        amount,
        assetSymbol: 'USDT',
      },
      {
        accountType: 'EXTERNAL',
        direction: 'DEBIT',
        amount,
        assetSymbol: 'USDT',
      },
    ],
  });
}

describe('ledger against the chain (PRD §13.1)', () => {
  it('is clean when the ledger matches on-chain custody', async () => {
    await credit('100');
    chain.balances.set(HOT.toLowerCase(), '100');

    const report = await reconcile.check();

    expect(report.ledgerUsdt).toBe('100.000000000000000000');
    expect(report.onChainUsdt).toBe('100.000000000000000000');
    expect(report.clean).toBe(true);
  });

  it('counts unswept deposit addresses as custody too', async () => {
    await credit('100');
    chain.balances.set(DEPOSIT.toLowerCase(), '100');

    const report = await reconcile.check();

    expect(report.onChainUsdt).toBe('100.000000000000000000');
    expect(report.clean).toBe(true);
  });

  /**
   * The direction that matters. Less on chain than the ledger promises means
   * the platform cannot honour every balance it is showing — a missed credit
   * reversal, or an unauthorised withdrawal.
   */
  it('reports drift when the chain holds less than the ledger', async () => {
    await credit('100');
    chain.balances.set(HOT.toLowerCase(), '60');

    const report = await reconcile.check();

    expect(report.clean).toBe(false);
    expect(report.drift).toBe('-40.000000000000000000');
  });

  /** More on chain than the ledger knows about is a deposit nobody credited. */
  it('reports drift when the chain holds more than the ledger', async () => {
    await credit('100');
    chain.balances.set(HOT.toLowerCase(), '140');

    const report = await reconcile.check();

    expect(report.clean).toBe(false);
    expect(report.drift).toBe('40.000000000000000000');
  });

  it('tolerates drift within dust', async () => {
    await credit('100');
    chain.balances.set(HOT.toLowerCase(), '99.999999');

    const report = await reconcile.check();

    expect(report.clean).toBe(true);
  });

  /**
   * A withdrawal takes money off both sides at once: the ledger debits what
   * left, and the chain holds that much less.
   */
  it('stays clean across a withdrawal', async () => {
    await credit('100');
    await posting.postDebit(accountId, 'AVAILABLE', '40', {
      idempotencyKey: 'w-1',
      memo: 'withdrawal',
      lines: [
        {
          accountId,
          accountType: 'AVAILABLE',
          direction: 'DEBIT',
          amount: '40',
          assetSymbol: 'USDT',
        },
        {
          accountType: 'EXTERNAL',
          direction: 'CREDIT',
          amount: '39',
          assetSymbol: 'USDT',
        },
        {
          accountType: 'REVENUE',
          direction: 'CREDIT',
          amount: '1',
          assetSymbol: 'USDT',
        },
      ],
    });
    chain.balances.set(HOT.toLowerCase(), '61');

    const report = await reconcile.check();

    expect(report.ledgerUsdt).toBe('61.000000000000000000');
    expect(report.clean).toBe(true);
  });
});

describe('journals that do not balance (PRD §13.1 check 1)', () => {
  /**
   * The posting service refuses to write one, so this is forced in raw SQL.
   * The check exists for the entry that got there another way — a migration,
   * a manual fix, a bug in a future posting path.
   */
  it('names a journal that does not sum to zero', async () => {
    await credit('100');
    const tx = await t.pool.query(
      `INSERT INTO ledger_transaction (reference, memo, idempotency, fingerprint)
       VALUES ('bad', 'hand written', 'bad-1', 'x') RETURNING id`,
    );
    const txId = (tx.rows[0] as { id: string }).id;
    await t.pool.query(
      `INSERT INTO ledger_entry (transaction_id, account_id, account_type, direction, amount, asset_symbol)
       VALUES ($1, $2, 'AVAILABLE', 'CREDIT', 5, 'USDT')`,
      [txId, accountId],
    );
    chain.balances.set(HOT.toLowerCase(), '100');

    const report = await reconcile.check();

    expect(report.unbalancedJournals).toContain(txId);
    expect(report.clean).toBe(false);
  });

  it('finds none when every journal balances', async () => {
    await credit('100');
    chain.balances.set(HOT.toLowerCase(), '100');

    expect((await reconcile.check()).unbalancedJournals).toEqual([]);
  });
});
