import { Client } from 'pg';

/**
 * PRD §13.4: never mock PostgreSQL in a ledger test. The behaviour under test
 * is what the database actually declares, so this runs the generated migration
 * against a real server and reads information_schema back.
 */
const TEST_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://localhost:5432/fundfusion_test';

let client: Client;

async function columns(table: string) {
  const res = await client.query(
    `SELECT column_name, data_type, numeric_precision, numeric_scale
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  return res.rows as {
    column_name: string;
    data_type: string;
    numeric_precision: number | null;
    numeric_scale: number | null;
  }[];
}

async function tableNames(): Promise<string[]> {
  const res = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
  );
  return res.rows.map((r: { table_name: string }) => r.table_name);
}

async function enumValues(name: string): Promise<string[]> {
  const res = await client.query(
    `SELECT e.enumlabel FROM pg_type t
       JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = $1 ORDER BY e.enumsortorder`,
    [name],
  );
  return res.rows.map((r: { enumlabel: string }) => r.enumlabel);
}

async function numericColumns() {
  const res = await client.query(
    `SELECT table_name, column_name, numeric_precision, numeric_scale
       FROM information_schema.columns
      WHERE table_schema = 'public' AND data_type = 'numeric'`,
  );
  return res.rows as {
    table_name: string;
    column_name: string;
    numeric_precision: number;
    numeric_scale: number;
  }[];
}

beforeAll(async () => {
  client = new Client({ connectionString: TEST_URL });
  await client.connect();
}, 30000);

afterAll(async () => {
  await client?.end();
});

describe('money precision (PRD §5.1)', () => {
  it('every numeric column is either USDT(38,18) or INR(20,2)', async () => {
    const cols = await numericColumns();
    expect(cols.length).toBeGreaterThan(0);
    const wrong = cols
      .filter(
        (c) =>
          !(c.numeric_precision === 38 && c.numeric_scale === 18) &&
          !(c.numeric_precision === 20 && c.numeric_scale === 2),
      )
      .map(
        (c) =>
          `${c.table_name}.${c.column_name}(${c.numeric_precision},${c.numeric_scale})`,
      );
    expect(wrong).toEqual([]);
  });

  it('usdt amounts are NUMERIC(38,18)', async () => {
    const entry = (await columns('ledger_entry')).find(
      (c) => c.column_name === 'amount',
    );
    expect([entry?.numeric_precision, entry?.numeric_scale]).toEqual([38, 18]);
  });

  it('inr amounts are NUMERIC(20,2)', async () => {
    const quoted = (await columns('p2p_quote')).find(
      (c) => c.column_name === 'inr_amount',
    );
    expect([quoted?.numeric_precision, quoted?.numeric_scale]).toEqual([20, 2]);
  });
});

describe('ledger shape (PRD §5)', () => {
  it('wallet_account carries no balance column', async () => {
    const names = (await columns('wallet_account')).map((c) => c.column_name);
    expect(names).not.toContain('available');
    expect(names).not.toContain('locked');
  });

  it('ledger_account_type has every bucket the PRD names', async () => {
    const values = await enumValues('ledger_account_type');
    expect(values).toEqual(
      expect.arrayContaining([
        'AVAILABLE',
        'LOCKED',
        'BONDED',
        'PENDING',
        'ROUNDING',
        'REVENUE',
      ]),
    );
  });
});

describe('scope (PRD §3)', () => {
  it('no gift card or utility table exists', async () => {
    const names = await tableNames();
    const offenders = names.filter((n) => /gift|utility/i.test(n));
    expect(offenders).toEqual([]);
  });

  it('the core tables exist', async () => {
    const names = await tableNames();
    expect(names).toEqual(
      expect.arrayContaining([
        'user',
        'wallet',
        'wallet_account',
        'ledger_transaction',
        'ledger_entry',
        'p2p_order',
        'escrow',
        'audit_log',
      ]),
    );
  });
});

/**
 * PRD §6.10. A dispute is a core operational surface, not an edge case, and
 * its four outcomes are a closed list the database enforces.
 */
describe('dispute', () => {
  /**
   * `ticket_id` pointed at `support_ticket`, which M6 owns. A dispute that
   * cannot exist without a support ticket cannot exist in M5 at all.
   */
  it('can exist without a support ticket', async () => {
    const [ticket] = (await columns('dispute')).filter(
      (c) => c.column_name === 'ticket_id',
    );
    const nullable = await client.query(
      `SELECT is_nullable FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'dispute'
          AND column_name = 'ticket_id'`,
    );

    expect(ticket).toBeDefined();
    expect((nullable.rows[0] as { is_nullable: string }).is_nullable).toBe(
      'YES',
    );
  });

  it('records the outcome, who decided it, and why', async () => {
    const names = (await columns('dispute')).map((c) => c.column_name);

    expect(names).toEqual(
      expect.arrayContaining([
        'outcome',
        'opened_by',
        'resolved_by',
        'resolved_at',
        'resolution_reason',
        'counterparty_amount',
        'penalty_amount',
      ]),
    );
  });

  /** Amounts here settle USDT, so they carry the same scale as the ledger. */
  it('holds its amounts at the ledger scale', async () => {
    const amounts = (await columns('dispute')).filter((c) =>
      ['counterparty_amount', 'penalty_amount'].includes(c.column_name),
    );

    expect(amounts).toHaveLength(2);
    for (const column of amounts) {
      expect(column.data_type).toBe('numeric');
      expect(column.numeric_precision).toBe(38);
      expect(column.numeric_scale).toBe(18);
    }
  });

  /** §6.10's list is closed. A fifth outcome is a schema change, not a typo. */
  it('refuses an outcome outside the closed list', async () => {
    const values = await client.query(
      `SELECT e.enumlabel FROM pg_enum e
         JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'dispute_outcome'
        ORDER BY e.enumsortorder`,
    );

    expect(values.rows.map((r: { enumlabel: string }) => r.enumlabel)).toEqual([
      'RELEASE',
      'REFUND',
      'SPLIT',
      'REFUND_WITH_PENALTY',
    ]);
  });
});
