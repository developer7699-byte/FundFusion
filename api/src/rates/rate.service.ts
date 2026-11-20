import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Decimal, inr, inrString } from '../money/money';
import type { RateProvider } from './rate.provider';

export interface RateQuote {
  side: 'BUY' | 'SELL';
  /** The mid-market rate the customer rate was derived from. */
  referenceRate: string;
  customerRate: string;
  markupBps: number;
  provider: string;
  takenAt: Date;
}

export interface RateConfig {
  /** Admin-configured markup per side, in basis points. */
  markupBps: number;
  /** Maximum move from the last known good rate before pricing fails closed. */
  maxDeviationBps: number;
}

const DEFAULTS: RateConfig = { markupBps: 300, maxDeviationBps: 2000 };

@Injectable()
export class RateService {
  private lastGood: Decimal | null = null;
  /** An active admin override. While set, it IS the reference rate. */
  private manualOverride: Decimal | null = null;

  constructor(
    private readonly provider: RateProvider,
    private readonly config: RateConfig = DEFAULTS,
  ) {}

  /**
   * PRD §7. An admin may override the rate manually, bounded by the same
   * maximum deviation that guards the feed — a typed input is no more
   * trustworthy than a bad tick.
   */
  override(rate: string): void {
    const value = inr(rate);
    this.assertWithinBound(value);
    this.manualOverride = value;
    this.lastGood = value;
  }

  /** Hand pricing back to the feed. */
  clearOverride(): void {
    this.manualOverride = null;
  }

  async quote(side: 'BUY' | 'SELL'): Promise<RateQuote> {
    const mid = this.manualOverride ?? inr(await this.provider.midRate());

    if (!mid.gt(0)) {
      throw new ServiceUnavailableException(
        'Pricing is unavailable: the feed returned a non-positive rate.',
      );
    }

    if (!this.manualOverride) {
      this.assertWithinBound(mid);
      this.lastGood = mid;
    }

    const factor = new Decimal(this.config.markupBps).div(10_000);
    const customer =
      side === 'SELL'
        ? mid.times(new Decimal(1).minus(factor))
        : mid.times(new Decimal(1).plus(factor));

    return {
      side,
      referenceRate: inrString(mid),
      customerRate: inrString(
        inr(customer.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)),
      ),
      markupBps: this.config.markupBps,
      provider: this.manualOverride ? 'admin-override' : this.provider.name,
      takenAt: new Date(),
    };
  }

  /**
   * Fails closed. The deviation bound is what stops a bad feed tick of ₹1,000
   * promising ₹97,000 on a 100 USDT sell. On a breach the system reports
   * pricing as unavailable rather than guessing at a safer number — a guess
   * here is still a price someone can trade against.
   */
  private assertWithinBound(candidate: Decimal): void {
    if (!this.lastGood) return; // nothing to deviate from yet

    const move = candidate
      .minus(this.lastGood)
      .abs()
      .div(this.lastGood)
      .times(10_000);
    if (move.gt(this.config.maxDeviationBps)) {
      throw new ServiceUnavailableException(
        `Pricing is unavailable: ${inrString(candidate)} deviates ${move.toFixed(0)}bps from the last known good rate ${inrString(this.lastGood)}, beyond the ${this.config.maxDeviationBps}bps bound.`,
      );
    }
  }
}
