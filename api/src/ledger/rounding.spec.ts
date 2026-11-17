import { AccountService } from './account.service';
import { BalanceService } from './balance.service';
import { PostingService } from './posting.service';
import { makeTestDb, seedAsset, seedUser, type TestDb } from './test-db';
import type { PostingRequest } from './ledger.types';

let t: TestDb;
let accounts: AccountService;
let posting: PostingService;
let accountId: string;

beforeAll(() => {
  t = makeTestDb();
  accounts = new AccountService(t.db);
  posting = new PostingService(t.db, accounts, new BalanceService(t.db));
}, 30000);

beforeEach(async () => {
  await t.reset();
  await seedAsset(t.pool);
  const userId = await seedUser(t.pool);
  accountId = await accounts.ensureAccount(userId, 'USDT');
});

afterAll(async () => {
  await t.close();
});

async function sumOfEntries(txId: string): Promise<string> {
  const r = await t.pool.query(
    `SELECT COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END),0)::text AS s
       FROM ledger_entry WHERE transaction_id = $1`,
    [txId],
  );
  return (r.rows[0] as { s: string }).s;
}

async function legsAt(txId: string, accountType: string) {
  const r = await t.pool.query(
    `SELECT amount::text AS amount, direction FROM ledger_entry
      WHERE transaction_id = $1 AND account_type = $2`,
    [txId, accountType],
  );
  return r.rows as { amount: string; direction: string }[];
}

/**
 * The real shape of a rounded payout: the source is debited the FULL amount,
 * the customer is credited the ROUNDED amount, and the difference is the
 * residue. The base journal is therefore short by exactly the residue, and the
 * ROUNDING leg is what completes it.
 */
function payout(source: string, paidToCustomer: string): PostingRequest {
  return {
    idempotencyKey: `payout-${source}-${paidToCustomer}`,
    memo: 'payout',
    lines: [
      { accountId, accountType: 'AVAILABLE', direction: 'CREDIT', amount: paidToCustomer, assetSymbol: 'USDT' },
      { accountType: 'EXTERNAL', direction: 'DEBIT', amount: source, assetSymbol: 'USDT' },
    ],
  };
}

describe('ROUNDING account (PRD §5.1)', () => {
  it('a residue posts to ROUNDING so the journal still sums to zero', async () => {
    const { id } = await posting.postWithRounding(payout('9700.005', '9700.00'), {
      amount: '0.005',
      assetSymbol: 'USDT',
    });
    expect(await sumOfEntries(id)).toBe('0.000000000000000000');
    const legs = await legsAt(id, 'ROUNDING');
    expect(legs).toHaveLength(1);
    expect(legs[0].amount).toBe('0.005000000000000000');
  });

  it('a zero residue adds no ROUNDING leg', async () => {
    const { id } = await posting.postWithRounding(payout('9700.00', '9700.00'), {
      amount: '0',
      assetSymbol: 'USDT',
    });
    expect(await legsAt(id, 'ROUNDING')).toHaveLength(0);
    expect(await sumOfEntries(id)).toBe('0.000000000000000000');
  });

  it('a negative residue (customer payable rounded up) also balances', async () => {
    const { id } = await posting.postWithRounding(payout('9700.00', '9700.009'), {
      amount: '-0.009',
      assetSymbol: 'USDT',
    });
    expect(await sumOfEntries(id)).toBe('0.000000000000000000');
    const legs = await legsAt(id, 'ROUNDING');
    expect(legs[0].direction).toBe('DEBIT');
  });

  // PRD §15 item 1: 100 USDT at ₹97.00 yields 97.00 USDT to the merchant and
  // 3.00 USDT to platform revenue. The platform's cut comes from an asset it
  // custodies — never credit the merchant the full 100.
  it('the sell-side worked example from PRD §6.3 balances exactly', async () => {
    const merchantId = await accounts.ensureAccount(
      await seedUser(t.pool, 'merchant@example.test'),
      'USDT',
    );
    const { id } = await posting.post({
      idempotencyKey: 'sell-settlement',
      memo: 'sell settlement 100 USDT @ 97.00',
      lines: [
        { accountId, accountType: 'LOCKED', direction: 'DEBIT', amount: '100', assetSymbol: 'USDT' },
        { accountId: merchantId, accountType: 'AVAILABLE', direction: 'CREDIT', amount: '97', assetSymbol: 'USDT' },
        { accountType: 'REVENUE', direction: 'CREDIT', amount: '3', assetSymbol: 'USDT' },
      ],
    });
    expect(await sumOfEntries(id)).toBe('0.000000000000000000');
    expect((await legsAt(id, 'REVENUE'))[0].amount).toBe('3.000000000000000000');
  });
});
