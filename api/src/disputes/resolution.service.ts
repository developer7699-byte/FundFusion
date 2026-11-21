import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { AuditService } from '../audit/audit.service';
import { AccountService, DRIZZLE } from '../ledger/account.service';
import { PostingService } from '../ledger/posting.service';
import type { PostingLine } from '../ledger/ledger.types';
import { usdt, usdtString } from '../money/money';
import { EligibilityService } from '../p2p/eligibility.service';
import { QuoteService, type QuoteSnapshot } from '../p2p/quote.service';
import { buyLegs, leg, nonZero, sellLegs } from '../p2p/settlement-legs';
import {
  fixedSettings,
  type SettingsReader,
} from '../settings/platform-settings';
import type { Dispute } from './dispute.service';

type Db = NodePgDatabase<typeof schema>;

export type DisputeOutcome =
  'RELEASE' | 'REFUND' | 'SPLIT' | 'REFUND_WITH_PENALTY';

export interface Decision {
  outcome: DisputeOutcome;
  reason: string;
  /** SPLIT only: what the counterparty receives out of the escrow. */
  counterpartyAmount?: string;
}

interface Context {
  dispute: Dispute;
  quote: QuoteSnapshot;
  order: typeof schema.p2pOrder.$inferSelect;
  customerAccountId: string;
  merchantAccountId: string;
  /** What the merchant bonded on a sell; '0' on a buy, where they lock instead. */
  bondUsdt: string;
}

/** Which order state each outcome leaves behind (PRD §6.6). */
const FINAL_STATE: Record<DisputeOutcome, 'COMPLETED' | 'REFUNDED'> = {
  RELEASE: 'COMPLETED',
  REFUND: 'REFUNDED',
  SPLIT: 'COMPLETED',
  REFUND_WITH_PENALTY: 'REFUNDED',
};

const FINAL_STATUS: Record<
  DisputeOutcome,
  'RESOLVED_MERCHANT' | 'RESOLVED_CUSTOMER'
> = {
  RELEASE: 'RESOLVED_MERCHANT',
  REFUND: 'RESOLVED_CUSTOMER',
  SPLIT: 'RESOLVED_CUSTOMER',
  REFUND_WITH_PENALTY: 'RESOLVED_CUSTOMER',
};

/**
 * Resolving a dispute (PRD §6.10).
 *
 * Exactly one journal per dispute, posted by a person rather than by a
 * confirmation — which is the only difference between this and settlement.
 * Everything else is the same discipline: the escrow is locked before it is
 * read, the outcome is a closed list, and the whole movement is one entry so
 * there is no instant at which the money belongs to neither party.
 *
 * **A resolution is the largest discretionary movement in the product**, so
 * it is SUPER_ADMIN only, the role is read from the database rather than from
 * a token, and a repeated click under the same key returns the first result
 * rather than paying twice.
 */
@Injectable()
export class ResolutionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly quotes: QuoteService,
    private readonly eligibility: EligibilityService,
    private readonly posting: PostingService,
    private readonly accounts: AccountService,
    private readonly audit: AuditService,
    private readonly settings: SettingsReader = fixedSettings(),
  ) {}

  async resolve(
    disputeId: string,
    adminId: string,
    decision: Decision,
    idempotencyKey: string,
  ): Promise<Dispute> {
    if (!decision.reason?.trim()) {
      throw new BadRequestException(
        'A resolution carries a typed reason, which is stored (PRD §9.4).',
      );
    }
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException(
        'Resolving a dispute moves money and needs an Idempotency-Key.',
      );
    }
    await this.assertSuperAdmin(adminId);

    const resolved = await this.db.transaction(async (tx) => {
      const context = await this.load(disputeId, tx);
      const { dispute } = context;

      if (dispute.status !== 'OPEN' && dispute.status !== 'UNDER_REVIEW') {
        // A replay under the key that resolved it gets the same answer; a
        // different key is a different request, and answering it with this
        // one's result would silently discard it (PRD §5 rule 2).
        const [posted] = await tx
          .select({ id: schema.ledgerTransaction.id })
          .from(schema.ledgerTransaction)
          .where(
            eq(
              schema.ledgerTransaction.idempotency,
              journalKey(idempotencyKey),
            ),
          )
          .limit(1);

        if (posted) return dispute;
        throw new ConflictException(
          `That dispute is already resolved as ${dispute.outcome}. It cannot be resolved again.`,
        );
      }

      // A stable order, so two resolutions sharing a party cannot deadlock.
      for (const accountId of [
        context.customerAccountId,
        context.merchantAccountId,
      ].sort()) {
        await this.accounts.lockForUpdate(tx, accountId);
      }

      const plan = await this.plan(context, decision);

      await this.posting.postDebit(
        plan.escrowAccountId,
        'LOCKED',
        plan.escrowAmount,
        {
          idempotencyKey: journalKey(idempotencyKey),
          memo: `dispute ${disputeId} resolved ${decision.outcome}`,
          lines: plan.lines,
        },
        tx,
      );

      const [row] = await tx
        .update(schema.dispute)
        .set({
          status: FINAL_STATUS[decision.outcome],
          outcome: decision.outcome,
          counterpartyAmount: plan.counterpartyAmount,
          penaltyAmount: plan.penaltyAmount,
          resolvedBy: adminId,
          resolvedAt: new Date(),
          resolutionReason: decision.reason.trim(),
          updatedAt: new Date(),
        })
        .where(eq(schema.dispute.id, disputeId))
        .returning();

      await tx
        .update(schema.p2pOrder)
        .set({
          status: FINAL_STATE[decision.outcome],
          updatedAt: new Date(),
        })
        .where(eq(schema.p2pOrder.id, context.order.id));

      return row;
    });

    await this.audit.record({
      actorId: adminId,
      action: 'DISPUTE_RESOLVE',
      entity: 'dispute',
      entityId: disputeId,
      reason: decision.reason.trim(),
      newValue: {
        outcome: decision.outcome,
        counterpartyAmount: resolved.counterpartyAmount,
        penaltyAmount: resolved.penaltyAmount,
      },
    });

    return resolved;
  }

  /**
   * What the journal does, per outcome. RELEASE is the settlement that would
   * have happened; REFUND is the escrow going back where it came from.
   */
  private async plan(
    context: Context,
    decision: Decision,
  ): Promise<{
    escrowAccountId: string;
    escrowAmount: string;
    lines: PostingLine[];
    counterpartyAmount: string | null;
    penaltyAmount: string | null;
  }> {
    const parties = {
      customerAccountId: context.customerAccountId,
      merchantAccountId: context.merchantAccountId,
    };

    if (decision.outcome === 'RELEASE') {
      const legs =
        context.quote.side === 'SELL'
          ? sellLegs(context.quote, parties, context.bondUsdt)
          : buyLegs(context.quote, parties);
      return {
        escrowAccountId: legs.escrowAccountId,
        escrowAmount: legs.escrowAmount,
        lines: legs.lines,
        counterpartyAmount: usdtString(usdt(context.quote.usdtAmount)),
        penaltyAmount: null,
      };
    }

    if (decision.outcome === 'REFUND') {
      return { ...this.refundLegs(context), penaltyAmount: null };
    }

    throw new BadRequestException(
      `The outcome ${decision.outcome} is not supported yet.`,
    );
  }

  /**
   * The escrow returns to whoever posted it, and any bond is released
   * untouched. No platform fee: nothing was sold.
   */
  private refundLegs(context: Context) {
    const parties = {
      customerAccountId: context.customerAccountId,
      merchantAccountId: context.merchantAccountId,
    };
    const quantity = usdt(context.quote.usdtAmount);
    const fee = usdt(context.quote.platformFeeUsdt);

    if (context.quote.side === 'SELL') {
      const bond = usdt(context.bondUsdt);
      return {
        escrowAccountId: parties.customerAccountId,
        escrowAmount: usdtString(quantity),
        lines: nonZero([
          leg(parties.customerAccountId, 'LOCKED', 'DEBIT', quantity),
          leg(parties.customerAccountId, 'AVAILABLE', 'CREDIT', quantity),
          leg(parties.merchantAccountId, 'BONDED', 'DEBIT', bond),
          leg(parties.merchantAccountId, 'AVAILABLE', 'CREDIT', bond),
        ]),
        counterpartyAmount: usdtString(usdt('0')),
      };
    }

    const locked = quantity.plus(fee);
    return {
      escrowAccountId: parties.merchantAccountId,
      escrowAmount: usdtString(locked),
      lines: nonZero([
        leg(parties.merchantAccountId, 'LOCKED', 'DEBIT', locked),
        leg(parties.merchantAccountId, 'AVAILABLE', 'CREDIT', locked),
      ]),
      counterpartyAmount: usdtString(usdt('0')),
    };
  }

  private async load(disputeId: string, tx: Db): Promise<Context> {
    const [dispute] = await tx
      .select()
      .from(schema.dispute)
      .where(eq(schema.dispute.id, disputeId))
      .limit(1)
      .for('update');

    if (!dispute) throw new NotFoundException('That dispute does not exist.');

    const [order] = await tx
      .select()
      .from(schema.p2pOrder)
      .where(eq(schema.p2pOrder.id, dispute.orderId))
      .limit(1)
      .for('update');

    const [assignment] = await tx
      .select()
      .from(schema.merchantAssignment)
      .where(eq(schema.merchantAssignment.orderId, dispute.orderId))
      .limit(1);

    if (!assignment) {
      throw new ConflictException(
        'That order has no merchant, so there is no counterparty to resolve between.',
      );
    }

    const quote = await this.quotes.get(order.quoteId, tx);

    return {
      dispute,
      order,
      quote,
      customerAccountId: await this.accounts.ensureAccount(
        order.customerId,
        'USDT',
        tx,
      ),
      merchantAccountId: await this.accounts.ensureAccount(
        assignment.userId,
        'USDT',
        tx,
      ),
      bondUsdt:
        quote.side === 'SELL'
          ? (await this.eligibility.obligation(quote)).amountUsdt
          : usdtString(usdt('0')),
    };
  }

  /**
   * Read from the database, never from the token. PRD §9.2: SUPPORT reads
   * everything and moves no money, and this is the movement that matters.
   */
  private async assertSuperAdmin(userId: string): Promise<void> {
    const [row] = await this.db
      .select({ id: schema.userRole.id })
      .from(schema.userRole)
      .innerJoin(schema.role, eq(schema.role.id, schema.userRole.roleId))
      .where(
        and(
          eq(schema.userRole.userId, userId),
          eq(schema.role.name, 'SUPER_ADMIN'),
        ),
      )
      .limit(1);

    if (!row) {
      throw new ForbiddenException(
        'Resolving a dispute moves money, so it is limited to a SUPER_ADMIN administrator.',
      );
    }
  }
}

function journalKey(idempotencyKey: string): string {
  return `dispute:${idempotencyKey}`;
}
