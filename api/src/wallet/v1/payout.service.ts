import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { AuditService } from '../../audit/audit.service';
import type { ChainClient } from '../../chain/chain.types';
import type { Signer } from '../../chain/signer';
import { DRIZZLE } from '../../ledger/account.service';
import { PostingService } from '../../ledger/posting.service';
import type { PostingLine } from '../../ledger/ledger.types';
import { Decimal, usdt, usdtString } from '../../money/money';
import {
  fixedSettings,
  type SettingsReader,
} from '../../settings/platform-settings';
import type { Withdrawal } from './withdrawal.service';

type Db = NodePgDatabase<typeof schema>;

export interface PayoutRun {
  sent: Withdrawal[];
  failed: { id: string; error: string }[];
}

/**
 * Broadcasting an approved withdrawal (PRD §8.4).
 *
 * This is the only place in the system where money leaves irreversibly, and
 * its whole design follows from one fact: **a broadcast that throws may
 * still have reached the network.** A token transfer, once mined, cannot be
 * recalled, so an automatic retry is how one withdrawal silently becomes
 * two.
 *
 * So the row is claimed as SENDING in its own committed transaction before
 * anything is signed, and a failure leaves it there. SENDING means "a human
 * must check the chain before this moves again" — which is a stuck row, and
 * a stuck row is recoverable in a way a double payout is not.
 */
@Injectable()
export class PayoutService {
  private readonly log = new Logger(PayoutService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly signer: Signer,
    private readonly posting: PostingService,
    private readonly audit: AuditService,
    private readonly chain?: ChainClient,
    private readonly settings: SettingsReader = fixedSettings(),
  ) {}

  /** Every approved withdrawal, one at a time. */
  async sendApproved(): Promise<PayoutRun> {
    const queue = await this.db
      .select({ id: schema.withdrawal.id })
      .from(schema.withdrawal)
      .where(eq(schema.withdrawal.status, 'APPROVED'));

    const run: PayoutRun = { sent: [], failed: [] };
    for (const row of queue) {
      try {
        run.sent.push(await this.send(row.id));
      } catch (err) {
        // One payout that cannot go must not hold up the ones behind it.
        run.failed.push({ id: row.id, error: (err as Error).message });
        this.log.error(
          `Withdrawal ${row.id} could not be paid: ${(err as Error).message}`,
        );
      }
    }
    return run;
  }

  async send(withdrawalId: string): Promise<Withdrawal> {
    // Before the row is claimed, never after. A failure once it is SENDING
    // needs a human to check the chain; an unfunded hot wallet should leave
    // the queue exactly as it found it.
    await this.ensureHotWalletCanPay();

    const claimed = await this.claim(withdrawalId);

    const txHash = await this.signer.payout(claimed.address, claimed.amount);

    return this.settle(claimed, txHash);
  }

  /**
   * The hot wallet pays for its own transfers, and nothing refills it on its
   * own. This is the same BEP-20 gas trap a sweep hits (PRD §8.3), one
   * address along: the gas wallet is the designated dispenser, so it refills
   * this one too, by the same rule and the same configured amount.
   */
  private async ensureHotWalletCanPay(): Promise<void> {
    if (!this.chain) return;

    const topUp = await this.settings.money('wallet.gasTopUpBnb');
    const held = new Decimal(
      await this.chain.nativeBalance(this.signer.hotWalletAddress()),
    );
    if (held.gte(new Decimal(topUp))) return;

    this.log.warn(
      `The hot wallet holds ${held.toFixed()} BNB; topping it up by ${topUp} before paying out.`,
    );
    await this.signer.sendGas(this.signer.hotWalletAddress(), topUp);
  }

  /**
   * Take the row out of APPROVED before signing anything. Committed on its
   * own, so a crash between here and the broadcast leaves evidence that this
   * withdrawal was attempted rather than a row that looks untouched.
   */
  private async claim(withdrawalId: string) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(schema.withdrawal)
        .where(eq(schema.withdrawal.id, withdrawalId))
        .limit(1)
        .for('update');

      if (!row) throw new NotFoundException('That withdrawal does not exist.');
      if (row.status !== 'APPROVED') {
        throw new ConflictException(
          row.status === 'SENDING'
            ? `Withdrawal ${withdrawalId} is already SENDING. Check the chain for a transaction from the hot wallet before moving it: retrying a broadcast that may have landed pays twice.`
            : `A withdrawal in ${row.status} cannot be sent.`,
        );
      }

      const [updated] = await tx
        .update(schema.withdrawal)
        .set({ status: 'SENDING', updatedAt: new Date() })
        .where(eq(schema.withdrawal.id, withdrawalId))
        .returning();

      return {
        id: updated.id,
        accountId: updated.accountId,
        address: updated.address,
        amount: new Decimal(updated.amount).toFixed(),
        fee: updated.fee,
      };
    });
  }

  /**
   * The money is gone from the chain, so it leaves the ledger: locked out,
   * external in, and the fee the platform kept becomes revenue in the same
   * journal — there is no instant at which it belongs to neither.
   */
  private async settle(
    claimed: { id: string; accountId: string; amount: string; fee: string },
    txHash: string,
  ): Promise<Withdrawal> {
    const amount = usdt(claimed.amount);
    const fee = usdt(claimed.fee);
    const total = amount.plus(fee);

    return this.db.transaction(async (tx) => {
      await this.posting.postDebit(
        claimed.accountId,
        'LOCKED',
        usdtString(total),
        {
          idempotencyKey: `withdrawal-sent:${claimed.id}`,
          memo: `withdrawal ${claimed.id} paid in ${txHash}`,
          lines: nonZero([
            leg(claimed.accountId, 'LOCKED', 'DEBIT', total),
            {
              accountType: 'EXTERNAL',
              direction: 'CREDIT',
              amount: usdtString(amount),
              assetSymbol: 'USDT',
            },
            {
              accountType: 'REVENUE',
              direction: 'CREDIT',
              amount: usdtString(fee),
              assetSymbol: 'USDT',
            },
          ]),
        },
        tx,
      );

      const [updated] = await tx
        .update(schema.withdrawal)
        .set({ status: 'SENT', txHash, updatedAt: new Date() })
        .where(eq(schema.withdrawal.id, claimed.id))
        .returning();

      await this.audit.record({
        actorId: null,
        action: 'WITHDRAWAL_SENT',
        entity: 'withdrawal',
        entityId: claimed.id,
        reason: 'approved withdrawal broadcast',
        newValue: { txHash, amount: updated.amount },
      });

      return updated;
    });
  }
}

function nonZero(lines: PostingLine[]): PostingLine[] {
  return lines.filter((line) => usdt(line.amount).gt(0));
}

function leg(
  accountId: string,
  accountType: PostingLine['accountType'],
  direction: PostingLine['direction'],
  amount: Decimal,
): PostingLine {
  return {
    accountId,
    accountType,
    direction,
    amount: usdtString(usdt(amount.toFixed())),
    assetSymbol: 'USDT',
  };
}
