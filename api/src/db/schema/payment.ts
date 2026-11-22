import { sql } from 'drizzle-orm';
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { paymentMethodType } from './enums';
import { user } from './identity';
import { p2pOrder } from './p2p';

/**
 * A user's INR payee destination (PRD §6.3/§6.4). Reference data, not money —
 * no ledger touches this. Both roles hold methods: a merchant receives INR on a
 * buy, a customer receives INR on a sell.
 *
 * Soft-deleted, never hard-deleted: an order's payment snapshot references the
 * method it was taken from, and the audit trail must survive a user removing it.
 */
export const paymentMethod = pgTable(
  'payment_method',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: paymentMethodType('type').notNull(),
    label: text('label').notNull(),
    holderName: text('holder_name').notNull(),
    /** BANK only. */
    accountNumber: text('account_number'),
    /** BANK only. */
    ifsc: text('ifsc'),
    /** UPI only. */
    upiVpa: text('upi_vpa'),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    // At most one live default per user. A deleted method never counts.
    uniqueIndex('payment_method_one_default_idx')
      .on(t.userId)
      .where(sql`${t.isDefault} and ${t.deletedAt} is null`),
  ],
);

/**
 * The payee instruction frozen onto an order at the moment it binds — the SELL
 * customer's method at confirm, the BUY merchant's method at accept. Immutable
 * like the quote snapshot (PRD §7): a later edit or deletion of the source
 * method must not change where a historical order said to pay.
 */
export const orderPaymentInstruction = pgTable('order_payment_instruction', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .unique()
    .references(() => p2pOrder.id),
  /** The party who receives the rupees and whose details these are. */
  payeeUserId: uuid('payee_user_id')
    .notNull()
    .references(() => user.id),
  /** Trace back to the source; nullable because the method may later be removed. */
  sourceMethodId: uuid('source_method_id').references(() => paymentMethod.id),
  type: paymentMethodType('type').notNull(),
  holderName: text('holder_name').notNull(),
  accountNumber: text('account_number'),
  ifsc: text('ifsc'),
  upiVpa: text('upi_vpa'),
  chosenAt: timestamp('chosen_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
