# Changelog — NEXORA PAY

All notable project changes are recorded here.

## [0.2.0] — 2026-10-04

### Added

- In-memory mock prototype store (auth, wallets, activity)
- Decimal double-entry ledger with idempotency
- Mock deposit / send / withdraw / timed quotes
- Customer wallet screens bound to those APIs

### Notes

- No live chain, bank, or UPI calls. Process restart clears mock balances.

## [0.1.0] — 2026-10-04

### Added

- Project contract: `BLUEPRINT.md`, `PROJECT_STATE.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `API.md`, `TESTING.md`, `README.md`
- Monorepo layout: `apps/web` (Vite + React + TypeScript) and `apps/api` (NestJS + Prisma)
- Docker Compose for PostgreSQL and Redis
- Prisma schema foundation for identity, wallets, ledger, orders, and catalog entities
- Design system tokens and public marketing site
- Authentication screens (login, register, forgot password, OTP)
- Customer application shell with routed workspace pages
- Health and authentication APIs (prototype JWT + mock OTP)
- Simulated demo seed users (customer / merchant / admin)

### Notes

- All balances, quotes, and payments remain simulated.
- Gift cards, utilities, escrow engine, and admin console are scheduled for later phases.
