/** PRD §5.2. The four buckets a user's balance is split across. */
export type Bucket = 'AVAILABLE' | 'LOCKED' | 'BONDED' | 'PENDING';

export const BUCKETS: Bucket[] = ['AVAILABLE', 'LOCKED', 'BONDED', 'PENDING'];

export type LedgerAccountType =
  | Bucket
  | 'PLATFORM_FEE'
  | 'ESCROW'
  | 'EXTERNAL'
  | 'ROUNDING'
  | 'REVENUE';

export interface PostingLine {
  /** Omitted for platform-side accounts that belong to no user wallet. */
  accountId?: string;
  accountType: LedgerAccountType;
  direction: 'DEBIT' | 'CREDIT';
  /** Decimal string. A JavaScript number never holds money (PRD §5.1). */
  amount: string;
  assetSymbol: string;
}

export interface PostingRequest {
  idempotencyKey: string;
  memo: string;
  lines: PostingLine[];
}

export interface PostingResult {
  id: string;
  replayed: boolean;
}
