import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authoritativeSide, quoteSide } from './enums';
import { user } from './identity';
import { inr, usdt } from './money-columns';

/**
 * An immutable price snapshot (PRD §7).
 *
 * **The snapshot is law.** An order settles at its quoted rate however far the
 * market has moved since. No historical order is ever recomputed at a current
 * rate — not for a receipt, not for a report, not for a dispute. The table is
 * therefore append-only, enforced by a trigger exactly as `audit_log` is.
 */
export const p2pQuote = pgTable('p2p_quote', {
  id: uuid('id').primaryKey().defaultRandom(),
  /**
   * No cascade. A quote is a financial record: it outlives the account that
   * asked for it, and the immutability trigger would refuse the cascaded
   * delete anyway — leaving a user row that could never be removed.
   */
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id),
  side: quoteSide('side').notNull(),
  /** The mid-market rate the customer rate was derived from. */
  referenceRate: inr('reference_rate').notNull(),
  customerRate: inr('customer_rate').notNull(),
  markupBps: integer('markup_bps').notNull(),
  usdtAmount: usdt('usdt_amount').notNull(),
  inrAmount: inr('inr_amount').notNull(),
  authoritativeSide: authoritativeSide('authoritative_side').notNull(),
  /**
   * The platform's cut, in the asset the platform custodies (PRD §6.3, §6.4).
   * Snapshotted here because the merchant must see it before accepting, and
   * because settlement posts this figure, not a recomputed one.
   */
  platformFeeUsdt: usdt('platform_fee_usdt').notNull(),
  /** Which feed priced this, or `admin-override`. */
  provider: text('provider').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
