import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from './account.service';
import { BUCKETS, type Bucket } from './ledger.types';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class BalanceService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  /**
   * PRD §5 rule 1: balances are derived, never stored. A credit adds, a debit
   * subtracts, and the sum is computed by PostgreSQL in NUMERIC so no
   * intermediate value ever passes through a JavaScript number.
   */
  async balance(
    accountId: string,
    bucket: Bucket,
    db: Db = this.db,
  ): Promise<string> {
    const res = await db.execute<{ balance: string }>(sql`
      SELECT COALESCE(
               SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE -amount END),
               0
             )::numeric(38,18)::text AS balance
        FROM ledger_entry
       WHERE account_id = ${accountId}
         AND account_type = ${bucket}
    `);
    return res.rows[0].balance;
  }

  async balances(
    accountId: string,
    db: Db = this.db,
  ): Promise<Record<Bucket, string>> {
    const out = {} as Record<Bucket, string>;
    for (const bucket of BUCKETS) {
      out[bucket] = await this.balance(accountId, bucket, db);
    }
    return out;
  }
}
