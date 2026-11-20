import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CapabilityService } from '../capability/capability.service';
import { AccountService, DRIZZLE } from '../ledger/account.service';
import { BalanceService } from '../ledger/balance.service';
import { Decimal, payableUp, usdt, usdtString } from '../money/money';
import type { Order } from './order.service';
import { QuoteService, type QuoteSnapshot } from './quote.service';

type Db = NodePgDatabase<typeof schema>;

export interface Obligation {
  /** Exactly what is bonded or locked at accept. The buffer is not reserved. */
  amountUsdt: string;
  /** amountUsdt × (1 + B) — what the merchant must hold to be eligible. */
  requiredUsdt: string;
  bucket: 'BONDED' | 'LOCKED';
  merchantId: string;
  accountId: string;
}

export interface EligibilityConfig {
  /** PRD §6.5: admin-configurable between 5% and 10%, default 10%. */
  bufferBps: number;
}

const DEFAULTS: EligibilityConfig = { bufferBps: 1000 };

const USDT_SCALE = 18;

@Injectable()
export class EligibilityService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly quotes: QuoteService,
    private readonly balances: BalanceService,
    private readonly capabilities: CapabilityService,
    private readonly accounts: AccountService,
    private readonly config: EligibilityConfig = DEFAULTS,
  ) {}

  /**
   * What the merchant owes, in the asset the platform custodies (PRD §6.5).
   *
   * The SOW gated this on a merchant's rupee balance. That figure is
   * self-declared and unenforceable, because the platform never holds rupees —
   * so the USDT bond *is* the guarantee behind the rupee promise.
   */
  obligation(
    quote: QuoteSnapshot,
  ): Pick<Obligation, 'amountUsdt' | 'requiredUsdt' | 'bucket'> {
    const amount =
      quote.side === 'SELL'
        ? // The merchant owes INR; the bond is what those rupees are worth.
          payableUp(
            usdt(quote.inrAmount).div(usdt(quote.customerRate)),
            USDT_SCALE,
          ).value
        : usdt(quote.usdtAmount).plus(usdt(quote.platformFeeUsdt));

    const buffered = amount.times(
      new Decimal(1).plus(new Decimal(this.config.bufferBps).div(10_000)),
    );

    return {
      amountUsdt: usdtString(amount),
      requiredUsdt: usdtString(payableUp(buffered, USDT_SCALE).value),
      bucket: quote.side === 'SELL' ? 'BONDED' : 'LOCKED',
    };
  }

  /**
   * Whether this merchant may take this order, and for how much. Throws rather
   * than returning false: every refusal has a different reason, and a merchant
   * who cannot see which one is left guessing why their desk is idle.
   */
  async check(
    merchantUserId: string,
    order: Order,
    tx?: Db,
  ): Promise<Obligation> {
    const db = tx ?? this.db;

    const [profile] = await db
      .select()
      .from(schema.merchantProfile)
      .where(eq(schema.merchantProfile.userId, merchantUserId))
      .limit(1);

    if (!profile) {
      throw new ForbiddenException('That account is not a merchant.');
    }
    if (profile.status !== 'ACTIVE') {
      throw new ForbiddenException('That merchant desk is not active.');
    }

    const quote = await this.quotes.get(order.quoteId);
    const capability = quote.side === 'SELL' ? 'P2P_SELL' : 'P2P_BUY';
    if (!(await this.capabilities.can(merchantUserId, capability))) {
      throw new ForbiddenException(
        `That merchant does not hold the ${capability} capability.`,
      );
    }

    const accountId = await this.accounts.ensureAccount(merchantUserId, 'USDT');
    const owed = this.obligation(quote);
    const available = new Decimal(
      await this.balances.balance(accountId, 'AVAILABLE', db),
    );

    if (available.lt(usdt(owed.requiredUsdt))) {
      throw new ForbiddenException(
        `Not eligible: this order needs ${owed.requiredUsdt} USDT available including the buffer, and ${available.toFixed()} is held.`,
      );
    }

    return { ...owed, merchantId: profile.id, accountId };
  }
}
