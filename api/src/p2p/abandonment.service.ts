import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../ledger/account.service';
import { Decimal } from '../money/money';
import {
  fixedSettings,
  type SettingsReader,
} from '../settings/platform-settings';

type Db = NodePgDatabase<typeof schema>;

/** States in which an order is still holding someone's attention or money. */
const OPEN_STATES = [
  'QUOTED',
  'AWAITING_MERCHANT',
  'ACCEPTED',
  'PAYMENT_SUBMITTED',
] as const;

/** How a matched order ends when the customer walks away. */
const ABANDONED_STATES = ['EXPIRED', 'DISPUTED'] as const;

export interface AbandonmentStats {
  /** Orders a merchant actually committed funds to. */
  matched: number;
  abandoned: number;
  /** abandoned / matched, to two places. */
  rate: string;
  cooldownSeconds: number;
  cooldownUntil: Date | null;
}

/**
 * Abandonment control (PRD §6.11).
 *
 * A customer buying USDT has an empty wallet by definition, so they cannot
 * post a bond — requiring one would mean nobody could ever make a first
 * purchase. Limits do the work instead: a cap on concurrent open buy orders,
 * a tracked rate, and an escalating cooldown. A merchant is never penalised
 * for a customer's abandonment (§6.10); if they were, merchants would learn to
 * avoid buy-side orders and the side being protected would be the one broken.
 */
@Injectable()
export class AbandonmentService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly settings: SettingsReader = fixedSettings(),
  ) {}

  async stats(customerId: string): Promise<AbandonmentStats> {
    const rows = await this.db
      .select({
        status: schema.p2pOrder.status,
        updatedAt: schema.p2pOrder.updatedAt,
        /**
         * Whether the customer ever sent the rupees. On a buy order they are
         * the payer, so a dispute with a payment reference against it is the
         * merchant failing to confirm money that was sent — not the customer
         * walking away (PRD §6.8, §6.10).
         */
        paid: sql<boolean>`EXISTS (
          SELECT 1 FROM payment_proof
           WHERE payment_proof.order_id = ${schema.p2pOrder.id}
        )`,
      })
      .from(schema.p2pOrder)
      .innerJoin(
        schema.merchantAssignment,
        eq(schema.merchantAssignment.orderId, schema.p2pOrder.id),
      )
      .innerJoin(
        schema.p2pQuote,
        eq(schema.p2pQuote.id, schema.p2pOrder.quoteId),
      )
      .where(
        and(
          eq(schema.p2pOrder.customerId, customerId),
          eq(schema.p2pQuote.side, 'BUY'),
        ),
      )
      .orderBy(desc(schema.p2pOrder.updatedAt));

    const walked = rows.filter(
      (r) =>
        (ABANDONED_STATES as readonly string[]).includes(r.status) && !r.paid,
    );
    const matched = rows.length;
    const abandoned = walked.length;

    const forgiven = await this.settings.integer('abandonment.forgiven');
    const base = await this.settings.integer('abandonment.cooldownBaseSeconds');
    const steps = abandoned - forgiven;
    const cooldownSeconds = steps > 0 ? base * 2 ** (steps - 1) : 0;

    return {
      matched,
      abandoned,
      rate: matched ? new Decimal(abandoned).div(matched).toFixed(2) : '0.00',
      cooldownSeconds,
      cooldownUntil:
        cooldownSeconds && walked[0]
          ? new Date(walked[0].updatedAt.getTime() + cooldownSeconds * 1000)
          : null,
    };
  }

  /**
   * Called before a buy order is opened. Refuses with the reason, because a
   * customer who cannot tell a cooldown from a cap cannot fix either.
   */
  async assertMayOpenBuy(
    customerId: string,
    opts: { excludeIdempotencyKey?: string; now?: Date } = {},
  ): Promise<void> {
    const now = opts.now ?? new Date();

    const open = await this.openBuyOrders(
      customerId,
      opts.excludeIdempotencyKey,
    );
    const cap = await this.settings.integer(
      'abandonment.concurrentBuyOrderCap',
    );
    if (open >= cap) {
      throw new ConflictException(
        `You already have ${open} open order${open === 1 ? '' : 's'}. Finish or cancel one before starting another.`,
      );
    }

    const { cooldownUntil } = await this.stats(customerId);
    if (cooldownUntil && cooldownUntil > now) {
      throw new ConflictException(
        `Too many orders were left unpaid. Wait until ${cooldownUntil.toISOString()} before starting another.`,
      );
    }
  }

  private async openBuyOrders(
    customerId: string,
    excludeIdempotencyKey?: string,
  ): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.p2pOrder)
      .innerJoin(
        schema.p2pQuote,
        eq(schema.p2pQuote.id, schema.p2pOrder.quoteId),
      )
      .where(
        and(
          eq(schema.p2pOrder.customerId, customerId),
          eq(schema.p2pQuote.side, 'BUY'),
          inArray(schema.p2pOrder.status, [...OPEN_STATES]),
          excludeIdempotencyKey
            ? ne(schema.p2pOrder.idempotency, excludeIdempotencyKey)
            : isNotNull(schema.p2pOrder.id),
        ),
      );
    return row.n;
  }
}
