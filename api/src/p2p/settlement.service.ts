import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { AccountService, DRIZZLE } from '../ledger/account.service';
import { PostingService } from '../ledger/posting.service';
import type { PostingLine } from '../ledger/ledger.types';
import { usdt, usdtString } from '../money/money';
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

  /** Evidence, not authority. No money moves here. */
  async submitUtr(
    orderId: string,
    actorId: string,
    utr: string,
  ): Promise<Order> {
    const parties = await this.parties(orderId);

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

    await this.db.insert(schema.paymentProof).values({ orderId, utr });

    const [row] = await this.db
      .update(schema.p2pOrder)
      .set({ status: 'PAYMENT_SUBMITTED', updatedAt: new Date() })
      .where(eq(schema.p2pOrder.id, orderId))
      .returning();

    return row;
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

      if (order.status === 'COMPLETED') return order;

      if (actorId !== parties.receiverId) {
        throw new ForbiddenException(
          'You are not the receiver of these rupees, so you cannot confirm they arrived.',
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
        quote.side === 'SELL' ? this.sellLegs(parties) : this.buyLegs(parties);

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

  /**
   * PRD §6.3. The customer's escrowed USDT splits between the merchant and
   * platform revenue, and the merchant's bond comes back in the same journal.
   * The platform's cut is taken from the asset it custodies — the merchant is
   * never credited the full quantity.
   */
  private sellLegs(p: Parties) {
    const quantity = usdt(p.quote.usdtAmount);
    const fee = usdt(p.quote.platformFeeUsdt);
    const merchantCredit = quantity.minus(fee);
    const bond = usdt(this.eligibility.obligation(p.quote).amountUsdt);

    const lines: PostingLine[] = [
      leg(p.customerAccountId, 'LOCKED', 'DEBIT', quantity),
      leg(p.merchantAccountId, 'AVAILABLE', 'CREDIT', merchantCredit),
      platformLeg('REVENUE', 'CREDIT', fee),
      leg(p.merchantAccountId, 'BONDED', 'DEBIT', bond),
      leg(p.merchantAccountId, 'AVAILABLE', 'CREDIT', bond),
    ];

    return {
      escrowAccountId: p.customerAccountId,
      escrowBucket: 'LOCKED' as const,
      escrowAmount: usdtString(quantity),
      lines,
    };
  }

  /**
   * PRD §6.4. The customer paid rupees straight into the merchant's bank, so
   * the platform never sees that money and charges the merchant in USDT
   * instead — debited inside this same journal, out of what was locked at
   * accept. The customer receives exactly the quantity they asked for.
   */
  private buyLegs(p: Parties) {
    const quantity = usdt(p.quote.usdtAmount);
    const fee = usdt(p.quote.platformFeeUsdt);
    const locked = quantity.plus(fee);

    const lines: PostingLine[] = [
      leg(p.merchantAccountId, 'LOCKED', 'DEBIT', locked),
      leg(p.customerAccountId, 'AVAILABLE', 'CREDIT', quantity),
      platformLeg('REVENUE', 'CREDIT', fee),
    ];

    return {
      escrowAccountId: p.merchantAccountId,
      escrowBucket: 'LOCKED' as const,
      escrowAmount: usdtString(locked),
      lines,
    };
  }

  private async parties(orderId: string, tx?: Db): Promise<Parties> {
    const db = tx ?? this.db;

    const [order] = await db
      .select()
      .from(schema.p2pOrder)
      .where(eq(schema.p2pOrder.id, orderId))
      .limit(1);
    if (!order) throw new NotFoundException('That order does not exist.');

    const [assignment] = await db
      .select()
      .from(schema.merchantAssignment)
      .where(eq(schema.merchantAssignment.orderId, orderId))
      .limit(1);
    if (!assignment) {
      throw new ConflictException('That order has no merchant yet.');
    }

    const quote = await this.quotes.get(order.quoteId);

    return {
      order,
      quote,
      // On a sell the merchant owes the rupees; on a buy the customer does.
      payerId: quote.side === 'SELL' ? assignment.userId : order.customerId,
      receiverId: quote.side === 'SELL' ? order.customerId : assignment.userId,
      customerAccountId: await this.accounts.ensureAccount(
        order.customerId,
        'USDT',
      ),
      merchantAccountId: await this.accounts.ensureAccount(
        assignment.userId,
        'USDT',
      ),
    };
  }
}

function leg(
  accountId: string,
  accountType: PostingLine['accountType'],
  direction: PostingLine['direction'],
  amount: { toFixed: () => string },
): PostingLine {
  return {
    accountId,
    accountType,
    direction,
    amount: usdtString(usdt(amount.toFixed())),
    assetSymbol: 'USDT',
  };
}

function platformLeg(
  accountType: PostingLine['accountType'],
  direction: PostingLine['direction'],
  amount: { toFixed: () => string },
): PostingLine {
  return {
    accountType,
    direction,
    amount: usdtString(usdt(amount.toFixed())),
    assetSymbol: 'USDT',
  };
}
