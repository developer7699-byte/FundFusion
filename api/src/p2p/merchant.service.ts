import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CapabilityService } from '../capability/capability.service';
import * as schema from '../db/schema';
import { DRIZZLE } from '../ledger/account.service';

type Db = NodePgDatabase<typeof schema>;

export interface MerchantDesk {
  id: string;
  deskName: string;
  status: string;
  buyEnabled: boolean;
  sellEnabled: boolean;
}

/**
 * Becoming a merchant (PRD §6.5, §9.3).
 *
 * A desk opens ACTIVE with both P2P capabilities. What actually decides
 * whether a merchant can take an order is the bond — `EligibilityService`
 * requires available USDT of at least the obligation plus the buffer — so a
 * desk with no money is inert however it is flagged. Vetting, when it
 * arrives, is a DENY in the capability registry, which already wins over
 * every grant.
 */
@Injectable()
export class MerchantService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly capabilities: CapabilityService,
  ) {}

  async open(userId: string, deskName: string): Promise<MerchantDesk> {
    if (await this.profile(userId)) {
      throw new ConflictException('This account already has a merchant desk.');
    }

    const [row] = await this.db
      .insert(schema.merchantProfile)
      .values({
        userId,
        deskName,
        status: 'ACTIVE',
        buyEnabled: true,
        sellEnabled: true,
      })
      .returning();

    for (const capability of ['P2P_BUY', 'P2P_SELL'] as const) {
      await this.capabilities.grant(userId, capability, {
        actorId: userId,
        reason: 'merchant desk opened',
      });
    }

    return desk(row);
  }

  async profile(userId: string): Promise<MerchantDesk | null> {
    const [row] = await this.db
      .select()
      .from(schema.merchantProfile)
      .where(eq(schema.merchantProfile.userId, userId))
      .limit(1);

    return row ? desk(row) : null;
  }
}

function desk(row: typeof schema.merchantProfile.$inferSelect): MerchantDesk {
  return {
    id: row.id,
    deskName: row.deskName,
    status: row.status,
    buyEnabled: row.buyEnabled,
    sellEnabled: row.sellEnabled,
  };
}
