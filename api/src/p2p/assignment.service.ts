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
import { EligibilityService, type Obligation } from './eligibility.service';
import type { Order } from './order.service';
import { canTransition } from './order.state';
import {
  fixedSettings,
  type SettingsReader,
} from '../settings/platform-settings';
import { QuoteService } from './quote.service';

type Db = NodePgDatabase<typeof schema>;

export type Assignment = typeof schema.merchantAssignment.$inferSelect;

@Injectable()
export class AssignmentService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly quotes: QuoteService,
    private readonly eligibility: EligibilityService,
    private readonly posting: PostingService,
    private readonly accounts: AccountService,
    private readonly settings: SettingsReader = fixedSettings(),
  ) {}

  /**
   * First accept wins, atomically (PRD §6.7).
   *
   * The six steps are in this order for a reason: the order row lock is what
   * serialises competing merchants, and the wallet lock is what stops one
   * merchant's balance backing two orders. Checking eligibility before taking
   * the wallet lock would read a balance another transaction is about to
   * spend. Losers get 409 `ORDER_ALREADY_ASSIGNED`.
   */
  async accept(
    orderId: string,
    merchantUserId: string,
    idempotencyKey: string,
  ): Promise<Assignment> {
    return this.db.transaction(async (tx) => {
      // 1. Serialise every merchant racing for this order.
      const [order] = await tx
        .select()
        .from(schema.p2pOrder)
        .where(eq(schema.p2pOrder.id, orderId))
        .limit(1)
        .for('update');

      if (!order) throw new NotFoundException('That order does not exist.');

      const [taken] = await tx
        .select()
        .from(schema.merchantAssignment)
        .where(eq(schema.merchantAssignment.orderId, orderId))
        .limit(1);

      if (taken) {
        // The winner retrying is not a loser.
        if (taken.userId === merchantUserId) return taken;
        throw new ConflictException('ORDER_ALREADY_ASSIGNED');
      }

      // 2. Not both sides of the same trade. PRD §9.1 gave up the
      //    one-phone-one-account rule that used to make this inconvenient,
      //    and self-dealing on the engine is the one place this platform's
      //    incentives can be gamed — so it is refused outright rather than
      //    discouraged. Before the bond, so a refusal moves nothing.
      if (order.customerId === merchantUserId) {
        throw new ForbiddenException(
          'SELF_DEALING_REFUSED: you placed this order, so you cannot also fill it.',
        );
      }

      // 3. Still open, and not a stale price someone waited to pick off.
      if (!canTransition(order.status, 'ACCEPTED')) {
        throw new ConflictException('ORDER_ALREADY_ASSIGNED');
      }
      await this.assertWithinWindow(order);

      // 4 and 5. Capability and desk status, then the wallet lock, then
      // eligibility re-read inside it.
      const accountId = await this.accounts.ensureAccount(
        merchantUserId,
        'USDT',
        tx,
      );
      await this.accounts.lockForUpdate(tx, accountId);
      const owed = await this.eligibility.check(merchantUserId, order, tx);

      // 6. UNIQUE(order_id) is the second arbiter, in case the row lock is
      // ever removed by someone who does not know what it was for.
      const [assignment] = await tx
        .insert(schema.merchantAssignment)
        .values({
          orderId,
          merchantId: owed.merchantId,
          userId: merchantUserId,
          acceptedAt: new Date(),
        })
        .returning();

      // 7. The bond, then the state.
      await this.bond(tx, owed, orderId, idempotencyKey);
      await tx
        .update(schema.p2pOrder)
        .set({ status: 'ACCEPTED', updatedAt: new Date() })
        .where(eq(schema.p2pOrder.id, orderId));

      return assignment;
    });
  }

  /**
   * Available → Bonded on the sell side, Available → Locked on the buy side.
   * Exactly the obligation: the buffer stays unreserved and spendable, because
   * reserving it would price merchants out of orders they can honour.
   */
  private async bond(
    tx: Db,
    owed: Obligation,
    orderId: string,
    idempotencyKey: string,
  ): Promise<void> {
    await this.posting.postDebit(
      owed.accountId,
      'AVAILABLE',
      owed.amountUsdt,
      {
        idempotencyKey,
        memo: `merchant ${owed.bucket.toLowerCase()} for order ${orderId}`,
        lines: [
          {
            accountId: owed.accountId,
            accountType: 'AVAILABLE',
            direction: 'DEBIT',
            amount: owed.amountUsdt,
            assetSymbol: 'USDT',
          },
          {
            accountId: owed.accountId,
            accountType: owed.bucket,
            direction: 'CREDIT',
            amount: owed.amountUsdt,
            assetSymbol: 'USDT',
          },
        ],
      },
      tx,
    );
  }

  /**
   * One source for the window, shared with the sweep. Two copies that merely
   * agree today would eventually let a merchant accept an order the sweep
   * had already expired, or the reverse.
   */
  private async assertWithinWindow(order: Order): Promise<void> {
    if (!order.broadcastAt) return;

    const searchWindowSeconds = await this.settings.integer(
      'order.searchWindowSeconds',
    );
    const deadline = order.broadcastAt.getTime() + searchWindowSeconds * 1000;
    if (Date.now() > deadline) {
      throw new ConflictException(
        'That order expired before it was accepted: its merchant search window has closed.',
      );
    }
  }
}
