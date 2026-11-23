import { ServiceUnavailableException } from '@nestjs/common';
import { Decimal, inr, inrString } from '../money/money';

/**
 * PRD §7: a pluggable rate provider sits behind an interface. CoinDCX is the
 * recommended primary (public, no key, FIU-registered Indian venue); a second
 * source is what makes the deviation check meaningful, because a bad tick on
 * one venue is only visible when another disagrees.
 */
export interface RateProvider {
  readonly name: string;
  /** Mid-market USDT/INR as a decimal string. */
  midRate(): Promise<string>;
}

/** Deterministic provider for tests and local development. */
export class MockRateProvider implements RateProvider {
  readonly name = 'mock';
  private value = '97.00';

  next(value: string): void {
    this.value = value;
  }

  midRate(): Promise<string> {
    return Promise.resolve(this.value);
  }
}

const COINDCX_TICKER_URL = 'https://api.coindcx.com/exchange/ticker';
const USDT_INR_MARKET = 'USDTINR';
const FETCH_TIMEOUT_MS = 5_000;
/** A dashboard load prices twice (summary + activity); other viewers follow.
 *  A short cache turns that traffic into one upstream call, not a per-request
 *  hit on the venue. The §7 deviation guard still sees every served value. */
const CACHE_TTL_MS = 15_000;

interface CoinDcxTicker {
  market: string;
  bid: string;
  ask: string;
  last_price: string;
}

/**
 * The live USDT/INR feed (docs/DEPENDENCIES.md §3.1).
 *
 * CoinDCX's public ticker needs no key. The mid is the bid/ask midpoint,
 * falling back to last_price. Every number is parsed with the decimal library
 * and rounded to the 2dp INR scale (PRD §5.1), because the rate registry and
 * every quote derived from it are INR and `RateService` parses this as INR.
 *
 * Fails as `ServiceUnavailableException` only — never a raw throw — so the
 * pricing guard above can fail closed on a quote and soft to null on a display
 * read, rather than leaking a fetch error to the caller.
 */
export class CoinDcxRateProvider implements RateProvider {
  readonly name = 'coindcx';
  private cached: { value: string; at: number } | null = null;

  constructor(private readonly now: () => number = Date.now) {}

  async midRate(): Promise<string> {
    if (this.cached && this.now() - this.cached.at < CACHE_TTL_MS) {
      return this.cached.value;
    }

    const row = (await this.fetchTickers()).find(
      (t) => t.market === USDT_INR_MARKET,
    );
    if (!row) {
      throw new ServiceUnavailableException(
        `CoinDCX has no ${USDT_INR_MARKET} market.`,
      );
    }

    try {
      const bid = new Decimal(row.bid);
      const ask = new Decimal(row.ask);
      const mid =
        bid.gt(0) && ask.gt(0)
          ? bid.plus(ask).div(2)
          : new Decimal(row.last_price);
      if (!mid.isFinite() || !mid.gt(0)) {
        throw new Error('non-positive mid');
      }
      const value = inrString(inr(mid.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)));
      this.cached = { value, at: this.now() };
      return value;
    } catch {
      throw new ServiceUnavailableException(
        `CoinDCX returned an unusable ${USDT_INR_MARKET} price.`,
      );
    }
  }

  private async fetchTickers(): Promise<CoinDcxTicker[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(COINDCX_TICKER_URL, { signal: controller.signal });
      if (!res.ok) {
        throw new ServiceUnavailableException(
          `CoinDCX ticker returned ${res.status}.`,
        );
      }
      return (await res.json()) as CoinDcxTicker[];
    } catch (e) {
      if (e instanceof ServiceUnavailableException) throw e;
      throw new ServiceUnavailableException(
        'CoinDCX price feed is unreachable.',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
