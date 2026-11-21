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
import { AccountService, DRIZZLE } from '../ledger/account.service';
import { PostingService } from '../ledger/posting.service';
import { buyLegs, sellLegs } from './settlement-legs';
import { EligibilityService } from './eligibility.service';
import type { Order } from './order.service';
import { canTransition } from './order.state';
import { QuoteService, type QuoteSnapshot } from './quote.service';

type Db = NodePgDatabase<typeof schema>;

/**
 * Who stands on each side of the rupee leg.
 *
 * PRD §6.8: whoever receives the rupees confirms them. They are the only
 * party who can see their own bank account, which makes them the only honest
 * oracle available without a payment-service provider — and it is why a
 * payer's UTR alone never releases escrow.
 */
interface Parties {
  order: Order;
  quote: QuoteSnapshot;
  payerId: string;
  receiverId: string;
  customerAccountId: string;
  merchantAccountId: string;
}

@Injectable()
export class SettlementService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly quotes: QuoteService,
    private readonly eligibility: EligibilityService,
    private readonly posting: PostingService,
    private readonly accounts: AccountService,
  ) {}

  /**
   * Evidence, not authority. No money moves here — but the state does, and
   * the state decides who may move money next. A UTR landing as the payer
   * window closes must not overwrite the escalation the sweep just made, so
   * this takes the same row lock acceptance does and writes against the
   * status it actually read.
   */
  async submitUtr(
    orderId: string,
    actorId: string,
    utr: string,
  ): Promise<Order> {
    if (!utr?.trim()) {
      throw new BadRequestException(
        'A payment reference is the evidence in a dispute. An empty one is worse than none.',
      );
    }

    return this.db.transaction(async (tx) => {
      const parties = await this.parties(orderId, tx);

      if (actorId !== parties.payerId) {
        throw new ForbiddenException(
          'You are not the payer on this order, so you cannot submit a payment reference.',
        );
      }
      if (!canTransition(parties.order.status, 'PAYMENT_SUBMITTED')) {
        throw new ConflictException(
          `An order in ${parties.order.status} is not waiting for a payment.`,
        );
      }

      await tx.insert(schema.paymentProof).values({ orderId, utr: utr.trim() });

      const [row] = await tx
        .update(schema.p2pOrder)
        .set({ status: 'PAYMENT_SUBMITTED', updatedAt: new Date() })
        .where(
          and(
            eq(schema.p2pOrder.id, orderId),
            eq(schema.p2pOrder.status, parties.order.status),
          ),
        )
        .returning();

      if (!row) {
        throw new ConflictException(
          'That order changed while the payment reference was being submitted.',
        );
      }
      return row;
    });
  }

  /**
   * The receiver confirms the rupees arrived, and the settlement journal posts
   * (PRD §6.3, §6.4). One journal: escrow out, counterparty in, the platform's
   * cut to revenue, and any bond released — so there is no instant at which
   * the money is in neither place.
   */
  async confirmReceipt(
    orderId: string,
    actorId: string,
    idempotencyKey: string,
  ): Promise<Order> {
    return this.db.transaction(async (tx) => {
      const parties = await this.parties(orderId, tx);
      const { order, quote } = parties;

      // Authorisation first: a settled order must not answer a stranger just
      // because there is nothing left to move (PRD §13.5).
      if (actorId !== parties.receiverId) {
        throw new ForbiddenException(
          'You are not the receiver of these rupees, so you cannot confirm they arrived.',
        );
      }

      if (order.status === 'COMPLETED') {
        // A repeat under the key that settled it is a replay, and gets the
        // same answer. A different key is a different request, and answering
        // it with this one's result would silently discard it (PRD §5 rule 2).
        const [settled] = await tx
          .select({ id: schema.ledgerTransaction.id })
          .from(schema.ledgerTransaction)
          .where(eq(schema.ledgerTransaction.idempotency, idempotencyKey))
          .limit(1);

        if (settled) return order;
        throw new ConflictException(
          `An order in ${order.status} cannot settle.`,
        );
      }
      if (!canTransition(order.status, 'COMPLETED')) {
        throw new ConflictException(
          `An order in ${order.status} cannot settle.`,
        );
      }

      // Lock both wallets in a stable order, so two settlements sharing a
      // party cannot deadlock by taking them in opposite orders.
      for (const accountId of [
        parties.customerAccountId,
        parties.merchantAccountId,
      ].sort()) {
        await this.accounts.lockForUpdate(tx, accountId);
      }

      const { escrowAccountId, escrowBucket, escrowAmount, lines } =
        quote.side === 'SELL'
          ? sellLegs(
              quote,
              parties,
              (await this.eligibility.obligation(quote)).amountUsdt,
            )
          : buyLegs(quote, parties);

      await this.posting.postDebit(
        escrowAccountId,
        escrowBucket,
        escrowAmount,
        {
          idempotencyKey,
          memo: `settlement for order ${orderId}`,
          lines,
        },
        tx,
      );

      const [row] = await tx
        .update(schema.p2pOrder)
        .set({ status: 'COMPLETED', updatedAt: new Date() })
        .where(eq(schema.p2pOrder.id, orderId))
        .returning();

      return row;
    });
  }

  private async parties(orderId: string, tx?: Db): Promise<Parties> {
    const db = tx ?? this.db;

    // §6.7's discipline, applied to the side that moves more money than
    // acceptance does: decide nothing from a row another transaction can
    // still change underneath you.
    const base = db
      .select()
      .from(schema.p2pOrder)
      .where(eq(schema.p2pOrder.id, orderId))
      .limit(1);
    const [order] = await (tx ? base.for('update') : base);
    if (!order) throw new NotFoundException('That order does not exist.');

    const [assignment] = await db
      .select()
      .from(schema.merchantAssignment)
      .where(eq(schema.merchantAssignment.orderId, orderId))
      .limit(1);
    if (!assignment) {
      throw new ConflictException('That order has no merchant yet.');
    }

    const quote = await this.quotes.get(order.quoteId, tx);

    return {
      order,
      quote,
      // On a sell the merchant owes the rupees; on a buy the customer does.
      payerId: quote.side === 'SELL' ? assignment.userId : order.customerId,
      receiverId: quote.side === 'SELL' ? order.customerId : assignment.userId,
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
    };
  }
}
