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
