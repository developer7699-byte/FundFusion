# Changelog — FundFusion

All notable project changes are recorded here.

## [0.3.2] — 2026-11-22

Payment methods and the INR payee instruction (PRD §6.3/§6.4) — the first of
the gap endpoints the approved UI needs. Lets the manual bank-to-bank leg
actually be paid: the payer can now see where to send the rupees.

### Added

- `payment_method` (a user's bank/UPI payee destinations) and
  `order_payment_instruction` (the payee frozen onto an order, immutable like
  the quote). Reference data — no ledger, no money.
- `PaymentMethodService` and `GET/POST/DELETE/PATCH /v1/wallet/payment-methods`,
  behind the money gate. Validated IFSC/account/VPA, soft delete, one default
  per user, object-level scoping.
- The engine binds a payee at the money-leg boundary: the customer's method on
  a sell (at confirm), the merchant's on a buy (at accept). A party reads the
  full instruction on the order's detail; a trade with no payee method is
  refused with `422 NO_PAYMENT_METHOD` before anything locks.

## [0.3.1] — 2026-11-22

Finish M0 repo hygiene: the prototype surface is gone (PRD §14 M0, "dead
surface gone").

### Removed

- The in-memory prototype store and everything that rode it: the mock wallet
  (`wallet/wallet.service`), mock providers (`providers/mock-*`), the prototype
  ledger, the old prototype `AuthModule` and its guards, and the `ops` bridge
  (notifications + support). The ops routes ran on the prototype store and
  already 401'd under v1 auth — `JWT_ACCESS_SECRET` is not even set — so nothing
  real depended on them. Notifications and support return in M6 on the
  ledger-backed database.
- `money/decimal.ts` (the prototype's global Decimal setup); v1 money uses
  `money/money.ts`.

### Changed

- `GET /health` no longer advertises `mode: mock-prototype`; it reports the
  service name and `status: ok`.
- `removed-routes` e2e now asserts the six ops routes return 404.

## [0.3.0] — 2026-11-18

v1 rebuild begins. See `docs/PRD.md`; milestone M0 of §14.

### Changed

- Scope stripped to the v1 PRD. Gift cards, game top-ups, utilities, UPI QR
  scan-and-pay, referrals, rewards and the leaderboard are removed from both
  the web surface and the API (PRD §3).
- Prisma replaced by Drizzle. The schema is translated with five corrections
  the PRD pins: USDT is `NUMERIC(38,18)` and INR `NUMERIC(20,2)` (§5.1);
  `wallet_account` no longer carries `available`/`locked` balance columns,
  because the ledger is the only truth (§5 rule 1); `ledger_account_type`
  gains `BONDED`, `PENDING`, `ROUNDING` and `REVENUE` (§5.1, §5.2); and the
  gift-card and utility tables are dropped (§3).
- The displayed product name is now the `PLATFORM_NAME` config key. The
  package and repository stay `fundfusion` (§11).
- The workspace lockfile was regenerated. The previous one carried a single
  `resolved` URL across 10,171 lines and keyed every package under
  `api/node_modules/`, so `npm ci` could not work.

### Added

- GitHub Actions CI: lint, typecheck, test, end-to-end and build, against a
  real PostgreSQL service (§13.4).
- Vitest in `web`, with a route test asserting removed routes render 404.

### Fixed

- `MerchantOrdersPage.tsx` had unbalanced JSX and did not parse.
- Nine `react-hooks/rules-of-hooks` violations where hooks ran after an early
  return.
- A duplicated ternary in `CustomerProfilePage.tsx` that was always truthy.

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
