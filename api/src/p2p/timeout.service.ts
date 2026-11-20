import { Inject, Injectable } from '@nestjs/common';
import { and, eq, lte, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { AccountService, DRIZZLE } from '../ledger/account.service';
import { PostingService } from '../ledger/posting.service';
import { canTransition } from './order.state';

type Db = NodePgDatabase<typeof schema>;

export interface TimeoutConfig {
  /** PRD §6.9, all configurable: 120 s to find a merchant, 15 min each side. */
  searchWindowSeconds: number;
  payerWindowSeconds: number;
  receiverWindowSeconds: number;
}

const DEFAULTS: TimeoutConfig = {
  searchWindowSeconds: 120,
  payerWindowSeconds: 900,
  receiverWindowSeconds: 900,
};

export interface SweepResult {
  expired: string[];
  disputed: string[];
}

@Injectable()
export class TimeoutService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly posting: PostingService,
    private readonly accounts: AccountService,
    private readonly config: TimeoutConfig = DEFAULTS,
  ) {}

  /**
   * Walk the clocks (PRD §6.9).
   *
   * Only two destinations exist here: **EXPIRED**, which returns funds to
   * where they started, and **DISPUTED**, which moves nothing and asks a
   * human. Silence never completes an order — escrow that pays out when
   * someone simply stops replying is escrow that gets farmed.
   */
  async sweep(now: Date = new Date()): Promise<SweepResult> {
    const result: SweepResult = { expired: [], disputed: [] };

    for (const orderId of await this.unconfirmed(now)) {
      if (await this.expire(orderId)) result.expired.push(orderId);
    }
    for (const orderId of await this.unmatched(now)) {
      if (await this.expire(orderId)) result.expired.push(orderId);
    }
    for (const orderId of await this.unpaid(now)) {
      if (await this.escalate(orderId)) result.disputed.push(orderId);
    }
    for (const orderId of await this.unconfirmedReceipt(now)) {
      if (await this.escalate(orderId)) result.disputed.push(orderId);
    }

    return result;
  }

  /** A quote that ran out before the customer confirmed it. */
  private async unconfirmed(now: Date): Promise<string[]> {
    const rows = await this.db
      .select({ id: schema.p2pOrder.id })
      .from(schema.p2pOrder)
      .innerJoin(
        schema.p2pQuote,
        eq(schema.p2pQuote.id, schema.p2pOrder.quoteId),
      )
      .where(
        and(
          eq(schema.p2pOrder.status, 'QUOTED'),
          lte(schema.p2pQuote.expiresAt, now),
        ),
      );
    return rows.map((r) => r.id);
  }

  /** Broadcast, but no merchant took it inside the search window. */
  private async unmatched(now: Date): Promise<string[]> {
    const rows = await this.db
      .select({ id: schema.p2pOrder.id })
      .from(schema.p2pOrder)
      .where(
        and(
          eq(schema.p2pOrder.status, 'AWAITING_MERCHANT'),
          lte(
            sql`${schema.p2pOrder.broadcastAt} + make_interval(secs => ${this.config.searchWindowSeconds})`,
            now,
          ),
        ),
      );
    return rows.map((r) => r.id);
  }

  /** Accepted, but the payer never sent the rupees. */
  private async unpaid(now: Date): Promise<string[]> {
    const rows = await this.db
      .select({ id: schema.p2pOrder.id })
      .from(schema.p2pOrder)
      .innerJoin(
        schema.merchantAssignment,
        eq(schema.merchantAssignment.orderId, schema.p2pOrder.id),
      )
      .where(
        and(
          eq(schema.p2pOrder.status, 'ACCEPTED'),
          lte(
            sql`${schema.merchantAssignment.acceptedAt} + make_interval(secs => ${this.config.payerWindowSeconds})`,
            now,
          ),
        ),
      );
    return rows.map((r) => r.id);
  }

  /**
   * Paid, allegedly, and the receiver has gone quiet. This is the one the
   * rule exists for: the money stays exactly where it is and a human decides.
   */
  private async unconfirmedReceipt(now: Date): Promise<string[]> {
    const rows = await this.db
      .select({ id: schema.p2pOrder.id })
      .from(schema.p2pOrder)
      .innerJoin(
        schema.paymentProof,
        eq(schema.paymentProof.orderId, schema.p2pOrder.id),
      )
      .where(
        and(
          eq(schema.p2pOrder.status, 'PAYMENT_SUBMITTED'),
          lte(
            sql`${schema.paymentProof.createdAt} + make_interval(secs => ${this.config.receiverWindowSeconds})`,
            now,
          ),
        ),
      );
    return rows.map((r) => r.id);
  }

  /**
   * Return the escrow and close the order. The unlock mirrors whatever the
   * confirmation locked, found by its journal key — so an order that died in
   * the gap between its row and its journal unlocks nothing, and one that got
   * as far as the lock gets every unit of it back.
   */
  private async expire(orderId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(schema.p2pOrder)
        .where(eq(schema.p2pOrder.id, orderId))
        .limit(1)
        .for('update');

      if (!order || !canTransition(order.status, 'EXPIRED')) return false;

      const [lock] = await tx
        .select({ id: schema.ledgerTransaction.id })
        .from(schema.ledgerTransaction)
        .where(
          eq(schema.ledgerTransaction.idempotency, `order-lock:${orderId}`),
        )
        .limit(1);

      if (lock) {
        const [quote] = await tx
          .select()
          .from(schema.p2pQuote)
          .where(eq(schema.p2pQuote.id, order.quoteId))
          .limit(1);

        const accountId = await this.accounts.ensureAccount(
          order.customerId,
          'USDT',
          tx,
        );
        await this.accounts.lockForUpdate(tx, accountId);
        await this.posting.postDebit(
          accountId,
          'LOCKED',
          quote.usdtAmount,
          {
            idempotencyKey: `order-expire:${orderId}`,
            memo: `escrow returned on expiry of order ${orderId}`,
            lines: [
              {
                accountId,
                accountType: 'LOCKED',
                direction: 'DEBIT',
                amount: quote.usdtAmount,
                assetSymbol: 'USDT',
              },
              {
                accountId,
                accountType: 'AVAILABLE',
                direction: 'CREDIT',
                amount: quote.usdtAmount,
                assetSymbol: 'USDT',
              },
            ],
          },
          tx,
        );
      }

      await tx
        .update(schema.p2pOrder)
        .set({ status: 'EXPIRED', updatedAt: new Date() })
        .where(eq(schema.p2pOrder.id, orderId));

      return true;
    });
  }

  /** Hand it to a human. Nothing moves, in either direction. */
  private async escalate(orderId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(schema.p2pOrder)
        .where(eq(schema.p2pOrder.id, orderId))
        .limit(1)
        .for('update');

      if (!order || !canTransition(order.status, 'DISPUTED')) return false;

      await tx
        .update(schema.p2pOrder)
        .set({ status: 'DISPUTED', updatedAt: new Date() })
        .where(eq(schema.p2pOrder.id, orderId));

      return true;
    });
  }
}
