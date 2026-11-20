/**
 * The order state machine (PRD §6.6).
 *
 * The table is the whole machine: a transition absent from it is refused.
 * Two properties matter more than the individual rows. A terminal state has
 * no exit — once money has settled or returned, nothing moves it again. And
 * no waiting state reaches a paying state directly, because **a timeout may
 * return funds to where they started but may never advance them to someone's
 * benefit** (PRD §6.9). Escrow that pays out on silence gets farmed.
 */
export const ORDER_STATES = [
  'QUOTED',
  'AWAITING_MERCHANT',
  'ACCEPTED',
  'PAYMENT_SUBMITTED',
  'COMPLETED',
  'DISPUTED',
  'REFUNDED',
  'EXPIRED',
] as const;

export type OrderState = (typeof ORDER_STATES)[number];

const TRANSITIONS: Record<OrderState, OrderState[]> = {
  QUOTED: ['AWAITING_MERCHANT', 'EXPIRED'],
  AWAITING_MERCHANT: ['ACCEPTED', 'EXPIRED'],
  ACCEPTED: ['PAYMENT_SUBMITTED', 'DISPUTED'],
  PAYMENT_SUBMITTED: ['COMPLETED', 'DISPUTED'],
  DISPUTED: ['COMPLETED', 'REFUNDED'],
  COMPLETED: [],
  REFUNDED: [],
  EXPIRED: [],
};

export function canTransition(from: string, to: string): boolean {
  const allowed = TRANSITIONS[from as OrderState];
  return Boolean(allowed?.includes(to as OrderState));
}
