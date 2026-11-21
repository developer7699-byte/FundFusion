import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { AccountService, DRIZZLE } from '../ledger/account.service';
import { BalanceService } from '../ledger/balance.service';
import { CapabilityService } from '../capability/capability.service';
import { SessionService } from '../auth/v1/session.service';
import { AuditService } from '../audit/audit.service';
import { EmailOtpService } from '../auth/v1/email-otp.service';
import type { CapabilityKey } from '../capability/capability.types';
import { BSC_TESTNET_NETWORK } from '../chain/hd-wallet.service';

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
    private readonly otp: EmailOtpService,
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

    const [asset] = await this.db
      .insert(schema.asset)
      .values({
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 18,
        kind: 'CRYPTO',
      })
      .onConflictDoNothing()
      .returning({ id: schema.asset.id });

    // The network the wallet derives addresses against (PRD §8.1). Without
    // it a seeded environment looks complete and then fails at the first
    // deposit address, which is the worst moment to discover it.
    const assetId =
      asset?.id ??
      (
        await this.db
          .select({ id: schema.asset.id })
          .from(schema.asset)
          .where(eq(schema.asset.symbol, 'USDT'))
          .limit(1)
      )[0]?.id;

    if (assetId) {
      await this.db
        .insert(schema.blockchainNetwork)
        .values({
          assetId,
          code: BSC_TESTNET_NETWORK,
          name: 'BSC Testnet',
        })
        .onConflictDoNothing();
    }

    return { seeded: true };
  }

  /**
   * Registration starts an account; it does not open one. PRD §9.1: the
   * account stays PENDING_VERIFICATION and holds no session until a code
   * sent to that address comes back.
   */
  async register(email: string, password: string, displayName: string) {
    let userId: string;
    try {
      const [row] = await this.db
        .insert(schema.user)
        .values({
          email: email.toLowerCase(),
          passwordHash: await bcrypt.hash(password, 10),
          displayName,
          status: 'PENDING_VERIFICATION',
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

    await this.otp.request(userId, email, 'REGISTER');
    return { userId, otpRequired: true as const };
  }

  /** The code proves the address exists and belongs to whoever registered. */
  async verifyEmail(email: string, code: string) {
    const user = await this.byEmail(email);
    await this.otp.consume(user.id, email, 'REGISTER', code);

    await this.db
      .update(schema.user)
      .set({
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
        updatedAt: new Date(),
      })
      .where(eq(schema.user.id, user.id));

    const tokens = await this.sessions.issue(user.id, { userAgent: 'v1-api' });
    return { userId: user.id, ...tokens };
  }

  /**
   * Step one of two (PRD §9.1): the password is checked here, and a code goes
   * to the address. No session exists yet.
   *
   * The answer is the same whether the address is unknown or the password is
   * wrong — otherwise this endpoint tells a stranger which of your customers
   * have accounts.
   */
  async login(email: string, password: string) {
    const user = await this.db
      .select({
        id: schema.user.id,
        email: schema.user.email,
        passwordHash: schema.user.passwordHash,
        status: schema.user.status,
      })
      .from(schema.user)
      .where(eq(schema.user.email, email.toLowerCase()))
      .limit(1)
      .then((rows) => rows[0]);

    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) {
      throw new UnauthorizedException('That email and password do not match.');
    }
    if (user.status === 'SUSPENDED' || user.status === 'CLOSED') {
      throw new UnauthorizedException('That account is not active.');
    }

    await this.otp.request(user.id, user.email, 'LOGIN');
    return { otpRequired: true as const };
  }

  /** Step two: the code becomes a session. */
  async loginVerify(email: string, code: string) {
    const user = await this.byEmail(email);
    await this.otp.consume(user.id, email, 'LOGIN', code);

    await this.db
      .update(schema.user)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.user.id, user.id));

    const tokens = await this.sessions.issue(user.id, { userAgent: 'v1-api' });
    return { userId: user.id, ...tokens };
  }

  private async byEmail(email: string) {
    const [row] = await this.db
      .select({ id: schema.user.id, email: schema.user.email })
      .from(schema.user)
      .where(eq(schema.user.email, email.toLowerCase()))
      .limit(1);

    if (!row) {
      // Same answer as a wrong code, for the same reason.
      throw new UnauthorizedException('Invalid code. Ask for a new one.');
    }
    return row;
  }

  async me(userId: string) {
    const [row] = await this.db
      .select({
        id: schema.user.id,
        email: schema.user.email,
        displayName: schema.user.displayName,
        emailVerifiedAt: schema.user.emailVerifiedAt,
        mfaEnrolledAt: schema.user.mfaEnrolledAt,
      })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    const roles = await this.db
      .select({ name: schema.role.name })
      .from(schema.userRole)
      .innerJoin(schema.role, eq(schema.role.id, schema.userRole.roleId))
      .where(eq(schema.userRole.userId, userId));

    return {
      ...row,
      emailVerified: Boolean(row?.emailVerifiedAt),
      // PRD §9.1: this is what decides whether money can move.
      canMoveMoney: Boolean(row?.emailVerifiedAt && row?.mfaEnrolledAt),
      // What the web shell routes on (PRD §9.2).
      roles: roles.map((r) => r.name).sort(),
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
