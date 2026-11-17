import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { capabilityKey, grantEffect, roleName } from './enums';
import { user } from './identity';

/**
 * PRD §9.3. A capability registry sits on top of roles:
 *
 *   effective = (role grants ∪ user grants) − user denies
 *
 * Deny always wins.
 */
export const roleCapability = pgTable(
  'role_capability',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    role: roleName('role').notNull(),
    capability: capabilityKey('capability').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('role_capability_role_capability_key').on(t.role, t.capability)],
);

/**
 * A per-user override.
 *
 * `expiresAt` is nullable but matters more than it looks: most denies are
 * temporary risk holds, and without an expiry they quietly become permanent
 * and nobody remembers why. `reason` is NOT NULL for the same reason — an
 * override nobody can explain is an override nobody can safely lift.
 */
export const userCapability = pgTable(
  'user_capability',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    capability: capabilityKey('capability').notNull(),
    effect: grantEffect('effect').notNull(),
    actorId: uuid('actor_id').references(() => user.id),
    reason: text('reason').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('user_capability_user_id_capability_key').on(t.userId, t.capability)],
);
