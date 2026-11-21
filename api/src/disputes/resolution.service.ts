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
import {
  Decimal,
  payableUp as roundUp,
  usdt,
  usdtString,
} from '../money/money';
import { EligibilityService } from '../p2p/eligibility.service';
import { QuoteService, type QuoteSnapshot } from '../p2p/quote.service';
import {
  buyLegs,
  leg,
  nonZero,
  platformLeg,
  sellLegs,
} from '../p2p/settlement-legs';
import {
  fixedSettings,
  type SettingsReader,
} from '../settings/platform-settings';
import { DefaultTrackerService } from './default-tracker.service';
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
  merchantUserId: string;
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
    /**
     * Optional, because a resolution is correct without it — the tracker
     * decides whether a desk keeps trading, not whether the money moved.
     */
    private readonly defaults?: DefaultTrackerService,
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

        if (posted) {
          return {
            ...dispute,
            merchantUserId: context.merchantUserId,
            side: context.quote.side,
          };
        }
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

      return {
        ...row,
        merchantUserId: context.merchantUserId,
        side: context.quote.side,
      };
    });

    // After the money, never before: a desk paused for a resolution that
    // then failed to post would be paused for nothing.
    if (this.defaults && resolved.merchantUserId) {
      await this.defaults.record(
        resolved.merchantUserId,
        resolved.side,
        decision.outcome,
        disputeId,
      );
    }

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

    if (decision.outcome === 'SPLIT') {
      return { ...this.splitLegs(context, decision), penaltyAmount: null };
    }

    return this.penaltyLegs(context);
  }

  /**
   * PRD §6.10's partial split. The fee follows what actually moved — a split
   * that pays 40 of 100 earns 40% of the quoted fee — and the remainder goes
   * back, so the escrow is fully accounted for and nothing is stranded in
   * LOCKED where no state machine can reach it again.
   */
  private splitLegs(context: Context, decision: Decision) {
    const parties = {
      customerAccountId: context.customerAccountId,
      merchantAccountId: context.merchantAccountId,
    };

    if (decision.counterpartyAmount === undefined) {
      throw new BadRequestException(
        'A split needs the amount the counterparty receives.',
      );
    }
    const toCounterparty = usdt(decision.counterpartyAmount);
    if (!toCounterparty.isFinite() || toCounterparty.lte(0)) {
      throw new BadRequestException(
        'A split must pay the counterparty a positive amount; use REFUND to return everything.',
      );
    }

    const quantity = usdt(context.quote.usdtAmount);
    const fee = usdt(context.quote.platformFeeUsdt);
    const bond = usdt(context.bondUsdt);

    if (context.quote.side === 'SELL') {
      if (toCounterparty.gt(quantity)) {
        throw new BadRequestException(
          `A split of ${toCounterparty.toFixed()} is larger than the ${quantity.toFixed()} escrow.`,
        );
      }
      // The platform's cut rounds up, as a payable does (PRD §5.1); the
      // merchant's credit is the complement, so the journal still balances.
      const share = payableUp(fee.times(toCounterparty).div(quantity));
      return {
        escrowAccountId: parties.customerAccountId,
        escrowAmount: usdtString(quantity),
        lines: nonZero([
          leg(parties.customerAccountId, 'LOCKED', 'DEBIT', quantity),
          leg(
            parties.merchantAccountId,
            'AVAILABLE',
            'CREDIT',
            toCounterparty.minus(share),
          ),
          platformLeg('REVENUE', 'CREDIT', share),
          leg(
            parties.customerAccountId,
            'AVAILABLE',
            'CREDIT',
            quantity.minus(toCounterparty),
          ),
          leg(parties.merchantAccountId, 'BONDED', 'DEBIT', bond),
          leg(parties.merchantAccountId, 'AVAILABLE', 'CREDIT', bond),
        ]),
        counterpartyAmount: usdtString(toCounterparty),
      };
    }

    const locked = quantity.plus(fee);
    if (toCounterparty.gt(quantity)) {
      throw new BadRequestException(
        `A split of ${toCounterparty.toFixed()} is larger than the ${quantity.toFixed()} escrow.`,
      );
    }
    const share = payableUp(fee.times(toCounterparty).div(quantity));
    return {
      escrowAccountId: parties.merchantAccountId,
      escrowAmount: usdtString(locked),
      lines: nonZero([
        leg(parties.merchantAccountId, 'LOCKED', 'DEBIT', locked),
        leg(parties.customerAccountId, 'AVAILABLE', 'CREDIT', toCounterparty),
        platformLeg('REVENUE', 'CREDIT', share),
        leg(
          parties.merchantAccountId,
          'AVAILABLE',
          'CREDIT',
          locked.minus(toCounterparty).minus(share),
        ),
      ]),
      counterpartyAmount: usdtString(toCounterparty),
    };
  }

  /**
   * A verified default (PRD §6.10): the escrow returns in full, compensation
   * is drawn from the defaulting party's bond, and **the remainder of the
   * bond is released**. Full forfeiture is never used — a merchant whose
   * bank had a genuine outage would lose everything, word would spread, and
   * merchant supply would dry up.
   *
   * The compensation goes to the wronged party, not to the platform. A
   * platform that earns from disputes has an incentive nobody should want it
   * to have.
   */
  private async penaltyLegs(context: Context) {
    const bond = usdt(context.bondUsdt);
    if (bond.lte(0)) {
      // PRD §6.11: a customer buying USDT has an empty wallet by definition
      // and posts no bond, so there is nothing to draw compensation from.
      throw new BadRequestException(
        'There is no bond on this order to draw compensation from. A buying customer posts none (PRD §6.11); use REFUND or SPLIT.',
      );
    }

    const bps = await this.settings.integer('dispute.penaltyBps');
    const wanted = payableUp(
      usdt(context.quote.usdtAmount).times(bps).div(10_000),
    );
    // Capped at the bond, so the debit can never drive it negative.
    const penalty = wanted.gt(bond) ? bond : wanted;

    const parties = {
      customerAccountId: context.customerAccountId,
      merchantAccountId: context.merchantAccountId,
    };
    const refund = this.refundLegs(context);

    return {
      escrowAccountId: refund.escrowAccountId,
      escrowAmount: refund.escrowAmount,
      lines: nonZero([
        leg(
          parties.customerAccountId,
          'LOCKED',
          'DEBIT',
          usdt(context.quote.usdtAmount),
        ),
        leg(
          parties.customerAccountId,
          'AVAILABLE',
          'CREDIT',
          usdt(context.quote.usdtAmount).plus(penalty),
        ),
        leg(parties.merchantAccountId, 'BONDED', 'DEBIT', bond),
        leg(
          parties.merchantAccountId,
          'AVAILABLE',
          'CREDIT',
          bond.minus(penalty),
        ),
      ]),
      counterpartyAmount: usdtString(usdt('0')),
      penaltyAmount: usdtString(penalty),
    };
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
      merchantUserId: assignment.userId,
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

/** A payable rounds up, so the platform is never short (PRD §5.1). */
function payableUp(value: Decimal): Decimal {
  return roundUp(value, 18).value;
}
