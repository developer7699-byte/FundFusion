/**
 * Every commercially tunable number in the engine, in one place.
 *
 * Two rules govern this registry.
 *
 * **Bounds are not optional.** PRD §7 already insists that an admin's typed
 * rate is checked against the same deviation bound as a feed tick — a typed
 * input is no more trustworthy than a bad one. The same reasoning applies to
 * every number here: a markup of 90% or a buffer of 0% is a typo that reaches
 * real customers, and the moment to catch it is before it is stored.
 *
 * **Secrets are not settings.** No custody key, seed phrase, signer credential
 * or provider key ever appears in this registry or in `system_setting`. Those
 * live in the environment or a secret manager, outside the database and
 * outside anything an admin screen can read. A key that an admin can read is
 * a key that leaks with an admin account.
 */
export type SettingKind = 'INTEGER' | 'MONEY_USDT';

export interface SettingDefinition {
  kind: SettingKind;
  /** The value used until an admin sets one. */
  default: string | number;
  min: string | number;
  max: string | number;
  description: string;
}

export const PLATFORM_SETTINGS = {
  'rate.markupBps': {
    kind: 'INTEGER',
    default: 300,
    min: 0,
    max: 2000,
    description:
      'Admin-configured markup per side, in basis points (PRD §7). 300 = 3%.',
  },
  'rate.maxDeviationBps': {
    kind: 'INTEGER',
    default: 2000,
    min: 100,
    max: 10_000,
    description:
      'How far a feed tick or a typed override may move from the last known good rate before pricing fails closed (PRD §7).',
  },
  'quote.ttlSeconds': {
    kind: 'INTEGER',
    default: 90,
    min: 15,
    max: 600,
    description:
      'How long a quote may be confirmed at. Too long writes merchants a free option; too short kills conversion (PRD §6.9).',
  },
  'quote.buyFeeBps': {
    kind: 'INTEGER',
    default: 0,
    min: 0,
    max: 1000,
    description:
      'The buy-side fee charged to the merchant in USDT (PRD §6.4). Zero until the business sets it.',
  },
  'order.minUsdt': {
    kind: 'MONEY_USDT',
    default: '1',
    min: '0.000001',
    max: '1000000',
    description: 'Smallest order the engine will quote.',
  },
  'order.maxUsdt': {
    kind: 'MONEY_USDT',
    default: '10000',
    min: '0.000001',
    max: '1000000',
    description: 'Largest order the engine will quote.',
  },
  'eligibility.bufferBps': {
    kind: 'INTEGER',
    default: 1000,
    min: 500,
    max: 1000,
    description:
      'Collateral buffer above the obligation a merchant must hold to be eligible. PRD §6.5 fixes this between 5% and 10%.',
  },
  'order.searchWindowSeconds': {
    kind: 'INTEGER',
    default: 120,
    min: 30,
    max: 900,
    description: 'How long an order stays open to merchants (PRD §6.9).',
  },
  'order.payerWindowSeconds': {
    kind: 'INTEGER',
    default: 900,
    min: 300,
    max: 7200,
    description:
      'How long the payer has to send the rupees and submit a UTR. PRD §6.9 expects this to need widening — UPI limits and bank transfers do not always cooperate inside 15 minutes.',
  },
  'order.receiverWindowSeconds': {
    kind: 'INTEGER',
    default: 900,
    min: 300,
    max: 7200,
    description:
      'How long the receiver has to confirm the rupees arrived before the order escalates to DISPUTED (PRD §6.9).',
  },
  'abandonment.concurrentBuyOrderCap': {
    kind: 'INTEGER',
    default: 2,
    min: 1,
    max: 2,
    description:
      'Open buy orders one customer may hold at once. PRD §6.11 fixes this at one to two.',
  },
  'abandonment.cooldownBaseSeconds': {
    kind: 'INTEGER',
    default: 300,
    min: 60,
    max: 86_400,
    description:
      'First cooldown after a customer abandons once too often. It doubles with each further abandonment (PRD §6.11).',
  },
  'abandonment.forgiven': {
    kind: 'INTEGER',
    default: 1,
    min: 0,
    max: 5,
    description:
      'Abandonments that carry no cooldown. A first-time buyer whose bank app failed is not an attacker.',
  },
  'wallet.sweepThresholdUsdt': {
    kind: 'MONEY_USDT',
    default: '10',
    min: '0.000001',
    max: '1000000',
    description:
      'A deposit address is swept once it holds at least this much. Below it the BNB spent on the sweep costs more than the sweep moves (PRD §8.3).',
  },
  'wallet.gasTopUpBnb': {
    kind: 'MONEY_USDT',
    default: '0.002',
    min: '0.0001',
    max: '1',
    description:
      'BNB sent to a deposit address so it can pay for its own sweep. A freshly derived address has none — that is the BEP-20 gas trap (PRD §8.3).',
  },
  'wallet.gasFloorBnb': {
    kind: 'MONEY_USDT',
    default: '0.05',
    min: '0.001',
    max: '100',
    description:
      'Sweeping stops when the gas wallet falls below this. Running it dry halts every sweep while nothing errors and every dashboard stays green (PRD §13.3).',
  },
  'withdrawal.minUsdt': {
    kind: 'MONEY_USDT',
    default: '10',
    min: '0.000001',
    max: '100000',
    description:
      'The smallest withdrawal accepted. Below this the network fee is most of what moves.',
  },
  'withdrawal.feeUsdt': {
    kind: 'MONEY_USDT',
    default: '0',
    min: '0',
    max: '100',
    description:
      'A flat fee charged on top of the amount withdrawn, in USDT. Zero until the business sets it.',
  },
  'withdrawal.autoApproveUsdt': {
    kind: 'MONEY_USDT',
    default: '100',
    min: '0',
    max: '1000000',
    description:
      'Withdrawals at or below this auto-approve; anything above queues for manual review (PRD §8.4).',
  },
  'withdrawal.dailyCapUsdt': {
    kind: 'MONEY_USDT',
    default: '1000',
    min: '0.000001',
    max: '10000000',
    description:
      'How much one user may withdraw in a rolling 24 hours. The control that defeats the patient attacker withdrawing just under the threshold (PRD §8.4).',
  },
  'withdrawal.weeklyCapUsdt': {
    kind: 'MONEY_USDT',
    default: '5000',
    min: '0.000001',
    max: '10000000',
    description:
      'How much one user may withdraw in a rolling 7 days (PRD §8.4).',
  },
  'withdrawal.addressCooldownHours': {
    kind: 'INTEGER',
    default: 24,
    min: 0,
    max: 168,
    description:
      'How long a newly allowlisted address waits before it may be withdrawn to. The window in which the real owner sees the security email and intervenes (PRD §8.4).',
  },
  'dispute.penaltyBps': {
    kind: 'INTEGER',
    default: 1000,
    min: 0,
    max: 5000,
    description:
      "Compensation drawn from a defaulting merchant's bond, in basis points of the order (PRD §6.10). Capped well below the bond on purpose: full forfeiture over a genuine bank outage would dry up merchant supply.",
  },
  'dispute.defaultsBeforePause': {
    kind: 'INTEGER',
    default: 3,
    min: 1,
    max: 20,
    description:
      'How many disputes resolved against a merchant pause their desk (PRD §6.10).',
  },
  'reconciliation.dustToleranceUsdt': {
    kind: 'MONEY_USDT',
    default: '0.01',
    min: '0',
    max: '100',
    description:
      'How far total ledger USDT may sit from on-chain custody before reconciliation alerts (PRD §13.1). Covers rounding dust, not a missing deposit.',
  },
} as const satisfies Record<string, SettingDefinition>;

export type SettingKey = keyof typeof PLATFORM_SETTINGS;

export const SETTING_KEYS = Object.keys(PLATFORM_SETTINGS) as SettingKey[];

/**
 * What the engine needs from the registry.
 *
 * Services depend on this rather than on the service that implements it, so a
 * unit test can supply the two or three numbers it cares about without a
 * database, while production reads every one of them from the same place an
 * admin edits.
 */
export interface SettingsReader {
  integer(key: SettingKey): Promise<number>;
  money(key: SettingKey): Promise<string>;
}

/** The documented defaults, for tests that care about one number. */
export function fixedSettings(
  overrides: Partial<Record<SettingKey, string | number>> = {},
): SettingsReader {
  const value = (key: SettingKey) =>
    overrides[key] ?? PLATFORM_SETTINGS[key].default;
  return {
    integer: (key) => Promise.resolve(Number(value(key))),
    money: (key) => Promise.resolve(String(value(key))),
  };
}
