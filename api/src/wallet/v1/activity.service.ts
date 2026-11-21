import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { DRIZZLE } from '../../ledger/account.service';

type Db = NodePgDatabase<typeof schema>;

/** A page size that protects the server from a question nobody meant to ask. */
const MAX_ROWS = 200;

/**
 * What a wallet screen reads (PRD §13.5).
 *
 * Every row is one ledger entry belonging to this user, because the ledger is
 * the only truth (PRD §5 rule 1) — this service derives a feed from it rather
 * than keeping a second history that could disagree with the journals.
 *
 * Read-only, and scoped by a join to the caller's own wallet. The scoping is
 * in the join rather than in a filter applied afterwards, so a future caller
 * cannot ask for the unscoped version by passing a different argument.
 */
@Injectable()
export class ActivityService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async forUser(userId: string, limit = 50): Promise<ActivityRow[]> {
    const rows = await this.db
      .select({
        entry: schema.ledgerEntry,
        memo: schema.ledgerTransaction.memo,
        at: schema.ledgerTransaction.createdAt,
      })
      .from(schema.ledgerEntry)
      .innerJoin(
        schema.ledgerTransaction,
        eq(schema.ledgerTransaction.id, schema.ledgerEntry.transactionId),
      )
      .innerJoin(
        schema.walletAccount,
        eq(schema.walletAccount.id, schema.ledgerEntry.accountId),
      )
      .innerJoin(
        schema.wallet,
        and(
          eq(schema.wallet.id, schema.walletAccount.walletId),
          eq(schema.wallet.userId, userId),
        ),
      )
      .orderBy(
        desc(schema.ledgerTransaction.createdAt),
        desc(schema.ledgerEntry.createdAt),
      )
      .limit(page(limit));

    return rows.map((r) => ({
      id: r.entry.id,
      kind: kindOf(r.memo),
      bucket: r.entry.accountType,
      direction: r.entry.direction,
      amount: r.entry.amount,
      assetSymbol: r.entry.assetSymbol,
      memo: r.memo,
      at: r.at,
    }));
  }
}

export interface ActivityRow {
  id: string;
  kind: ActivityKind;
  bucket: string;
  direction: 'DEBIT' | 'CREDIT';
  /** A string at full scale. A JavaScript number never holds money (PRD §5.1). */
  amount: string;
  assetSymbol: string;
  memo: string;
  at: Date;
}

export type ActivityKind =
  | 'DEPOSIT'
  | 'REVERSAL'
  | 'WITHDRAWAL'
  | 'ESCROW'
  | 'SETTLEMENT'
  | 'DISPUTE'
  | 'OTHER';

/**
 * The posting services already say what a journal is for, in its memo. Reading
 * the first word is what turns that into a label a screen can group by — the
 * alternative is a `kind` column on `ledger_transaction`, which would be a
 * second thing to keep true about a journal that already says it.
 */
function kindOf(memo: string): ActivityKind {
  const first = memo.split(' ', 1)[0].toLowerCase();
  switch (first) {
    case 'deposit':
      return 'DEPOSIT';
    case 'reversal':
      return 'REVERSAL';
    case 'withdrawal':
    case 'rejected':
      return 'WITHDRAWAL';
    case 'escrow':
    case 'merchant':
      return 'ESCROW';
    case 'settlement':
      return 'SETTLEMENT';
    case 'dispute':
      return 'DISPUTE';
    default:
      return 'OTHER';
  }
}

function page(limit: number): number {
  return Math.min(Math.max(1, Math.floor(limit)), MAX_ROWS);
}
