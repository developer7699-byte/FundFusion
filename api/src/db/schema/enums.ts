import { pgEnum } from 'drizzle-orm/pg-core';

export const roleName = pgEnum('role_name', ['CUSTOMER', 'MERCHANT', 'ADMIN']);

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

export const orderStatus = pgEnum('order_status', [
  'CREATED',
  'FUNDS_LOCKED',
  'MATCHING',
  'SELLER_ASSIGNED',
  'PAYMENT_PENDING',
  'PAYMENT_SUBMITTED',
  'VERIFICATION',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
  'REFUND_PENDING',
  'REFUNDED',
  'DISPUTED',
  'FAILED',
]);

export const ticketStatus = pgEnum('ticket_status', [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_USER',
  'RESOLVED',
  'CLOSED',
]);

export const disputeStatus = pgEnum('dispute_status', [
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED_CUSTOMER',
  'RESOLVED_MERCHANT',
  'CLOSED',
]);
