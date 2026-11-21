import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { AuditService } from '../audit/audit.service';
import { DRIZZLE } from '../ledger/account.service';
import { BalanceService } from '../ledger/balance.service';
import { PostingService } from '../ledger/posting.service';
import { Decimal, usdt, usdtString } from '../money/money';

type Db = NodePgDatabase<typeof schema>;

export interface ReversalRequest {
  actorId: string | null;
  /** PRD §9.4: a privileged action nobody can explain is one nobody can lift. */
  reason: string;
}

/**
 * Reversing a credited deposit (PRD §8.2).
 *
 * Close to dead code by design — finalized blocks cannot reorg short of a
 * Byzantine attack on more than a third of validators. It exists because a
 * custodial ledger should be able to reverse a credit, and the moment you
 * need that capability is the worst possible moment to be writing it.
 *
 * The reversal is a compensating journal, never a delete. The original
 * credit stays in the ledger: an audit trail that can lose entries is not an
 * audit trail (PRD §5 rule 1).
 */
@Injectable()
export class ReversalService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly posting: PostingService,
    private readonly balances: BalanceService,
    private readonly audit: AuditService,
  ) {}

  async reverse(depositId: string, request: ReversalRequest): Promise<void> {
    const [row] = await this.db
      .select()
      .from(schema.deposit)
      .where(eq(schema.deposit.id, depositId))
      .limit(1);

    if (!row) {
      throw new NotFoundException('That deposit does not exist.');
    }
    if (row.status === 'REVERSED') return;

    const amount = usdt(row.amount);
    const available = new Decimal(
      await this.balances.balance(row.accountId, 'AVAILABLE'),
    );

    if (available.lt(amount)) {
      // Forcing the balance negative would hide a real loss inside a user's
      // wallet, where the next deposit silently absorbs it.
      await this.block(row.id, request, available.toFixed(), row.amount);
      throw new ConflictException(
        `That deposit was already spent: ${available.toFixed()} USDT is available and ${amount.toFixed()} must come back. Escalated for a decision.`,
      );
    }

    await this.posting.postDebit(
      row.accountId,
      'AVAILABLE',
      usdtString(amount),
      {
        idempotencyKey: `deposit-reversal:${row.id}`,
        memo: `reversal of deposit ${row.txHash ?? row.id}`,
        lines: [
          {
            accountId: row.accountId,
            accountType: 'AVAILABLE',
            direction: 'DEBIT',
            amount: usdtString(amount),
            assetSymbol: 'USDT',
          },
          {
            accountType: 'EXTERNAL',
            direction: 'CREDIT',
            amount: usdtString(amount),
            assetSymbol: 'USDT',
          },
        ],
      },
    );

    await this.db
      .update(schema.deposit)
      .set({ status: 'REVERSED', updatedAt: new Date() })
      .where(eq(schema.deposit.id, row.id));

    await this.audit.record({
      actorId: request.actorId,
      action: 'DEPOSIT_REVERSED',
      entity: 'deposit',
      entityId: row.id,
      reason: request.reason,
      oldValue: { status: 'CREDITED', amount: row.amount },
      newValue: { status: 'REVERSED' },
    });
  }

  private async block(
    depositId: string,
    request: ReversalRequest,
    available: string,
    amount: string,
  ): Promise<void> {
    await this.db
      .update(schema.deposit)
      .set({ status: 'REVERSAL_BLOCKED', updatedAt: new Date() })
      .where(eq(schema.deposit.id, depositId));

    await this.audit.record({
      actorId: request.actorId,
      action: 'DEPOSIT_REVERSAL_BLOCKED',
      entity: 'deposit',
      entityId: depositId,
      reason: request.reason,
      newValue: { available, amount },
    });
  }
}
