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
    const order = (await columns('p2p_order')).find(
      (c) => c.column_name === 'inr_amount',
    );
    expect([order?.numeric_precision, order?.numeric_scale]).toEqual([20, 2]);
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
