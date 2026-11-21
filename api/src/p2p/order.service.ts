import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { AccountService, DRIZZLE } from '../ledger/account.service';
import { PostingService } from '../ledger/posting.service';
import { canTransition, type OrderState } from './order.state';
import { AbandonmentService } from './abandonment.service';
import type { OrderBroadcaster } from './p2p.gateway';
import { QuoteService, type QuoteSnapshot } from './quote.service';

type Db = NodePgDatabase<typeof schema>;

export type Order = typeof schema.p2pOrder.$inferSelect;

@Injectable()
export class OrderService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly quotes: QuoteService,
    private readonly posting: PostingService,
    private readonly accounts: AccountService,
    private readonly abandonment: AbandonmentService,
    /**
     * Optional, because the engine is correct without anyone listening — a
     * merchant who hears nothing still sees the order the moment they ask
     * for the feed. The broadcast is how they hear it sooner (PRD §11).
     */
    private readonly broadcaster?: OrderBroadcaster,
  ) {}

  /**
   * Confirm a quote into an order (PRD §6.3, §6.4).
   *
   * A sell-side customer's USDT moves Available → Locked here; a buy-side
   * customer holds nothing yet, so nothing moves. The order row is written
   * *before* the journal and only advances to `AWAITING_MERCHANT` once the
   * lock has posted: a crash between the two leaves a visible `QUOTED` order
   * rather than locked funds nobody can see, and because both the key and the
   * journal are idempotent, retrying the same key finishes the job instead of
   * doing it twice.
   */
  async confirm(
    quoteId: string,
    actorId: string,
    idempotencyKey: string,
  ): Promise<Order> {
    const quote = await this.quotes.get(quoteId);

    // A quote id is not a capability (PRD §13.5). Checked before anything is
    // written, so a stranger's attempt leaves no trace to clean up.
    if (actorId !== quote.userId) {
      throw new ForbiddenException('That quote is not yours to confirm.');
    }

    // PRD §6.11. Checked before the row exists, because the row itself would
    // occupy one of the slots being counted — and skipped on a retry, which
    // opens nothing new.
    if (quote.side === 'BUY') {
      await this.abandonment.assertMayOpenBuy(quote.userId, {
        excludeIdempotencyKey: idempotencyKey,
      });
    }

    const order = await this.claim(quote, idempotencyKey);

    // Already confirmed. The money moved on the first call.
    if (order.status !== 'QUOTED') return order;

    if (quote.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'That quote has expired. Ask for a fresh price.',
      );
    }

    if (quote.side === 'SELL') {
      await this.lock(quote, order.id);
    }

    // One instant, recorded once, for every merchant who will see it.
    const broadcast = await this.advance(order, 'AWAITING_MERCHANT', {
      broadcastAt: new Date(),
    });

    // After the row, so nothing is announced that is not yet true — and
    // only here, which is the path a replay already returned from.
    this.announce(broadcast, quote);
    return broadcast;
  }

  /**
   * Tell every merchant at once (PRD §11). A failure here must not undo a
   * confirmed order: the order exists, the money is locked, and the feed is
   * the authority a merchant reads anyway.
   */
  private announce(order: Order, quote: QuoteSnapshot): void {
    if (!this.broadcaster) return;
    try {
      this.broadcaster.broadcast({
        orderId: order.id,
        side: quote.side,
        usdtAmount: quote.usdtAmount,
        inrAmount: quote.inrAmount,
        customerRate: quote.customerRate,
        platformFeeUsdt: quote.platformFeeUsdt,
        broadcastAt: order.broadcastAt!,
      });
    } catch {
      // Nothing above this depends on the announcement having been heard.
    }
  }

  /**
   * One order per quote, one order per idempotency key. Both are database
   * constraints rather than reads, so two concurrent confirmations of the
   * same quote cannot both win.
   */
  private async claim(
    quote: QuoteSnapshot,
    idempotencyKey: string,
  ): Promise<Order> {
    const [inserted] = await this.db
      .insert(schema.p2pOrder)
      .values({
        quoteId: quote.id,
        customerId: quote.userId,
        status: 'QUOTED',
        idempotency: idempotencyKey,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted) return inserted;

    const [existing] = await this.db
      .select()
      .from(schema.p2pOrder)
      .where(eq(schema.p2pOrder.idempotency, idempotencyKey))
      .limit(1);

    if (!existing) {
      // The key is free, so what collided was the quote: this price was
      // already confirmed under a different key.
      throw new ConflictException('That quote has already been confirmed.');
    }
    if (existing.quoteId !== quote.id) {
      // Answering with the stored order would silently discard this request.
      throw new ConflictException(
        `Idempotency key "${idempotencyKey}" was already used for a different quote.`,
      );
    }
    return existing;
  }

  /** Available → Locked, as one balanced journal that cannot overdraw. */
  private async lock(quote: QuoteSnapshot, orderId: string): Promise<void> {
    const accountId = await this.accounts.ensureAccount(quote.userId, 'USDT');
    await this.posting.postDebit(accountId, 'AVAILABLE', quote.usdtAmount, {
      idempotencyKey: `order-lock:${orderId}`,
      memo: `escrow lock for order ${orderId}`,
      lines: [
        {
          accountId,
          accountType: 'AVAILABLE',
          direction: 'DEBIT',
          amount: quote.usdtAmount,
          assetSymbol: 'USDT',
        },
        {
          accountId,
          accountType: 'LOCKED',
          direction: 'CREDIT',
          amount: quote.usdtAmount,
          assetSymbol: 'USDT',
        },
      ],
    });
  }

  private async advance(
    order: Order,
    to: OrderState,
    extra: Partial<Order> = {},
  ): Promise<Order> {
    if (!canTransition(order.status, to)) {
      throw new ConflictException(
        `An order cannot move from ${order.status} to ${to}.`,
      );
    }

    const [row] = await this.db
      .update(schema.p2pOrder)
      .set({ status: to, updatedAt: new Date(), ...extra })
      .where(eq(schema.p2pOrder.id, order.id))
      .returning();

    return row;
  }
}
