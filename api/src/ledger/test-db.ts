import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { Pool, types } from 'pg';
import * as schema from '../db/schema';

/**
 * PRD §13.4: never mock PostgreSQL in a ledger test. The behaviour under test
 * IS the database — its row locking, its NUMERIC scale, its unique indexes.
 * A mock would only prove the mock agrees with itself.
 */
types.setTypeParser(types.builtins.NUMERIC, (v: string) => v);
types.setTypeParser(types.builtins.INT8, (v: string) => v);

const TEST_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://localhost:5432/fundfusion_test';

export interface TestDb {
  db: NodePgDatabase<typeof schema>;
  pool: Pool;
  reset: () => Promise<void>;
  close: () => Promise<void>;
}

export function makeTestDb(): TestDb {
  const pool = new Pool({ connectionString: TEST_URL });
  const db = drizzle(pool, { schema, casing: 'snake_case' });

  return {
    db,
    pool,
    // TRUNCATE ... CASCADE resets identity and foreign keys in one statement,
    // so tests do not depend on delete ordering.
    reset: async () => {
      await pool.query(`
        TRUNCATE TABLE
          audit_log, user_capability, role_capability, session, otp_challenge,
          ledger_entry, ledger_transaction,
          wallet_address, wallet_account, wallet,
          blockchain_network, asset,
          user_role, "user", role
        RESTART IDENTITY CASCADE
      `);
    },
    close: async () => {
      await pool.end();
    },
  };
}

/** A user row is the minimum context a wallet needs. */
export async function seedUser(
  pool: Pool,
  email = 'ledger@example.test',
): Promise<string> {
  const res = await pool.query(
    `INSERT INTO "user" (email, password_hash, display_name, status)
     VALUES ($1, 'x', 'Ledger Test', 'ACTIVE') RETURNING id`,
    [email],
  );
  return (res.rows[0] as { id: string }).id;
}

export async function seedAsset(pool: Pool, symbol = 'USDT'): Promise<string> {
  const res = await pool.query(
    `INSERT INTO asset (symbol, name, decimals, kind)
     VALUES ($1, 'Tether USD', 18, 'CRYPTO') RETURNING id`,
    [symbol],
  );
  return (res.rows[0] as { id: string }).id;
}
