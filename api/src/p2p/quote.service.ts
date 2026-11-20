import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../ledger/account.service';
import {
  Decimal,
  inr,
  inrString,
  payableUp,
  payoutDown,
  usdt,
  usdtString,
} from '../money/money';
import { RateService } from '../rates/rate.service';

type Db = NodePgDatabase<typeof schema>;

export type QuoteSnapshot = typeof schema.p2pQuote.$inferSelect;

export interface QuoteRequest {
  userId: string;
  side: 'BUY' | 'SELL';
  /** Exactly one of the two. The one given is exact (PRD §6.2). */
  usdtAmount?: string;
  inrAmount?: string;
}

export interface QuoteConfig {
  /** PRD §6.9: 90 s by default, configurable. */
  ttlSeconds: number;
  /**
   * PRD §6.4: the buy-side fee the platform charges the merchant, in USDT.
   * The client has not set this figure (docs/DEPENDENCIES.md §3.2), so the
   * default is zero — an invented default would silently charge merchants a
   * number nobody chose.
   */
  buyFeeBps: number;
}

const DEFAULTS: QuoteConfig = { ttlSeconds: 90, buyFeeBps: 0 };

const USDT_SCALE = 18;
const INR_SCALE = 2;

@Injectable()
export class QuoteService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly rates: RateService,
    private readonly config: QuoteConfig = DEFAULTS,
  ) {}

  /**
   * Price one side and snapshot it (PRD §6.2, §7).
   *
   * The customer types one side; the other is solved and absorbs the
   * remainder. Which direction it absorbs is not cosmetic: what the customer
   * gives up rounds up and what they receive rounds down, so the platform is
   * never short by construction (PRD §5.1).
   */
  async create(req: QuoteRequest): Promise<QuoteSnapshot> {
    const typedCrypto = req.usdtAmount !== undefined;
    const typedFiat = req.inrAmount !== undefined;
    if (typedCrypto === typedFiat) {
      throw new BadRequestException(
        'A quote takes either a USDT quantity or an INR amount, not both and not neither.',
      );
    }

    const rate = await this.rates.quote(req.side);
    const customerRate = inr(rate.customerRate);
    // SELL: the customer gives USDT and receives INR. BUY: the reverse.
    const customerReceivesFiat = req.side === 'SELL';

    let usdtAmount: Decimal;
    let inrAmount: Decimal;

    if (typedCrypto) {
      usdtAmount = this.positive(usdt(req.usdtAmount!), 'USDT quantity');
      const exact = usdtAmount.times(customerRate);
      inrAmount = inr(
        customerReceivesFiat
          ? payoutDown(exact, INR_SCALE).value
          : payableUp(exact, INR_SCALE).value,
      );
    } else {
      inrAmount = this.positive(inr(req.inrAmount!), 'INR amount');
      const exact = inrAmount.div(customerRate);
      usdtAmount = usdt(
        customerReceivesFiat
          ? payableUp(exact, USDT_SCALE).value
          : payoutDown(exact, USDT_SCALE).value,
      );
    }

    const [row] = await this.db
      .insert(schema.p2pQuote)
      .values({
        userId: req.userId,
        side: req.side,
        referenceRate: inrString(inr(rate.referenceRate)),
        customerRate: inrString(customerRate),
        markupBps: rate.markupBps,
        usdtAmount: usdtString(usdtAmount),
        inrAmount: inrString(inrAmount),
        authoritativeSide: typedCrypto ? 'CRYPTO' : 'FIAT',
        platformFeeUsdt: usdtString(
          this.platformFee(req.side, usdtAmount, rate.markupBps),
        ),
        provider: rate.provider,
        ...this.window(),
      })
      .returning();

    return row;
  }

  async get(id: string): Promise<QuoteSnapshot> {
    const [row] = await this.db
      .select()
      .from(schema.p2pQuote)
      .where(eq(schema.p2pQuote.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException('That quote does not exist.');
    }
    return row;
  }

  /**
   * The platform's cut, always in USDT because that is the asset it custodies
   * (PRD §6.3, §6.4). On the sell side it is the markup realised against the
   * merchant; on the buy side it is the merchant fee. It rounds up, so the
   * platform is never short — the merchant's credit is then an exact
   * subtraction and leaves no residue.
   */
  private platformFee(
    side: 'BUY' | 'SELL',
    usdtAmount: Decimal,
    markupBps: number,
  ): Decimal {
    const bps = side === 'SELL' ? markupBps : this.config.buyFeeBps;
    const exact = usdtAmount.times(new Decimal(bps)).div(10_000);
    return payableUp(exact, USDT_SCALE).value;
  }

  /**
   * Both timestamps come from one clock reading, so the TTL a quote carries is
   * exactly the configured one rather than that minus a round trip.
   */
  private window(): { createdAt: Date; expiresAt: Date } {
    const createdAt = new Date();
    return {
      createdAt,
      expiresAt: new Date(createdAt.getTime() + this.config.ttlSeconds * 1000),
    };
  }

  private positive(value: Decimal, label: string): Decimal {
    if (!value.gt(0)) {
      throw new BadRequestException(`A quote needs a positive ${label}.`);
    }
    return value;
  }
}
