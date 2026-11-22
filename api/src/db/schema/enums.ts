import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * PRD §9.2. Two admin roles in v1: SUPPORT reads everything and moves no money,
 * SUPER_ADMIN does everything. The essential separation is between people who
 * look at things and people who move money — a support account able to release
 * escrow is the most common insider-fraud path in platforms like this.
 */
export const roleName = pgEnum('role_name', [
  'CUSTOMER',
  'MERCHANT',
  'SUPPORT',
  'SUPER_ADMIN',
]);

/**
 * PRD §9.3. Features declare named capabilities. The deferred GIFT_CARD and
 * UTILITY keys are deliberately absent: §18 says they re-enter by registering
 * a capability, and pre-declaring them here would defeat that.
 */
export const capabilityKey = pgEnum('capability_key', [
  'DEPOSIT',
  'WITHDRAW',
  'SEND',
  'P2P_BUY',
  'P2P_SELL',
]);

export const grantEffect = pgEnum('grant_effect', ['ALLOW', 'DENY']);

export const userStatus = pgEnum('user_status', [
  'PENDING_VERIFICATION',
  'ACTIVE',
  'SUSPENDED',
  'CLOSED',
]);

export const merchantStatus = pgEnum('merchant_status', [
  'APPLIED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'ACTIVE',
  'INACTIVE',
]);

export const otpPurpose = pgEnum('otp_purpose', [
  'REGISTER',
  'LOGIN',
  'RESET_PASSWORD',
  'ADMIN_2FA',
]);

export const ledgerDirection = pgEnum('ledger_direction', ['DEBIT', 'CREDIT']);

/**
 * PRD §5.2 defines four wallet buckets: available, locked, bonded and pending.
 * PRD §5.1 requires a dedicated ROUNDING account so a dropped sub-paisa residue
 * cannot silently unbalance a journal. REVENUE is the platform's own earnings
 * account, which the settlement journals in §6.3 and §6.4 post into.
 */
export const ledgerAccountType = pgEnum('ledger_account_type', [
  'AVAILABLE',
  'LOCKED',
  'BONDED',
  'PENDING',
  'PLATFORM_FEE',
  'ESCROW',
  'EXTERNAL',
  'ROUNDING',
  'REVENUE',
]);

/**
 * PRD §6.6. Exactly the states the spec's machine names — no more. The
 * previous fourteen values were the prototype's and described a different
 * flow; a state nothing can reach is a state someone will eventually write
 * into the column by hand.
 */
export const orderStatus = pgEnum('order_status', [
  'QUOTED',
  'AWAITING_MERCHANT',
  'ACCEPTED',
  'PAYMENT_SUBMITTED',
  'COMPLETED',
  'DISPUTED',
  'REFUNDED',
  'EXPIRED',
]);

export const ticketStatus = pgEnum('ticket_status', [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_USER',
  'RESOLVED',
  'CLOSED',
]);

/**
 * PRD §6.10's closed list, stated so it holds on both sides of a trade.
 *
 * RELEASE pays the escrow to the counterparty as a normal settlement would —
 * the payer did pay. REFUND returns it to whoever posted it — they did not.
 * SPLIT divides it. REFUND_WITH_PENALTY refunds in full and draws
 * compensation from the defaulting party's bond.
 */
export const disputeOutcome = pgEnum('dispute_outcome', [
  'RELEASE',
  'REFUND',
  'SPLIT',
  'REFUND_WITH_PENALTY',
]);

export const disputeStatus = pgEnum('dispute_status', [
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED_CUSTOMER',
  'RESOLVED_MERCHANT',
  'CLOSED',
]);

export const quoteSide = pgEnum('quote_side', ['BUY', 'SELL']);

/**
 * PRD §6.2. A customer enters either a USDT quantity or an INR amount and the
 * system solves for the other. This records which one they typed: that side is
 * exact, and the derived side absorbs the remainder. A dispute six months
 * later can then show which figure was authoritative rather than arguing about
 * a paisa.
 */
export const authoritativeSide = pgEnum('authoritative_side', [
  'CRYPTO',
  'FIAT',
]);

/**
 * PRD §6.3/§6.4. A payee's INR destination for the manual bank-to-bank leg.
 * A UPI VPA here is a static payee address the payer sends to — not a scanned
 * QR, which is a §3 non-goal.
 */
export const paymentMethodType = pgEnum('payment_method_type', ['BANK', 'UPI']);
