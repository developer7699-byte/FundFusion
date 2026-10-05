# Security — NEXORA PAY

This repository is a **development prototype**. Treat it as unlicensed software, not a payments institution.

## Implemented / in progress (Phase 01)

- Role-based route and API guards
- Password hashing with bcrypt
- Zod / class-validator input validation
- Prisma parameterized queries
- CORS limited to the SPA origin
- Environment-based secrets (`.env`, never committed)
- Prototype banners so simulated money is not mistaken for live funds

## Required as modules land

- Refresh-token rotation and reuse detection
- Login and OTP throttling (Redis)
- Rate limiting
- Idempotency keys on money mutations
- Audit log for every ledger and admin action
- CSRF strategy if cookie sessions are enabled
- Strict file-upload MIME/size checks
- Admin 2FA (mocked)

## Never

- Store wallet private keys or seed phrases
- Put secrets in the frontend
- Trust client-supplied balances, prices, or statuses
- Claim RBI / FIU / insurance / legal approval
- Perform real UPI, crypto chain, gift-card, or utility settlement
- Let admins silently rewrite balances

Before any production integration, qualified counsel and licensed providers must review Indian VDA, AML/KYC, PMLA, tax, and data-protection requirements.
