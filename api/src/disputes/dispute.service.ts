import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { AuditService } from '../audit/audit.service';
import { DRIZZLE } from '../ledger/account.service';

type Db = NodePgDatabase<typeof schema>;

export type Dispute = typeof schema.dispute.$inferSelect;

/** A dispute with the order behind it, so an admin reads one row. */
export interface DisputeView extends Dispute {
  orderStatus: string;
  side: 'BUY' | 'SELL';
  usdtAmount: string;
  inrAmount: string;
  customerRate: string;
  platformFeeUsdt: string;
  customerId: string;
  merchantUserId: string | null;
  utr: string | null;
}

/**
 * The states an order can be disputed from.
 *
 * Not `AWAITING_MERCHANT` — nobody has taken it, so there is no counterparty
 * to dispute with and the expiry sweep will return the funds on its own. Not
 * a terminal state — money has settled or returned, and §6.6 lets nothing
 * move it again. `DISPUTED` is included because §6.9's sweep puts an order
 * there on a receiver's silence, and that order still needs a dispute row an
 * admin can see.
 */
const DISPUTABLE = ['ACCEPTED', 'PAYMENT_SUBMITTED', 'DISPUTED'] as const;

/**
 * Disputes (PRD §6.10).
 *
 * **Opening one moves no money.** It records that an order stopped and who
 * said so. Anything else would let either party move escrow by complaining,
 * which is the whole attack this exists to resist. Exactly one resolution
 * ever posts a journal, and that is `ResolutionService`.
 */
@Injectable()
export class DisputeService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async open(
    orderId: string,
    actorId: string,
    reason: string,
  ): Promise<Dispute> {
    if (!reason?.trim()) {
      throw new BadRequestException(
        'A dispute carries a reason. An admin resolving it has nothing else to go on.',
      );
    }

    const created = await this.db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(schema.p2pOrder)
        .where(eq(schema.p2pOrder.id, orderId))
        .limit(1)
        .for('update');

      if (!order) throw new NotFoundException('That order does not exist.');

      const [assignment] = await tx
        .select({ userId: schema.merchantAssignment.userId })
        .from(schema.merchantAssignment)
        .where(eq(schema.merchantAssignment.orderId, orderId))
        .limit(1);

      if (order.customerId !== actorId && assignment?.userId !== actorId) {
        throw new ForbiddenException('That order is not yours to dispute.');
      }

      if (!(DISPUTABLE as readonly string[]).includes(order.status)) {
        throw new ConflictException(
          `An order in ${order.status} cannot be disputed.`,
        );
      }

      const [row] = await tx
        .insert(schema.dispute)
        .values({
          orderId,
          reason: reason.trim(),
          openedBy: actorId,
          status: 'OPEN',
        })
        .onConflictDoNothing()
        .returning();

      if (!row) {
        throw new ConflictException(
          'That order already has a dispute. Add to it rather than opening a second one.',
        );
      }

      // Already DISPUTED when §6.9's sweep put it there; moving it again
      // would be a transition the machine refuses.
      if (order.status !== 'DISPUTED') {
        await tx
          .update(schema.p2pOrder)
          .set({ status: 'DISPUTED', updatedAt: new Date() })
          .where(eq(schema.p2pOrder.id, orderId));
      }

      return row;
    });

    await this.audit.record({
      actorId,
      action: 'DISPUTE_OPEN',
      entity: 'dispute',
      entityId: created.id,
      reason: created.reason,
      newValue: { orderId, status: 'OPEN' },
    });

    return created;
  }

  async get(id: string): Promise<DisputeView> {
    const [row] = await this.rows(eq(schema.dispute.id, id));
    if (!row) throw new NotFoundException('That dispute does not exist.');
    return row;
  }

  /** The admin queue. Open and under review by default — the work, not the archive. */
  async queue(
    statuses: readonly string[] = ['OPEN', 'UNDER_REVIEW'],
  ): Promise<DisputeView[]> {
    return this.rows(
      inArray(schema.dispute.status, statuses as ('OPEN' | 'UNDER_REVIEW')[]),
    );
  }

  private async rows(where: Parameters<typeof and>[0]): Promise<DisputeView[]> {
    const rows = await this.db
      .select({
        dispute: schema.dispute,
        order: schema.p2pOrder,
        quote: schema.p2pQuote,
        assignment: schema.merchantAssignment,
        proof: schema.paymentProof,
      })
      .from(schema.dispute)
      .innerJoin(
        schema.p2pOrder,
        eq(schema.p2pOrder.id, schema.dispute.orderId),
      )
      .innerJoin(
        schema.p2pQuote,
        eq(schema.p2pQuote.id, schema.p2pOrder.quoteId),
      )
      .leftJoin(
        schema.merchantAssignment,
        eq(schema.merchantAssignment.orderId, schema.p2pOrder.id),
      )
      .leftJoin(
        schema.paymentProof,
        eq(schema.paymentProof.orderId, schema.p2pOrder.id),
      )
      .where(where)
      .orderBy(desc(schema.dispute.createdAt));

    return rows.map((r) => ({
      ...r.dispute,
      orderStatus: r.order.status,
      side: r.quote.side,
      usdtAmount: r.quote.usdtAmount,
      inrAmount: r.quote.inrAmount,
      customerRate: r.quote.customerRate,
      platformFeeUsdt: r.quote.platformFeeUsdt,
      customerId: r.order.customerId,
      merchantUserId: r.assignment?.userId ?? null,
      utr: r.proof?.utr ?? null,
    }));
  }
}
