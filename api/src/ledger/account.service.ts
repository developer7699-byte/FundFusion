import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

export const DRIZZLE = Symbol('DRIZZLE');

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class AccountService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  /**
   * Resolve the wallet account for a user and asset, creating the wallet and
   * account rows if they do not exist yet.
   *
   * Two concurrent callers must converge on one row. The insert relies on the
   * `(wallet_id, asset_id)` unique index to arbitrate rather than a read-then-
   * write, which would race.
   */
  async ensureAccount(userId: string, assetSymbol: string): Promise<string> {
    const [assetRow] = await this.db
      .select({ id: schema.asset.id })
      .from(schema.asset)
      .where(eq(schema.asset.symbol, assetSymbol))
      .limit(1);

    if (!assetRow) {
      throw new Error(`Unknown asset "${assetSymbol}".`);
    }

    await this.db
      .insert(schema.wallet)
      .values({ userId, label: 'PRIMARY' })
      .onConflictDoNothing();

    const [walletRow] = await this.db
      .select({ id: schema.wallet.id })
      .from(schema.wallet)
      .where(
        and(
          eq(schema.wallet.userId, userId),
          eq(schema.wallet.label, 'PRIMARY'),
        ),
      )
      .limit(1);

    await this.db
      .insert(schema.walletAccount)
      .values({ walletId: walletRow.id, assetId: assetRow.id })
      .onConflictDoNothing();

    const [accountRow] = await this.db
      .select({ id: schema.walletAccount.id })
      .from(schema.walletAccount)
      .where(
        and(
          eq(schema.walletAccount.walletId, walletRow.id),
          eq(schema.walletAccount.assetId, assetRow.id),
        ),
      )
      .limit(1);

    return accountRow.id;
  }

  /** Lock an account row for the life of the surrounding transaction. */
  async lockForUpdate(tx: Db, accountId: string): Promise<void> {
    await tx.execute(
      sql`SELECT id FROM wallet_account WHERE id = ${accountId} FOR UPDATE`,
    );
  }
}
