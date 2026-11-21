import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { disputeOutcome, disputeStatus, ticketStatus } from './enums';
import { usdt } from './money-columns';
import { user } from './identity';
import { p2pOrder } from './p2p';

export const notification = pgTable(
  'notification',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('notification_user_id_created_at_idx').on(t.userId, t.createdAt),
  ],
);

export const supportTicket = pgTable('support_ticket', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => user.id),
  assigneeId: uuid('assignee_id').references(() => user.id),
  category: text('category').notNull(),
  subject: text('subject').notNull(),
  status: ticketStatus('status').notNull().default('OPEN'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const supportMessage = pgTable('support_message', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => supportTicket.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * A stopped order, and how a person decided it (PRD §6.10).
 *
 * Opening one moves no money; it records that the order stopped and who said
 * so. Exactly one resolution ever posts a journal, which is why the outcome
 * and its amounts live here rather than being inferred from the ledger
 * afterwards.
 */
export const dispute = pgTable('dispute', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .unique()
    .references(() => p2pOrder.id),
  /**
   * Optional. Support tickets arrive in M6, and a dispute that cannot exist
   * without one could not exist at all until then.
   */
  ticketId: uuid('ticket_id')
    .unique()
    .references(() => supportTicket.id),
  status: disputeStatus('status').notNull().default('OPEN'),
  reason: text('reason').notNull(),
  openedBy: uuid('opened_by').references(() => user.id),
  outcome: disputeOutcome('outcome'),
  /** What was paid to the counterparty — the whole escrow, or a split of it. */
  counterpartyAmount: usdt('counterparty_amount'),
  /** Compensation drawn from the defaulting party's bond. Never the whole bond. */
  penaltyAmount: usdt('penalty_amount'),
  resolvedBy: uuid('resolved_by').references(() => user.id),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolutionReason: text('resolution_reason'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * PRD §9.4 and §13.5: append-only. Every admin money action carries an author
 * and a reason code.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id').references(() => user.id),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id').notNull(),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    ipAddress: text('ip_address'),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('audit_log_entity_entity_id_idx').on(t.entity, t.entityId)],
);

export const securityEvent = pgTable('security_event', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => user.id),
  type: text('type').notNull(),
  severity: text('severity').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const systemSetting = pgTable('system_setting', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
