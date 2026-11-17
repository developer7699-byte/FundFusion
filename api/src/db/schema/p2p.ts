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
import { merchantProfile, user } from './identity';

export const p2pOrder = pgTable('p2p_order', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => user.id),
  side: text('side').notNull(),
  status: orderStatus('status').notNull().default('CREATED'),
  assetSymbol: text('asset_symbol').notNull(),
  cryptoAmount: usdt('crypto_amount').notNull(),
  inrAmount: inr('inr_amount').notNull(),
  feeAmount: inr('fee_amount').notNull(),
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
