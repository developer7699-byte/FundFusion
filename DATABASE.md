# Database — NEXORA PAY

PostgreSQL via Prisma. Money columns use `Decimal(36, 18)` for crypto and `Decimal(18, 2)` for INR display fields. Never persist JS floats as money.

## Core groups

**Identity:** User, Role, Session, OtpChallenge, CustomerProfile, MerchantProfile  

**Money:** Wallet, WalletAccount, LedgerTransaction, LedgerEntry, Asset, BlockchainNetwork  

**Movement:** Deposit, Withdrawal, Transfer, ConversionQuote  

**P2P:** P2POrder, Escrow, MerchantAssignment, PaymentProof, Settlement, Transaction  

**Catalog:** GiftCardBrand, GiftCardProduct, GiftCardOrder, UtilityService, UtilityOrder  

**Ops:** Notification, SupportTicket, SupportMessage, Dispute, AuditLog, SecurityEvent, SystemSetting  

## Rules

- UUIDs as primary keys
- Soft delete on users, catalogs, tickets where history matters
- Unique (wallet, asset, network) on accounts
- Indexes on userId, status, createdAt for operational queries
- Prototype seed must tag demo records clearly

Full Prisma schema lives in `api/prisma/schema.prisma`. Migrations are additive; do not reset production-like data without approval.
