import { Decimal as BaseDecimal } from 'decimal.js';

/**
 * v1 money primitives (PRD §5.1).
 *
 * A private Decimal constructor, so configuring it cannot disturb the global
 * one. Precision is deliberately far above the column scale: intermediate
 * products (a rate multiplied by a quantity) need headroom, and only the
 * boundary rounds.
 */
export const Decimal = BaseDecimal.clone({
  precision: 60,
  toExpNeg: -40,
  toExpPos: 40,
});
export type Decimal = InstanceType<typeof Decimal>;

/** NUMERIC(38,18): 18 fractional digits, leaving 20 for the integer part. */
const USDT_SCALE = 18;
const USDT_INTEGER_DIGITS = 20;

/** NUMERIC(20,2): 2 fractional digits, leaving 18 for the integer part. */
const INR_SCALE = 2;
const INR_INTEGER_DIGITS = 18;

function parse(
  value: string | Decimal,
  scale: number,
  integerDigits: number,
  label: string,
): Decimal {
  const dec =
    value instanceof BaseDecimal
      ? new Decimal(value.toFixed())
      : new Decimal(value);

  if (!dec.isFinite()) {
    throw new RangeError(
      `${label} must be a finite amount, received "${String(value)}".`,
    );
  }
  if (dec.decimalPlaces() > scale) {
    throw new RangeError(
      `${label} carries more precision than NUMERIC(${integerDigits + scale},${scale}) can hold: ` +
        `"${dec.toFixed()}" has ${dec.decimalPlaces()} decimal places, the limit is ${scale}.`,
    );
  }
  if (dec.abs().truncated().precision(true) > integerDigits) {
    throw new RangeError(
      `${label} is out of range for NUMERIC(${integerDigits + scale},${scale}): ` +
        `"${dec.toFixed()}" exceeds ${integerDigits} integer digits.`,
    );
  }
  return dec;
}

/** Parse a USDT amount, rejecting anything NUMERIC(38,18) cannot hold exactly. */
export function usdt(value: string | Decimal): Decimal {
  return parse(value, USDT_SCALE, USDT_INTEGER_DIGITS, 'USDT amount');
}

/** Parse an INR amount, rejecting anything NUMERIC(20,2) cannot hold exactly. */
export function inr(value: string | Decimal): Decimal {
  return parse(value, INR_SCALE, INR_INTEGER_DIGITS, 'INR amount');
}

/** Money crosses the application boundary as a string, never a number. */
export function usdtString(value: Decimal): string {
  return value.toFixed(USDT_SCALE);
}

export function inrString(value: Decimal): string {
  return value.toFixed(INR_SCALE);
}

export interface Rounded {
  value: Decimal;
  /** original - value. Posts to the ROUNDING account so the journal balances. */
  residue: Decimal;
}

/**
 * Customer payouts round DOWN, so the platform is never short by construction
 * (PRD §5.1). The residue is what the customer did not receive.
 */
export function payoutDown(value: Decimal, decimalPlaces: number): Rounded {
  const rounded = value.toDecimalPlaces(decimalPlaces, BaseDecimal.ROUND_DOWN);
  return { value: rounded, residue: value.minus(rounded) };
}

/**
 * Customer payables round UP, for the same reason. The residue is negative:
 * the customer paid marginally more than the exact figure.
 */
export function payableUp(value: Decimal, decimalPlaces: number): Rounded {
  const rounded = value.toDecimalPlaces(decimalPlaces, BaseDecimal.ROUND_UP);
  return { value: rounded, residue: value.minus(rounded) };
}
