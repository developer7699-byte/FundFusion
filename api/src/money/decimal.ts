import { Decimal } from 'decimal.js';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_DOWN });

export { Decimal };

export function d(value: string | Decimal): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

export function usdtAmount(value: string | Decimal): Decimal {
  return d(value).toDecimalPlaces(6, Decimal.ROUND_DOWN);
}

export function inrAmount(value: string | Decimal): Decimal {
  return d(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function moneyString(value: Decimal, places: number): string {
  return value.toFixed(places);
}
