import type { PostingLine } from '../ledger/ledger.types';
import { Decimal, usdt, usdtString } from '../money/money';
import type { QuoteSnapshot } from './quote.service';

/** Who holds the escrow, and what the journal does with it. */
export interface Legs {
  escrowAccountId: string;
  escrowBucket: 'LOCKED';
  escrowAmount: string;
  lines: PostingLine[];
}

export interface Parties {
  customerAccountId: string;
  merchantAccountId: string;
}

/**
 * The settlement journals (PRD §6.3, §6.4), as pure functions.
 *
 * Shared by the ordinary path and by a dispute resolved in the counterparty's
 * favour, because those are the same movement decided two different ways. Two
 * copies would drift, and the one that drifted would be the one nobody
 * exercises until an admin is already in a dispute.
 */

/**
 * PRD §6.3. The customer's escrowed USDT splits between the merchant and
 * platform revenue, and the merchant's bond comes back in the same journal.
 */
export function sellLegs(
  quote: QuoteSnapshot,
  parties: Parties,
  bondUsdt: string,
): Legs {
  const quantity = usdt(quote.usdtAmount);
  const fee = usdt(quote.platformFeeUsdt);
  const bond = usdt(bondUsdt);

  return {
    escrowAccountId: parties.customerAccountId,
    escrowBucket: 'LOCKED',
    escrowAmount: usdtString(quantity),
    lines: nonZero([
      leg(parties.customerAccountId, 'LOCKED', 'DEBIT', quantity),
      leg(
        parties.merchantAccountId,
        'AVAILABLE',
        'CREDIT',
        quantity.minus(fee),
      ),
      platformLeg('REVENUE', 'CREDIT', fee),
      leg(parties.merchantAccountId, 'BONDED', 'DEBIT', bond),
      leg(parties.merchantAccountId, 'AVAILABLE', 'CREDIT', bond),
    ]),
  };
}

/**
 * PRD §6.4. The customer paid rupees straight into the merchant's bank, so
 * the platform charges the merchant in USDT out of what was locked at accept.
 */
export function buyLegs(quote: QuoteSnapshot, parties: Parties): Legs {
  const quantity = usdt(quote.usdtAmount);
  const fee = usdt(quote.platformFeeUsdt);
  const locked = quantity.plus(fee);

  return {
    escrowAccountId: parties.merchantAccountId,
    escrowBucket: 'LOCKED',
    escrowAmount: usdtString(locked),
    lines: nonZero([
      leg(parties.merchantAccountId, 'LOCKED', 'DEBIT', locked),
      leg(parties.customerAccountId, 'AVAILABLE', 'CREDIT', quantity),
      platformLeg('REVENUE', 'CREDIT', fee),
    ]),
  };
}

/**
 * Drop legs that carry nothing. The ledger refuses a zero leg, and rightly:
 * it is a movement that did not happen. The journal still balances, because
 * the amounts that remain are complements of each other.
 */
export function nonZero(lines: PostingLine[]): PostingLine[] {
  return lines.filter((line) => usdt(line.amount).gt(0));
}

export function leg(
  accountId: string,
  accountType: PostingLine['accountType'],
  direction: PostingLine['direction'],
  amount: Decimal,
): PostingLine {
  return {
    accountId,
    accountType,
    direction,
    amount: usdtString(usdt(amount.toFixed())),
    assetSymbol: 'USDT',
  };
}

export function platformLeg(
  accountType: PostingLine['accountType'],
  direction: PostingLine['direction'],
  amount: Decimal,
): PostingLine {
  return {
    accountType,
    direction,
    amount: usdtString(usdt(amount.toFixed())),
    assetSymbol: 'USDT',
  };
}
