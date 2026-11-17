import { numeric } from 'drizzle-orm/pg-core';

/**
 * PRD §5.1. USDT is NUMERIC(38,18) — BEP-20 has 18 decimals, and 38 total
 * digits leaves 20 for the integer part. INR is NUMERIC(20,2).
 *
 * Both read back as strings. A JavaScript `number` never holds money, so these
 * helpers exist to make the precision impossible to get wrong one column at a
 * time.
 */
export const usdt = (name: string) =>
  numeric(name, { precision: 38, scale: 18 });
export const inr = (name: string) => numeric(name, { precision: 20, scale: 2 });
