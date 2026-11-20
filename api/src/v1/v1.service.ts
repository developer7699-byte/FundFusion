import { ConflictException, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { AccountService, DRIZZLE } from '../ledger/account.service';
import { BalanceService } from '../ledger/balance.service';
import { CapabilityService } from '../capability/capability.service';
import { SessionService } from '../auth/v1/session.service';
import { AuditService } from '../audit/audit.service';
import type { CapabilityKey } from '../capability/capability.types';

type Db = NodePgDatabase<typeof schema>;

const UNIQUE_VIOLATION = '23505';
function isUniqueViolation(err: unknown): boolean {
  let cur: unknown = err;
  for (let d = 0; cur && d < 5; d++) {
    if ((cur as { code?: string }).code === UNIQUE_VIOLATION) return true;
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

@Injectable()
export class V1Service {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly accounts: AccountService,
    private readonly balances: BalanceService,
    private readonly capabilities: CapabilityService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Seed the reference data a fresh database needs: the four roles, the
   * capabilities each role grants, and the USDT asset. Idempotent.
   */
  async seed(): Promise<{ seeded: true }> {
    for (const name of [
      'CUSTOMER',
      'MERCHANT',
      'SUPPORT',
      'SUPER_ADMIN',
    ] as const) {
      await this.db.insert(schema.role).values({ name }).onConflictDoNothing();
    }

    const grants: [string, CapabilityKey][] = [
      ['CUSTOMER', 'DEPOSIT'],
      ['CUSTOMER', 'WITHDRAW'],
      ['CUSTOMER', 'SEND'],
      ['CUSTOMER', 'P2P_BUY'],
      ['CUSTOMER', 'P2P_SELL'],
      ['MERCHANT', 'DEPOSIT'],
      ['MERCHANT', 'WITHDRAW'],
      ['MERCHANT', 'P2P_BUY'],
      ['MERCHANT', 'P2P_SELL'],
      // SUPPORT reads everything and moves no money (PRD §9.2) — no grants.
    ];
    for (const [role, capability] of grants) {
      await this.db
        .insert(schema.roleCapability)
        .values({ role: role as 'CUSTOMER', capability })
        .onConflictDoNothing();
    }

    await this.db
      .insert(schema.asset)
      .values({
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 18,
        kind: 'CRYPTO',
      })
      .onConflictDoNothing();

    return { seeded: true };
  }

  async register(email: string, password: string, displayName: string) {
    let userId: string;
    try {
      const [row] = await this.db
        .insert(schema.user)
        .values({
          email,
          passwordHash: await bcrypt.hash(password, 10),
          displayName,
          status: 'ACTIVE',
        })
        .returning({ id: schema.user.id });
      userId = row.id;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('That email already has an account.');
      }
      throw err;
    }

    const [customerRole] = await this.db
      .select({ id: schema.role.id })
      .from(schema.role)
      .where(eq(schema.role.name, 'CUSTOMER'))
      .limit(1);

    if (customerRole) {
      await this.db
        .insert(schema.userRole)
        .values({ userId, roleId: customerRole.id })
        .onConflictDoNothing();
    }

    const tokens = await this.sessions.issue(userId, { userAgent: 'v1-api' });
    return { userId, ...tokens };
  }

  async me(userId: string) {
    const [row] = await this.db
      .select({
        id: schema.user.id,
        email: schema.user.email,
        displayName: schema.user.displayName,
        phone: schema.user.phone,
        phoneVerifiedAt: schema.user.phoneVerifiedAt,
      })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    return {
      ...row,
      phoneVerified: Boolean(row?.phoneVerifiedAt),
      capabilities: [...(await this.capabilities.effective(userId))].sort(),
    };
  }

  async walletBalances(userId: string) {
    const accountId = await this.accounts.ensureAccount(userId, 'USDT');
    return this.balances.balances(accountId);
  }

  async denyCapability(
    userId: string,
    capability: CapabilityKey,
    reason: string,
  ) {
    await this.capabilities.deny(userId, capability, { actorId: null, reason });
    const auditId = await this.audit.record({
      actorId: null,
      action: 'CAPABILITY_DENY',
      entity: 'user',
      entityId: userId,
      reason,
      newValue: { capability, effect: 'DENY' },
    });
    return { denied: capability, auditId };
  }

  async grantCapability(
    userId: string,
    capability: CapabilityKey,
    reason: string,
  ) {
    await this.capabilities.grant(userId, capability, {
      actorId: null,
      reason,
    });
    const auditId = await this.audit.record({
      actorId: null,
      action: 'CAPABILITY_GRANT',
      entity: 'user',
      entityId: userId,
      reason,
      newValue: { capability, effect: 'ALLOW' },
    });
    return { granted: capability, auditId };
  }

  async auditTrail() {
    return this.db
      .select()
      .from(schema.auditLog)
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(50);
  }
}
