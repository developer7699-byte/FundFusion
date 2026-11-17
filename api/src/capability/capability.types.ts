export type CapabilityKey =
  'DEPOSIT' | 'WITHDRAW' | 'SEND' | 'P2P_BUY' | 'P2P_SELL';

export const CAPABILITY_KEYS: CapabilityKey[] = [
  'DEPOSIT',
  'WITHDRAW',
  'SEND',
  'P2P_BUY',
  'P2P_SELL',
];

export type RoleName = 'CUSTOMER' | 'MERCHANT' | 'SUPPORT' | 'SUPER_ADMIN';

export interface OverrideMeta {
  actorId: string | null;
  /** PRD §9.3: every override carries a reason. Blank is refused. */
  reason: string;
  /**
   * Optional, and it matters more than it looks: most denies are temporary
   * risk holds, and without an expiry they quietly become permanent.
   */
  expiresAt?: Date | null;
}
