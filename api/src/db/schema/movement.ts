import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { usdt } from './money-columns';
import { blockchainNetwork, walletAccount } from './money';
import { user } from './identity';

export const deposit = pgTable('deposit', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => walletAccount.id),
  networkId: uuid('network_id')
    .notNull()
    .references(() => blockchainNetwork.id),
  amount: usdt('amount').notNull(),
  status: text('status').notNull(),
  txHash: text('tx_hash'),
  confirmations: integer('confirmations').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const withdrawal = pgTable('withdrawal', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => walletAccount.id),
  amount: usdt('amount').notNull(),
  fee: usdt('fee').notNull(),
  address: text('address').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const transfer = pgTable('transfer', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => walletAccount.id),
  destId: uuid('dest_id')
    .notNull()
    .references(() => walletAccount.id),
  amount: usdt('amount').notNull(),
  fee: usdt('fee').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const conversionQuote = pgTable('conversion_quote', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id),
  fromAsset: text('from_asset').notNull(),
  toAsset: text('to_asset').notNull(),
  rate: usdt('rate').notNull(),
  fromAmount: usdt('from_amount').notNull(),
  toAmount: usdt('to_amount').notNull(),
  feeAmount: usdt('fee_amount').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
