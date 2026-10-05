export type RoleName = 'CUSTOMER' | 'MERCHANT' | 'ADMIN';

export type ProtoUser = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';
  roles: RoleName[];
  failedLoginCount: number;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
};

export type ProtoSession = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type ProtoOtp = {
  id: string;
  email: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
};

export type ProtoAccount = {
  userId: string;
  asset: 'USDT' | 'INR';
  available: string;
  locked: string;
};

export type LedgerDirection = 'DEBIT' | 'CREDIT';
export type LedgerAccountType = 'AVAILABLE' | 'LOCKED' | 'PLATFORM_FEE' | 'EXTERNAL';

export type ProtoLedgerEntry = {
  accountType: LedgerAccountType;
  direction: LedgerDirection;
  amount: string;
  asset: 'USDT' | 'INR';
  userId?: string;
};

export type ProtoLedgerTx = {
  id: string;
  reference: string;
  idempotency: string;
  memo: string;
  createdAt: Date;
  entries: ProtoLedgerEntry[];
};

export type ProtoActivity = {
  id: string;
  userId: string;
  type: string;
  status: string;
  asset: string;
  amount: string;
  createdAt: Date;
  simulated: true;
  metadata?: Record<string, string>;
};

export type ProtoDeposit = {
  id: string;
  userId: string;
  asset: 'USDT';
  network: string;
  address: string;
  amount: string;
  status: 'ADDRESS_READY' | 'BROADCAST_SIMULATED' | 'CONFIRMING' | 'COMPLETED';
  confirmations: number;
  requiredConfirmations: number;
  mockTxHash: string | null;
  createdAt: Date;
};

export type ProtoQuote = {
  id: string;
  userId: string;
  side: 'BUY' | 'SELL' | 'CONVERT';
  fromAsset: string;
  toAsset: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  feeAmount: string;
  expiresAt: Date;
  consumedAt: Date | null;
  merchantLabel: string;
};

export type ProtoAddress = {
  id: string;
  userId: string;
  asset: string;
  network: string;
  address: string;
  isDefault: boolean;
};

export type OrderStatus =
  | 'CREATED'
  | 'FUNDS_LOCKED'
  | 'MATCHING'
  | 'SELLER_ASSIGNED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_SUBMITTED'
  | 'VERIFICATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'DISPUTED'
  | 'FAILED';

export type ProtoOrder = {
  id: string;
  customerId: string;
  merchantId?: string;
  kind: 'SELL' | 'UPI_PAY' | 'BUY';
  status: OrderStatus;
  usdtAmount: string;
  inrAmount: string;
  feeAmount: string;
  upiId?: string;
  beneficiary?: string;
  utr?: string;
  proofNote?: string;
  timeline: { at: Date; status: OrderStatus; note: string }[];
  createdAt: Date;
};

export type ProtoNotice = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
};

export type ProtoTicket = {
  id: string;
  ownerId: string;
  category: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'RESOLVED' | 'CLOSED';
  messages: { id: string; authorId: string; body: string; at: Date }[];
  createdAt: Date;
};

export type ProtoGiftBrand = {
  id: string;
  slug: string;
  name: string;
  category: string;
  products: { id: string; denominationInr: string; usdtPrice: string }[];
};

export type ProtoGiftOrder = {
  id: string;
  userId: string;
  brandId: string;
  productId: string;
  status: string;
  mockCode: string | null;
  createdAt: Date;
};

export type ProtoUtilOrder = {
  id: string;
  userId: string;
  service: string;
  consumerId: string;
  amountInr: string;
  usdtDebit: string;
  status: string;
  createdAt: Date;
};

export type ProtoDispute = {
  id: string;
  orderId: string;
  ticketId: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_CUSTOMER' | 'RESOLVED_MERCHANT' | 'CLOSED';
  reason: string;
  createdAt: Date;
};

export type ProtoAudit = {
  id: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  reason: string;
  createdAt: Date;
};
