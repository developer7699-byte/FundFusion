import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../ledger/account.service';
import {
  fixedSettings,
  type SettingsReader,
} from '../settings/platform-settings';
import { EligibilityService } from './eligibility.service';
import { QuoteService } from './quote.service';

type Db = NodePgDatabase<typeof schema>;

/** One row of the merchant feed. Every money field is a string (PRD §5.1). */
export interface FeedOrder {
  orderId: string;
  side: 'BUY' | 'SELL';
  usdtAmount: string;
  inrAmount: string;
  customerRate: string;
  platformFeeUsdt: string;
  broadcastAt: Date;
  expiresAt: Date;
  /** What this merchant would bond or lock to take it (PRD §6.5). */
  obligationUsdt: string;
}

/** One order as a party to it sees it, snapshot included. */
export interface OrderDetail {
  orderId: string;
  status: string;
  side: 'BUY' | 'SELL';
  usdtAmount: string;
  inrAmount: string;
  customerRate: string;
  platformFeeUsdt: string;
  /** Which side of this order the caller is on. */
  role: 'CUSTOMER' | 'MERCHANT';
  merchantUserId: string | null;
  utr: string | null;
  broadcastAt: Date | null;
  updatedAt: Date;
}

/**
 * What a given merchant may accept right now (PRD §6.7).
 *
 * The feed is a convenience, not a control: `AssignmentService.accept`
 * refuses everything this omits, and would refuse it even if the screen
 * offered it. What the feed owes the merchant is honesty — an order listed
 * here that cannot be accepted costs them a wasted request and a lost race,
 * and costs us their trust in the queue.
 */
@Injectable()
export class OrderFeedService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly quotes: QuoteService,
    private readonly eligibility: EligibilityService,
    private readonly settings: SettingsReader = fixedSettings(),
  ) {}

  async availableFor(
    merchantUserId: string,
    now: Date = new Date(),
  ): Promise<FeedOrder[]> {
    const [profile] = await this.db
      .select({ status: schema.merchantProfile.status })
      .from(schema.merchantProfile)
      .where(eq(schema.merchantProfile.userId, merchantUserId))
      .limit(1);

    if (!profile || profile.status !== 'ACTIVE') return [];

    const searchWindowSeconds = await this.settings.integer(
      'order.searchWindowSeconds',
    );

    const rows = await this.db
      .select({
        order: schema.p2pOrder,
        quote: schema.p2pQuote,
      })
      .from(schema.p2pOrder)
      .innerJoin(
        schema.p2pQuote,
        eq(schema.p2pQuote.id, schema.p2pOrder.quoteId),
      )
      .leftJoin(
        schema.merchantAssignment,
        eq(schema.merchantAssignment.orderId, schema.p2pOrder.id),
      )
      .where(
        and(
          eq(schema.p2pOrder.status, 'AWAITING_MERCHANT'),
          // Already taken. The left join is how "no assignment" is expressed.
          isNull(schema.merchantAssignment.id),
          // Never your own order — the same refusal the engine makes, made
          // before the merchant wastes a request on it (PRD §9.1).
          ne(schema.p2pOrder.customerId, merchantUserId),
          sql`${schema.p2pOrder.broadcastAt} + make_interval(secs => ${searchWindowSeconds}) > ${now}`,
        ),
      )
      .orderBy(asc(schema.p2pOrder.broadcastAt));

    const offered: FeedOrder[] = [];
    for (const row of rows) {
      // Eligibility decides capability, desk status and balance in one place,
      // and throws a different reason for each. Here every reason means the
      // same thing — do not offer it — so the throw is the filter.
      try {
        const owed = await this.eligibility.check(merchantUserId, row.order);
        offered.push({
          orderId: row.order.id,
          side: row.quote.side,
          usdtAmount: row.quote.usdtAmount,
          inrAmount: row.quote.inrAmount,
          customerRate: row.quote.customerRate,
          platformFeeUsdt: row.quote.platformFeeUsdt,
          broadcastAt: row.order.broadcastAt!,
          expiresAt: new Date(
            row.order.broadcastAt!.getTime() + searchWindowSeconds * 1000,
          ),
          obligationUsdt: owed.amountUsdt,
        });
      } catch {
        continue;
      }
    }
    return offered;
  }

  /**
   * One order, for a party to it. An order id is not a capability (PRD
   * §13.5): the customer who placed it and the merchant who won it can read
   * it, and nobody else — including merchants who lost the race for it.
   */
  async detail(orderId: string, userId: string): Promise<OrderDetail> {
    const [row] = await this.db
      .select({
        order: schema.p2pOrder,
        quote: schema.p2pQuote,
        assignment: schema.merchantAssignment,
      })
      .from(schema.p2pOrder)
      .innerJoin(
        schema.p2pQuote,
        eq(schema.p2pQuote.id, schema.p2pOrder.quoteId),
      )
      .leftJoin(
        schema.merchantAssignment,
        eq(schema.merchantAssignment.orderId, schema.p2pOrder.id),
      )
      .where(eq(schema.p2pOrder.id, orderId))
      .limit(1);

    if (!row) throw new NotFoundException('That order does not exist.');

    const isCustomer = row.order.customerId === userId;
    const isMerchant = row.assignment?.userId === userId;
    if (!isCustomer && !isMerchant) {
      throw new ForbiddenException('That order is not yours.');
    }

    const [proof] = await this.db
      .select({ utr: schema.paymentProof.utr })
      .from(schema.paymentProof)
      .where(eq(schema.paymentProof.orderId, orderId))
      .limit(1);

    return {
      orderId: row.order.id,
      status: row.order.status,
      side: row.quote.side,
      usdtAmount: row.quote.usdtAmount,
      inrAmount: row.quote.inrAmount,
      customerRate: row.quote.customerRate,
      platformFeeUsdt: row.quote.platformFeeUsdt,
      role: isCustomer ? 'CUSTOMER' : 'MERCHANT',
      merchantUserId: row.assignment?.userId ?? null,
      utr: proof?.utr ?? null,
      broadcastAt: row.order.broadcastAt,
      updatedAt: row.order.updatedAt,
    };
  }
}
