import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { AuditService } from '../audit/audit.service';
import { DRIZZLE } from '../ledger/account.service';
import {
  fixedSettings,
  type SettingsReader,
} from '../settings/platform-settings';
import type { DisputeOutcome } from './resolution.service';

type Db = NodePgDatabase<typeof schema>;

export interface DefaultStats {
  defaults: number;
  threshold: number;
  paused: boolean;
}

/**
 * Repeated defaults pause a desk (PRD §6.10).
 *
 * The whole difficulty is deciding what counts. A resolution goes against
 * the merchant only when **the merchant was the party who owed the rupees
 * and did not send them** — which is the sell side. On a buy the customer is
 * the payer, so a refund there means the customer walked away: §6.11's
 * abandonment, and §6.10 says in as many words that a merchant is never
 * penalised for it.
 *
 * A split on a sell counts. The merchant sent part of what they owed, which
 * is a partial failure and still a failure; an admin who disagrees has
 * RELEASE available.
 */
@Injectable()
export class DefaultTrackerService {
  private readonly log = new Logger(DefaultTrackerService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly settings: SettingsReader = fixedSettings(),
  ) {}

  /** Counts this resolution if it went against the merchant, and pauses if due. */
  async record(
    merchantUserId: string,
    side: 'BUY' | 'SELL',
    outcome: DisputeOutcome,
    disputeId: string,
  ): Promise<void> {
    if (!isMerchantDefault(side, outcome)) return;

    const [profile] = await this.db
      .select()
      .from(schema.merchantProfile)
      .where(eq(schema.merchantProfile.userId, merchantUserId))
      .limit(1);

    if (!profile) return;

    const defaults = await this.countDefaults(merchantUserId);
    const threshold = await this.settings.integer(
      'dispute.defaultsBeforePause',
    );

    if (defaults < threshold || profile.status !== 'ACTIVE') return;

    await this.db
      .update(schema.merchantProfile)
      .set({ status: 'INACTIVE' })
      .where(eq(schema.merchantProfile.id, profile.id));

    this.log.warn(
      `Paused desk ${profile.deskName}: ${defaults} disputes resolved against it.`,
    );
    await this.audit.record({
      actorId: null,
      action: 'MERCHANT_PAUSED',
      entity: 'merchant_profile',
      entityId: profile.id,
      reason: `${defaults} disputes resolved against this desk, at or above the threshold of ${threshold}`,
      oldValue: { status: profile.status },
      newValue: { status: 'INACTIVE', defaults, disputeId },
    });
  }

  async stats(merchantUserId: string): Promise<DefaultStats> {
    const [profile] = await this.db
      .select({ status: schema.merchantProfile.status })
      .from(schema.merchantProfile)
      .where(eq(schema.merchantProfile.userId, merchantUserId))
      .limit(1);

    return {
      defaults: await this.countDefaults(merchantUserId),
      threshold: await this.settings.integer('dispute.defaultsBeforePause'),
      paused: profile?.status === 'INACTIVE',
    };
  }

  /**
   * Counted from the disputes themselves rather than from a tally column, so
   * the number can always be re-derived and never drifts from the rows an
   * admin can read.
   */
  private async countDefaults(merchantUserId: string): Promise<number> {
    const res = await this.db.execute<{ n: number }>(sql`
      SELECT count(*)::int AS n
        FROM dispute d
        JOIN p2p_order o ON o.id = d.order_id
        JOIN p2p_quote q ON q.id = o.quote_id
        JOIN merchant_assignment a ON a.order_id = o.id
       WHERE a.user_id = ${merchantUserId}
         AND q.side = 'SELL'
         AND d.outcome IN ('REFUND', 'SPLIT', 'REFUND_WITH_PENALTY')
    `);
    return Number(res.rows[0]?.n ?? 0);
  }
}

/** PRD §6.10: only the party who owed the rupees can default on them. */
export function isMerchantDefault(
  side: 'BUY' | 'SELL',
  outcome: DisputeOutcome,
): boolean {
  if (side !== 'SELL') return false;
  return outcome !== 'RELEASE';
}
