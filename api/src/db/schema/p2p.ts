import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { orderStatus } from './enums';
import { inr, usdt } from './money-columns';
import { p2pQuote } from './quote';
import { merchantProfile, user } from './identity';

/**
 * An order is a confirmed quote. It carries no price of its own: the snapshot
 * it points at is law (PRD §7), and a second copy of the rate on this row is a
 * second source of truth that nothing keeps in step.
 */
export const p2pOrder = pgTable('p2p_order', {
  id: uuid('id').primaryKey().defaultRandom(),
  quoteId: uuid('quote_id')
    .notNull()
    .unique()
    .references(() => p2pQuote.id),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => user.id),
  status: orderStatus('status').notNull().default('QUOTED'),
  /**
   * When the order went out to every eligible merchant, from one place at one
   * instant (PRD §11). Paired with `merchant_assignment.accepted_at` it is the
   * only answer to the first fairness complaint.
   */
  broadcastAt: timestamp('broadcast_at', { withTimezone: true }),
  idempotency: text('idempotency').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const escrow = pgTable('escrow', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .unique()
    .references(() => p2pOrder.id),
  lockedAmt: usdt('locked_amt').notNull(),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const merchantAssignment = pgTable('merchant_assignment', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .unique()
    .references(() => p2pOrder.id),
  merchantId: uuid('merchant_id')
    .notNull()
    .references(() => merchantProfile.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const paymentProof = pgTable('payment_proof', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => p2pOrder.id),
  utr: text('utr'),
  note: text('note'),
  url: text('url'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const settlement = pgTable('settlement', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id')
    .notNull()
    .references(() => merchantProfile.id),
  grossInr: inr('gross_inr').notNull(),
  feeInr: inr('fee_inr').notNull(),
  netInr: inr('net_inr').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const transaction = pgTable(
  'transaction',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),
    type: text('type').notNull(),
    status: text('status').notNull(),
    assetSymbol: text('asset_symbol').notNull(),
    amount: usdt('amount').notNull(),
    inrDisplay: inr('inr_display'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('transaction_user_id_created_at_idx').on(t.userId, t.createdAt),
  ],
);
