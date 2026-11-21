import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, gte, ne, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { AuditService } from '../../audit/audit.service';
import { MfaService } from '../../auth/v1/mfa.service';
import { CapabilityService } from '../../capability/capability.service';
import { AccountService, DRIZZLE } from '../../ledger/account.service';
import { PostingService } from '../../ledger/posting.service';
import type { PostingLine } from '../../ledger/ledger.types';
import { Decimal, usdt, usdtString } from '../../money/money';
import {
  fixedSettings,
  type SettingsReader,
} from '../../settings/platform-settings';
import { AllowlistService } from './allowlist.service';

type Db = NodePgDatabase<typeof schema>;

export type Withdrawal = typeof schema.withdrawal.$inferSelect;

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/**
 * Taking money off the platform (PRD §8.4).
 *
 * This is the only path where money leaves irreversibly, so it carries more
 * controls than anything else: an allowlisted destination, a cooldown on
 * newly added addresses, a fresh authenticator code on the withdrawal
 * itself, a review threshold, and rolling velocity caps. The threshold alone
 * would not be enough — it is the caps that stop the patient attacker who
 * withdraws just under it, over and over.
 *
 * **Funds lock at request, not at approval.** A queued withdrawal whose
 * funds were still spendable would let the user spend them while an admin
 * was deciding, and the approval would then post against a balance that had
 * gone.
 */
@Injectable()
export class WithdrawalService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly allowlist: AllowlistService,
    private readonly mfa: MfaService,
    private readonly capabilities: CapabilityService,
    private readonly posting: PostingService,
    private readonly accounts: AccountService,
    private readonly audit: AuditService,
    private readonly settings: SettingsReader = fixedSettings(),
  ) {}

  async request(
    userId: string,
    address: string,
    amount: string,
    otpCode: string,
    idempotencyKey: string,
    now: number = Date.now(),
  ): Promise<Withdrawal> {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException(
        'A withdrawal needs an Idempotency-Key. Without one a retry is a second withdrawal.',
      );
    }

    // Before anything that consumes a code. A retry arrives carrying the
    // code the first attempt already spent, so checking the key second
    // would turn every retry into a refusal.
    const existing = await this.byKey(idempotencyKey);
    if (existing) return this.assertOwned(existing, userId);

    if (!(await this.capabilities.can(userId, 'WITHDRAW'))) {
      throw new ForbiddenException(
        'This account does not currently hold the WITHDRAW capability.',
      );
    }

    const requested = this.parse(amount);
    const minimum = usdt(await this.settings.money('withdrawal.minUsdt'));
    if (requested.lt(minimum)) {
      throw new BadRequestException(
        `The smallest withdrawal is ${minimum.toFixed()} USDT; ${requested.toFixed()} was requested.`,
      );
    }

    await this.allowlist.assertUsable(userId, address, now);
    await this.assertWithinCaps(userId, requested, now);

    // Last, because it is the only check that consumes something.
    await this.mfa.verify(userId, otpCode, now);

    const fee = usdt(await this.settings.money('withdrawal.feeUsdt'));
    const total = requested.plus(fee);
    const threshold = usdt(
      await this.settings.money('withdrawal.autoApproveUsdt'),
    );
    const status = requested.gt(threshold) ? 'QUEUED' : 'APPROVED';
    const accountId = await this.accounts.ensureAccount(userId, 'USDT');

    const created = await this.db.transaction(async (tx) => {
      await this.posting.postDebit(
        accountId,
        'AVAILABLE',
        usdtString(total),
        {
          idempotencyKey: `withdrawal:${idempotencyKey}`,
          memo: `withdrawal to ${address}`,
          lines: nonZero([
            leg(accountId, 'AVAILABLE', 'DEBIT', total),
            leg(accountId, 'LOCKED', 'CREDIT', total),
          ]),
        },
        tx,
      );

      const [row] = await tx
        .insert(schema.withdrawal)
        .values({
          accountId,
          amount: usdtString(requested),
          fee: usdtString(fee),
          address,
          status,
          idempotencyKey,
          // The same instant the caps were measured against. A row stamped
          // by the database clock while the window is measured from another
          // is a cap that counts a different set of withdrawals than the one
          // it just approved.
          createdAt: new Date(now),
          updatedAt: new Date(now),
        })
        .returning();

      return row;
    });

    await this.audit.record({
      actorId: userId,
      action: 'WITHDRAWAL_REQUEST',
      entity: 'withdrawal',
      entityId: created.id,
      reason: 'user requested a withdrawal',
      newValue: {
        amount: created.amount,
        fee: created.fee,
        address,
        status,
      },
    });

    return created;
  }

  /** Clears a queued withdrawal for sending. The funds stay locked. */
  async approve(
    withdrawalId: string,
    adminId: string,
    reason: string,
  ): Promise<Withdrawal> {
    return this.review(withdrawalId, adminId, reason, 'APPROVED');
  }

  /**
   * Refuses a queued withdrawal and returns the funds. The return is a
   * compensating journal, never an edit to a balance (PRD §5 rule 1).
   */
  async reject(
    withdrawalId: string,
    adminId: string,
    reason: string,
  ): Promise<Withdrawal> {
    return this.review(withdrawalId, adminId, reason, 'REJECTED');
  }

  private async review(
    withdrawalId: string,
    adminId: string,
    reason: string,
    outcome: 'APPROVED' | 'REJECTED',
  ): Promise<Withdrawal> {
    if (!reason?.trim()) {
      throw new BadRequestException(
        'A review decision carries a reason (PRD §9.4). Blank is refused.',
      );
    }

    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(schema.withdrawal)
        .where(eq(schema.withdrawal.id, withdrawalId))
        .limit(1)
        .for('update');

      if (!row) throw new NotFoundException('That withdrawal does not exist.');
      if (row.status !== 'QUEUED' && row.status !== 'APPROVED') {
        throw new ConflictException(
          `A withdrawal in ${row.status} cannot be reviewed.`,
        );
      }
      if (outcome === 'APPROVED' && row.status === 'APPROVED') {
        return row;
      }

      if (outcome === 'REJECTED') {
        const total = usdt(row.amount).plus(usdt(row.fee));
        await this.posting.postDebit(
          row.accountId,
          'LOCKED',
          usdtString(total),
          {
            idempotencyKey: `withdrawal-reject:${row.id}`,
            memo: `rejected withdrawal ${row.id}`,
            lines: nonZero([
              leg(row.accountId, 'LOCKED', 'DEBIT', total),
              leg(row.accountId, 'AVAILABLE', 'CREDIT', total),
            ]),
          },
          tx,
        );
      }

      const [updated] = await tx
        .update(schema.withdrawal)
        .set({
          status: outcome,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewReason: reason.trim(),
          updatedAt: new Date(),
        })
        .where(eq(schema.withdrawal.id, withdrawalId))
        .returning();

      await this.audit.record({
        actorId: adminId,
        action: `WITHDRAWAL_${outcome}`,
        entity: 'withdrawal',
        entityId: row.id,
        reason: reason.trim(),
        oldValue: { status: row.status },
        newValue: { status: outcome },
      });

      return updated;
    });
  }

  /**
   * Rolling windows, not calendar days. A calendar reset hands an attacker
   * two full caps back to back across midnight.
   */
  private async assertWithinCaps(
    userId: string,
    requested: Decimal,
    now: number,
  ): Promise<void> {
    const [daily, weekly] = await Promise.all([
      this.settings.money('withdrawal.dailyCapUsdt'),
      this.settings.money('withdrawal.weeklyCapUsdt'),
    ]);

    const windows = [
      { label: 'daily', since: now - DAY_MS, cap: usdt(daily) },
      { label: 'weekly', since: now - WEEK_MS, cap: usdt(weekly) },
    ];

    for (const window of windows) {
      const used = await this.withdrawnSince(userId, new Date(window.since));
      if (used.plus(requested).gt(window.cap)) {
        throw new ForbiddenException(
          `That would take your ${window.label} withdrawals to ${used.plus(requested).toFixed()} USDT, over the ${window.cap.toFixed()} limit. ${used.toFixed()} has already gone out in this window.`,
        );
      }
    }
  }

  /** A rejected withdrawal released its funds, so it consumed no capacity. */
  private async withdrawnSince(userId: string, since: Date): Promise<Decimal> {
    const [row] = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${schema.withdrawal.amount}), 0)`,
      })
      .from(schema.withdrawal)
      .innerJoin(
        schema.walletAccount,
        eq(schema.walletAccount.id, schema.withdrawal.accountId),
      )
      .innerJoin(
        schema.wallet,
        eq(schema.wallet.id, schema.walletAccount.walletId),
      )
      .where(
        and(
          eq(schema.wallet.userId, userId),
          gte(schema.withdrawal.createdAt, since),
          ne(schema.withdrawal.status, 'REJECTED'),
        ),
      );

    return new Decimal(row?.total ?? '0');
  }

  private async byKey(idempotencyKey: string): Promise<Withdrawal | null> {
    const [row] = await this.db
      .select()
      .from(schema.withdrawal)
      .where(eq(schema.withdrawal.idempotencyKey, idempotencyKey))
      .limit(1);
    return row ?? null;
  }

  /**
   * A key is not a capability. Answering someone else's withdrawal because
   * they guessed the key would be an IDOR with a receipt attached.
   */
  private async assertOwned(
    row: Withdrawal,
    userId: string,
  ): Promise<Withdrawal> {
    const accountId = await this.accounts.ensureAccount(userId, 'USDT');
    if (row.accountId !== accountId) {
      throw new ForbiddenException('That withdrawal is not yours.');
    }
    return row;
  }

  private parse(amount: string): Decimal {
    let value: Decimal;
    try {
      value = new Decimal(amount);
    } catch {
      throw new BadRequestException(`"${amount}" is not an amount.`);
    }
    if (!value.isFinite() || value.lte(0)) {
      throw new BadRequestException('A withdrawal amount must be positive.');
    }
    return value;
  }
}

/** The ledger refuses a zero leg, and rightly: it is a movement that did not happen. */
function nonZero(lines: PostingLine[]): PostingLine[] {
  return lines.filter((line) => usdt(line.amount).gt(0));
}

function leg(
  accountId: string,
  accountType: PostingLine['accountType'],
  direction: PostingLine['direction'],
  amount: Decimal,
): PostingLine {
  return {
    accountId,
    accountType,
    direction,
    amount: usdtString(usdt(amount.toFixed())),
    assetSymbol: 'USDT',
  };
}
