import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { ledgerAccountType, ledgerDirection } from './enums';
import { usdt } from './money-columns';
import { user } from './identity';

export const asset = pgTable('asset', {
  id: uuid('id').primaryKey().defaultRandom(),
  symbol: text('symbol').notNull().unique(),
  name: text('name').notNull(),
  decimals: integer('decimals').notNull(),
  kind: text('kind').notNull(),
  active: boolean('active').notNull().default(true),
});

export const blockchainNetwork = pgTable(
  'blockchain_network',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => asset.id),
    code: text('code').notNull(),
    name: text('name').notNull(),
    active: boolean('active').notNull().default(true),
  },
  (t) => [
    uniqueIndex('blockchain_network_asset_id_code_key').on(t.assetId, t.code),
  ],
);

export const wallet = pgTable(
  'wallet',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    label: text('label').notNull().default('PRIMARY'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('wallet_user_id_label_key').on(t.userId, t.label)],
);

/**
 * PRD §5 rule 1: the ledger is the only truth. This table deliberately carries
 * NO `available` or `locked` balance column — balances are derived by summing
 * balanced journal entries. A balance column is a second source of truth, and
 * the first time it disagrees with the journal there is no way to tell which
 * one is wrong.
 */
export const walletAccount = pgTable(
  'wallet_account',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallet.id, { onDelete: 'cascade' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => asset.id),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('wallet_account_wallet_id_asset_id_key').on(
      t.walletId,
      t.assetId,
    ),
  ],
);

export const walletAddress = pgTable(
  'wallet_address',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => walletAccount.id, { onDelete: 'cascade' }),
    networkId: uuid('network_id')
      .notNull()
      .references(() => blockchainNetwork.id),
    address: text('address').notNull(),
    /**
     * The BIP-44 index this address was derived at (PRD §8.1). Allocated by
     * the database, because two users signing up at the same moment must not
     * be handed the same index — and an index collision means two people
     * share a deposit address.
     */
    derivationIndex: integer('derivation_index'),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('wallet_address_network_id_address_key').on(
      t.networkId,
      t.address,
    ),
    uniqueIndex('wallet_address_network_id_derivation_index_key').on(
      t.networkId,
      t.derivationIndex,
    ),
  ],
);

export const ledgerTransaction = pgTable('ledger_transaction', {
  id: uuid('id').primaryKey().defaultRandom(),
  reference: text('reference').notNull().unique(),
  memo: text('memo').notNull(),
  idempotency: text('idempotency').notNull().unique(),
  /**
   * Hash of the request body. The unique constraint is on the KEY alone, so a
   * replay collides; this column is what distinguishes a true replay from the
   * same key reused with different intent (PRD §5 rule 2).
   */
  fingerprint: text('fingerprint').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ledgerEntry = pgTable(
  'ledger_entry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => ledgerTransaction.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id').references(() => walletAccount.id),
    accountType: ledgerAccountType('account_type').notNull(),
    direction: ledgerDirection('direction').notNull(),
    amount: usdt('amount').notNull(),
    assetSymbol: text('asset_symbol').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('ledger_entry_account_id_idx').on(t.accountId)],
);
