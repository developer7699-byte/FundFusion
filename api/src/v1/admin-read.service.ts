import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../ledger/account.service';

type Db = NodePgDatabase<typeof schema>;

/** A page size that protects the server from a question nobody meant to ask. */
const MAX_ROWS = 200;

/**
 * What an administrator can look at (PRD §9.2).
 *
 * Read-only by construction: nothing here writes, so a SUPPORT account —
 * which may reach every one of these — cannot move money through them. That
 * separation is the cheap and essential one, and it is enforced by this
 * service having no mutating method rather than by remembering not to call
 * one.
 */
@Injectable()
export class AdminReadService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async users(limit = 100) {
    return this.db
      .select({
        id: schema.user.id,
        email: schema.user.email,
        displayName: schema.user.displayName,
        status: schema.user.status,
        emailVerifiedAt: schema.user.emailVerifiedAt,
        mfaEnrolledAt: schema.user.mfaEnrolledAt,
        createdAt: schema.user.createdAt,
      })
      .from(schema.user)
      .orderBy(desc(schema.user.createdAt))
      .limit(page(limit));
  }

  async orders(limit = 100) {
    const rows = await this.db
      .select({
        order: schema.p2pOrder,
        quote: schema.p2pQuote,
        assignment: schema.merchantAssignment,
      })
      .from(schema.p2pOrder)
      .innerJoin(
        schema.p2pQuote,
        eq(schema.p2pQuote.id, schema.p2pOrder.quoteId),
      )
      .leftJoin(
        schema.merchantAssignment,
        eq(schema.merchantAssignment.orderId, schema.p2pOrder.id),
      )
      .orderBy(desc(schema.p2pOrder.createdAt))
      .limit(page(limit));

    return rows.map((r) => ({
      orderId: r.order.id,
      status: r.order.status,
      side: r.quote.side,
      usdtAmount: r.quote.usdtAmount,
      inrAmount: r.quote.inrAmount,
      customerRate: r.quote.customerRate,
      platformFeeUsdt: r.quote.platformFeeUsdt,
      customerId: r.order.customerId,
      merchantUserId: r.assignment?.userId ?? null,
      broadcastAt: r.order.broadcastAt,
      createdAt: r.order.createdAt,
    }));
  }

  /**
   * The journal, newest first. Entries rather than balances: a balance is
   * derived, and an admin reading this is usually asking how it got there.
   */
  async ledger(limit = 100) {
    const rows = await this.db
      .select({
        entry: schema.ledgerEntry,
        transaction: schema.ledgerTransaction,
      })
      .from(schema.ledgerEntry)
      .innerJoin(
        schema.ledgerTransaction,
        eq(schema.ledgerTransaction.id, schema.ledgerEntry.transactionId),
      )
      .orderBy(desc(schema.ledgerTransaction.createdAt))
      .limit(page(limit));

    return rows.map((r) => ({
      id: r.entry.id,
      transactionId: r.entry.transactionId,
      accountId: r.entry.accountId,
      accountType: r.entry.accountType,
      direction: r.entry.direction,
      amount: r.entry.amount,
      assetSymbol: r.entry.assetSymbol,
      memo: r.transaction.memo,
      idempotency: r.transaction.idempotency,
      at: r.transaction.createdAt,
    }));
  }

  /** The money metrics PRD §13.3 asks for, not generic APM. */
  async overview() {
    const orders = await this.db.execute<{ status: string; n: number }>(
      sql`SELECT status::text AS status, count(*)::int AS n FROM p2p_order GROUP BY status`,
    );
    const escrow = await this.db.execute<{ total: string }>(sql`
      SELECT COALESCE(
               SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE -amount END),
               0
             )::numeric(38,18)::text AS total
        FROM ledger_entry WHERE account_type = 'LOCKED'
    `);
    const bonded = await this.db.execute<{ total: string }>(sql`
      SELECT COALESCE(
               SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE -amount END),
               0
             )::numeric(38,18)::text AS total
        FROM ledger_entry WHERE account_type = 'BONDED'
    `);
    const revenue = await this.db.execute<{ total: string }>(sql`
      SELECT COALESCE(
               SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE -amount END),
               0
             )::numeric(38,18)::text AS total
        FROM ledger_entry WHERE account_type = 'REVENUE'
    `);
    const disputes = await this.db.execute<{ n: number }>(
      sql`SELECT count(*)::int AS n FROM dispute WHERE status IN ('OPEN','UNDER_REVIEW')`,
    );

    return {
      ordersByStatus: Object.fromEntries(
        orders.rows.map((r) => [r.status, Number(r.n)]),
      ),
      escrowLockedUsdt: escrow.rows[0].total,
      bondedUsdt: bonded.rows[0].total,
      revenueUsdt: revenue.rows[0].total,
      openDisputes: Number(disputes.rows[0]?.n ?? 0),
    };
  }
}

function page(limit: number): number {
  return Math.min(Math.max(1, Math.floor(limit)), MAX_ROWS);
}
