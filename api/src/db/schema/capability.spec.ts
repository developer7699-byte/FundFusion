import { Client } from 'pg';

const TEST_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://localhost:5432/fundfusion_test';

let client: Client;

beforeAll(async () => {
  client = new Client({ connectionString: TEST_URL });
  await client.connect();
}, 30000);

afterAll(async () => {
  await client?.end();
});

async function enumValues(name: string): Promise<string[]> {
  const res = await client.query(
    `SELECT e.enumlabel FROM pg_type t
       JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = $1 ORDER BY e.enumsortorder`,
    [name],
  );
  return res.rows.map((r: { enumlabel: string }) => r.enumlabel);
}

async function columnNames(table: string): Promise<string[]> {
  const res = await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  return res.rows.map((r: { column_name: string }) => r.column_name);
}

async function hasUniqueOn(table: string, column: string): Promise<boolean> {
  const res = await client.query(
    `SELECT 1
       FROM pg_index i
       JOIN pg_class c ON c.oid = i.indrelid
       JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
      WHERE c.relname = $1 AND a.attname = $2 AND i.indisunique
      LIMIT 1`,
    [table, column],
  );
  return (res.rowCount ?? 0) > 0;
}

describe('roles (PRD §9.2)', () => {
  it('role_name carries the v1 admin roles', async () => {
    expect(await enumValues('role_name')).toEqual(
      expect.arrayContaining([
        'CUSTOMER',
        'MERCHANT',
        'SUPPORT',
        'SUPER_ADMIN',
      ]),
    );
  });
});

describe('capability registry (PRD §9.3)', () => {
  it('capability_key carries the v1 capabilities', async () => {
    expect(await enumValues('capability_key')).toEqual(
      expect.arrayContaining([
        'DEPOSIT',
        'WITHDRAW',
        'SEND',
        'P2P_BUY',
        'P2P_SELL',
      ]),
    );
  });

  // PRD §18: gift cards and utilities re-enter by REGISTERING a capability,
  // not by a migration. Adding them now would defeat the registry's purpose.
  it('does not pre-declare the deferred capabilities', async () => {
    const values = await enumValues('capability_key');
    expect(values).not.toContain('GIFT_CARD');
    expect(values).not.toContain('UTILITY');
  });

  it('grant_effect distinguishes allow from deny', async () => {
    expect(await enumValues('grant_effect')).toEqual(
      expect.arrayContaining(['ALLOW', 'DENY']),
    );
  });

  it('a user override records actor, reason and optional expiry', async () => {
    expect(await columnNames('user_capability')).toEqual(
      expect.arrayContaining(['effect', 'actor_id', 'reason', 'expires_at']),
    );
  });

  it('a role capability maps a role to a capability', async () => {
    expect(await columnNames('role_capability')).toEqual(
      expect.arrayContaining(['role', 'capability']),
    );
  });
});

describe('phone gate and admin MFA (PRD §9.1, §9.4)', () => {
  it('user carries phone verification and MFA columns', async () => {
    expect(await columnNames('user')).toEqual(
      expect.arrayContaining([
        'phone_verified_at',
        'mfa_secret',
        'mfa_enrolled_at',
      ]),
    );
  });

  // One verified phone equals exactly one account — this is what stops one
  // person farming accounts to self-trade.
  it('one phone can belong to only one account', async () => {
    expect(await hasUniqueOn('user', 'phone')).toBe(true);
  });
});
