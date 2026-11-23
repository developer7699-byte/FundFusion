import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Decimal, inr, inrString } from '../money/money';
import {
  fixedSettings,
  type SettingsReader,
} from '../settings/platform-settings';
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

/**
 * Both numbers come from the admin-editable registry, read per quote: a
 * markup change is a commercial decision, not a deploy (PRD §7).
 */

@Injectable()
export class RateService {
  private lastGood: Decimal | null = null;
  /** An active admin override. While set, it IS the reference rate. */
  private manualOverride: Decimal | null = null;

  constructor(
    private readonly provider: RateProvider,
    private readonly settings: SettingsReader = fixedSettings(),
  ) {}

  /**
   * PRD §7. An admin may override the rate manually, bounded by the same
   * maximum deviation that guards the feed — a typed input is no more
   * trustworthy than a bad tick.
   */
  async override(rate: string): Promise<void> {
    const value = inr(rate);
    await this.assertWithinBound(value);
    this.manualOverride = value;
    this.lastGood = value;
  }

  /** Hand pricing back to the feed. */
  clearOverride(): void {
    this.manualOverride = null;
  }

  /**
   * A read-only mid rate, for an indicative "≈ ₹" display (PRD §13.5).
   *
   * Unlike {@link quote}, it never assigns `lastGood`: a dashboard or activity
   * read must not move the §7 deviation baseline that protects real quotes,
   * and this service is a shared singleton that pricing also depends on. It
   * still honours an admin override and still rejects a non-positive or
   * out-of-bound tick, because an estimate built on a bad feed is still wrong.
   */
  async indicative(): Promise<string> {
    const mid = this.manualOverride ?? inr(await this.provider.midRate());

    if (!mid.gt(0)) {
      throw new ServiceUnavailableException(
        'Pricing is unavailable: the feed returned a non-positive rate.',
      );
    }

    if (!this.manualOverride) {
      await this.assertWithinBound(mid); // reads lastGood; never writes it
    }

    return inrString(mid);
  }

  async quote(side: 'BUY' | 'SELL'): Promise<RateQuote> {
    const mid = this.manualOverride ?? inr(await this.provider.midRate());

    if (!mid.gt(0)) {
      throw new ServiceUnavailableException(
        'Pricing is unavailable: the feed returned a non-positive rate.',
      );
    }

    if (!this.manualOverride) {
      await this.assertWithinBound(mid);
      this.lastGood = mid;
    }

    const markupBps = await this.settings.integer('rate.markupBps');
    const factor = new Decimal(markupBps).div(10_000);
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
      markupBps,
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
  private async assertWithinBound(candidate: Decimal): Promise<void> {
    if (!this.lastGood) return; // nothing to deviate from yet

    const maxDeviationBps = await this.settings.integer('rate.maxDeviationBps');

    const move = candidate
      .minus(this.lastGood)
      .abs()
      .div(this.lastGood)
      .times(10_000);
    if (move.gt(maxDeviationBps)) {
      throw new ServiceUnavailableException(
        `Pricing is unavailable: ${inrString(candidate)} deviates ${move.toFixed(0)}bps from the last known good rate ${inrString(this.lastGood)}, beyond the ${maxDeviationBps}bps bound.`,
      );
    }
  }
}
