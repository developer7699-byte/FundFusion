import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, or, sql, gt } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../ledger/account.service';
import type { CapabilityKey, OverrideMeta } from './capability.types';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class CapabilityService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  /**
   * PRD §9.3:
   *
   *     effective = (role grants ∪ user grants) − user denies
   *
   * The subtraction is applied last and unconditionally, so no ordering of
   * rows can let a deny lose. Expired overrides — in either direction — are
   * filtered out before the sets are combined.
   */
  async effective(userId: string): Promise<Set<CapabilityKey>> {
    const roleGrants = await this.db
      .select({ capability: schema.roleCapability.capability })
      .from(schema.roleCapability)
      .innerJoin(schema.userRole, eq(schema.userRole.userId, userId))
      .innerJoin(
        schema.role,
        and(
          eq(schema.role.id, schema.userRole.roleId),
          eq(schema.role.name, schema.roleCapability.role),
        ),
      );

    const live = or(
      isNull(schema.userCapability.expiresAt),
      gt(schema.userCapability.expiresAt, sql`now()`),
    );

    const overrides = await this.db
      .select({
        capability: schema.userCapability.capability,
        effect: schema.userCapability.effect,
      })
      .from(schema.userCapability)
      .where(and(eq(schema.userCapability.userId, userId), live));

    const allowed = new Set<CapabilityKey>(roleGrants.map((r) => r.capability));
    for (const o of overrides) {
      if (o.effect === 'ALLOW') allowed.add(o.capability);
    }
    // Deny always wins — applied after every union.
    for (const o of overrides) {
      if (o.effect === 'DENY') allowed.delete(o.capability);
    }
    return allowed;
  }

  async can(userId: string, key: CapabilityKey): Promise<boolean> {
    return (await this.effective(userId)).has(key);
  }

  async grant(
    userId: string,
    key: CapabilityKey,
    meta: OverrideMeta,
  ): Promise<void> {
    await this.upsert(userId, key, 'ALLOW', meta);
  }

  async deny(
    userId: string,
    key: CapabilityKey,
    meta: OverrideMeta,
  ): Promise<void> {
    await this.upsert(userId, key, 'DENY', meta);
  }

  private async upsert(
    userId: string,
    capability: CapabilityKey,
    effect: 'ALLOW' | 'DENY',
    meta: OverrideMeta,
  ): Promise<void> {
    const reason = meta.reason?.trim() ?? '';
    if (!reason) {
      throw new BadRequestException(
        'A capability override needs a reason. An override nobody can explain is an override nobody can safely lift.',
      );
    }

    await this.db
      .insert(schema.userCapability)
      .values({
        userId,
        capability,
        effect,
        actorId: meta.actorId,
        reason,
        expiresAt: meta.expiresAt ?? null,
      })
      .onConflictDoUpdate({
        target: [
          schema.userCapability.userId,
          schema.userCapability.capability,
          schema.userCapability.effect,
        ],
        set: {
          actorId: meta.actorId,
          reason,
          expiresAt: meta.expiresAt ?? null,
        },
      });
  }
}
