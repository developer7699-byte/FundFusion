import { AuditService } from '../audit/audit.service';
import { AccountService } from '../ledger/account.service';
import { BalanceService } from '../ledger/balance.service';
import { PostingService } from '../ledger/posting.service';
import {
  makeTestDb,
  seedAsset,
  seedUser,
  type TestDb,
} from '../ledger/test-db';
import { ReversalService } from './reversal.service';

let t: TestDb;
let accounts: AccountService;
let balances: BalanceService;
let posting: PostingService;
let reversals: ReversalService;
let accountId: string;
let networkId: string;
let adminId: string;
let depositId: string;

beforeAll(() => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
  balances = new BalanceService(t.db);
  posting = new PostingService(t.db, accounts, balances);
}, 30000);

beforeEach(async () => {
  await t.reset();
  const assetId = await seedAsset(t.pool);
  const n = await t.pool.query<{ id: string }>(
    `INSERT INTO blockchain_network (asset_id, code, name)
     VALUES ($1, 'BSC_TESTNET', 'BSC Testnet') RETURNING id`,
    [assetId],
  );
  networkId = n.rows[0].id;
  const userId = await seedUser(t.pool, 'depositor@example.test');
  adminId = await seedUser(t.pool, 'admin@example.test');
  accountId = await accounts.ensureAccount(userId, 'USDT');
  reversals = new ReversalService(
    t.db,
    posting,
    balances,
    new AuditService(t.db),
  );
  depositId = await credited('100');
});

afterAll(async () => {
  await t.close();
});

/** A deposit the watcher already credited. */
async function credited(amount: string, txHash = `0x${'a'.repeat(64)}`) {
  await posting.post({
    idempotencyKey: `deposit:${txHash}:0`,
    memo: `deposit ${txHash}`,
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
  const r = await t.pool.query<{ id: string }>(
    `INSERT INTO deposit (account_id, network_id, amount, status, tx_hash, log_index)
     VALUES ($1, $2, $3, 'CREDITED', $4, 0) RETURNING id`,
    [accountId, networkId, amount, txHash],
  );
  return r.rows[0].id;
}

function why(reason = 'block 42 was reorged out') {
  return { actorId: adminId, reason };
}

/**
 * PRD §8.2 keeps this path even though finalized blocks cannot reorg short of
 * a Byzantine attack: a custodial ledger should be able to reverse a credit,
 * and retrofitting that under pressure after an incident is exactly the wrong
 * time to write it.
 */
describe('reversing a credited deposit', () => {
  it('reverses by compensating journal, never by deleting the original', async () => {
    await reversals.reverse(depositId, why());

    const r = await t.pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM ledger_transaction WHERE idempotency LIKE 'deposit:%'`,
    );
    expect(r.rows[0].n).toBe(1);
    expect(await balances.balance(accountId, 'AVAILABLE')).toBe(
      '0.000000000000000000',
    );
  });

  /** Review Focus #5. */
  it('returns the exact amount to the bucket it credited', async () => {
    const other = await credited('7.5', `0x${'b'.repeat(64)}`);

    await reversals.reverse(other, why());

    expect(await balances.balance(accountId, 'AVAILABLE')).toBe(
      '100.000000000000000000',
    );
    expect(await balances.balance(accountId, 'LOCKED')).toBe(
      '0.000000000000000000',
    );
  });

  it('marks the deposit reversed', async () => {
    await reversals.reverse(depositId, why());

    const r = await t.pool.query<{ status: string }>(
      `SELECT status FROM deposit WHERE id = $1`,
      [depositId],
    );
    expect(r.rows[0].status).toBe('REVERSED');
  });

  it('is idempotent', async () => {
    await reversals.reverse(depositId, why());
    await reversals.reverse(depositId, why());

    const r = await t.pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM ledger_transaction WHERE idempotency LIKE 'deposit-reversal:%'`,
    );
    expect(r.rows[0].n).toBe(1);
    expect(await balances.balance(accountId, 'AVAILABLE')).toBe(
      '0.000000000000000000',
    );
  });

  it('records who reversed it and why', async () => {
    await reversals.reverse(depositId, why('reorg at block 42'));

    const r = await t.pool.query<{
      actor_id: string;
      action: string;
      reason: string;
    }>(
      `SELECT actor_id, action, reason FROM audit_log ORDER BY created_at DESC LIMIT 1`,
    );
    expect(r.rows[0]).toEqual(
      expect.objectContaining({
        actor_id: adminId,
        action: 'DEPOSIT_REVERSED',
        reason: 'reorg at block 42',
      }),
    );
  });

  it('refuses a reversal with no reason', async () => {
    await expect(
      reversals.reverse(depositId, { actorId: adminId, reason: '  ' }),
    ).rejects.toThrow(/reason/i);
  });

  it('refuses a deposit it has never seen', async () => {
    await expect(
      reversals.reverse('00000000-0000-0000-0000-000000000000', why()),
    ).rejects.toThrow(/not exist|not found/i);
  });

  /**
   * The money is gone — spent before anyone noticed the reorg. Forcing the
   * balance negative would hide a real loss inside a user's wallet, where
   * the next deposit silently absorbs it. A human has to decide.
   */
  it('escalates rather than overdrawing when the money was already spent', async () => {
    await posting.postDebit(accountId, 'AVAILABLE', '100', {
      idempotencyKey: 'spent-it',
      memo: 'withdrawal',
      lines: [
        {
          accountId,
          accountType: 'AVAILABLE',
          direction: 'DEBIT',
          amount: '100',
          assetSymbol: 'USDT',
        },
        {
          accountType: 'EXTERNAL',
          direction: 'CREDIT',
          amount: '100',
          assetSymbol: 'USDT',
        },
      ],
    });

    await expect(reversals.reverse(depositId, why())).rejects.toThrow(
      /spent|escalat/i,
    );

    const r = await t.pool.query<{ status: string }>(
      `SELECT status FROM deposit WHERE id = $1`,
      [depositId],
    );
    expect(r.rows[0].status).toBe('REVERSAL_BLOCKED');
    expect(await balances.balance(accountId, 'AVAILABLE')).toBe(
      '0.000000000000000000',
    );
  });

  it('records the escalation so somebody can act on it', async () => {
    await posting.postDebit(accountId, 'AVAILABLE', '100', {
      idempotencyKey: 'spent-it',
      memo: 'withdrawal',
      lines: [
        {
          accountId,
          accountType: 'AVAILABLE',
          direction: 'DEBIT',
          amount: '100',
          assetSymbol: 'USDT',
        },
        {
          accountType: 'EXTERNAL',
          direction: 'CREDIT',
          amount: '100',
          assetSymbol: 'USDT',
        },
      ],
    });

    await expect(reversals.reverse(depositId, why())).rejects.toThrow();

    const r = await t.pool.query<{ action: string }>(
      `SELECT action FROM audit_log ORDER BY created_at DESC LIMIT 1`,
    );
    expect(r.rows[0].action).toBe('DEPOSIT_REVERSAL_BLOCKED');
  });
});
