# NEXORA PAY — Product Blueprint

**Brand:** NEXORA PAY  
**Tagline:** Your Digital Money. Your Way.  
**Status:** Development prototype (simulated balances, mock providers)  
**Architecture:** Modular monolith (React + NestJS + PostgreSQL)

This document is the source of product truth. Later phases extend it; they do not replace the original identity.

---

## 1. What NEXORA PAY is

NEXORA PAY is an original digital finance platform that unifies:

- P2P crypto trading (prototype / simulated ledger)
- Display-only USDT ↔ INR conversion quotes
- Buy and sell flows against matched merchants
- Mock UPI QR payment orchestration
- Digital wallet with available vs locked balances
- Escrow-style transaction locking (application-level, not legal custody)
- Merchant marketplace
- Simulated crypto deposits and withdrawals
- Gift cards (mock catalog and delivery)
- Mobile / DTH recharge and utility bills (mock providers)
- Transaction management, notifications, support
- Customer, merchant, and admin experiences on one backend

All money movement in this repository is **simulated**. Nothing here is a live bank, exchange, escrow agent, or licensed VDA platform.

---

## 2. Functional inspiration (not visual)

Public product categories were studied from a P2P payments marketplace (buy/sell crypto, QR pay, recharge, bills, gift cards, merchant filling). **NEXORA PAY does not copy that product’s UI, copy, branding, layout, or code.**

Original product rules:

- Distinct visual language (nocturne violet / mint, not generic crypto neon)
- Honest prototype labelling on every simulated figure
- No claims of RBI / FIU / insurance / non-custodial status
- No guaranteed merchant profit
- Backend owns balances, quotes, and order states

---

## 3. Roles

| Role | Base app route | Purpose |
|------|----------------|---------|
| `CUSTOMER` | `/customer` | Wallet, trade, pay, utilities, support |
| `MERCHANT` | `/merchant` | Fill orders, settlements, earnings |
| `ADMIN` | `/admin` | Oversight, ledger, disputes, catalog, audit |

Seeded demo accounts are labelled in the UI as simulated operators.

---

## 4. Tech stack (locked)

**Frontend:** React, TypeScript, Vite, React Router DOM, Tailwind CSS, shadcn/ui-style primitives, Framer Motion, Lucide React, TanStack Query, React Hook Form, Zod, Recharts.

**Backend:** Node.js, NestJS, TypeScript, REST, WebSocket (later phases).

**Data:** PostgreSQL, Prisma, Redis (OTP, sessions, cache, queues).

**Auth:** JWT access + rotating refresh tokens, mock OTP, RBAC, mock admin 2FA.

**Tooling:** Docker, Swagger, Jest, Playwright, ESLint, Prettier.

Do **not** split into microservices in this project.

---

## 5. Design system tokens (starting set)

| Token | Value |
|-------|--------|
| Background | `#0B1020` |
| Secondary bg | `#111A2E` |
| Surface | `#172238` |
| Accent | `#8B7CFF` |
| Accent 2 | `#43E6B2` |
| Text | `#F7F8FC` |
| Muted | `#A5AEC2` |
| Success | `#35C98A` |
| Warning | `#F5B94C` |
| Error | `#F06D7A` |

Typography: Inter. Radius: 12–20px. Motion: short, purposeful. Glass used sparingly.

---

## 6. Order / escrow state machine

Happy path: `CREATED` → `FUNDS_LOCKED` → `MATCHING` → `SELLER_ASSIGNED` → `PAYMENT_PENDING` → `PAYMENT_SUBMITTED` → `VERIFICATION` → `COMPLETED`

Failure: `CANCELLED` | `EXPIRED` | `REFUND_PENDING` | `REFUNDED` | `DISPUTED` | `FAILED`

Locked funds are not spendable. Transitions are authorized backend operations with idempotency keys and audit logs. UI clicks never release escrow by themselves.

---

## 7. Provider abstraction

Interfaces: `CryptoProvider`, `UPIProvider`, `GiftCardProvider`, `UtilityProvider`, `NotificationProvider`, `RateProvider`.

Phase 01 implementations: `Mock*` only. Real credentials never live in the frontend or in git.

---

## 8. Safety contract (must not be weakened)

- No real crypto custody, private keys, or seed phrases
- No real UPI / IMPS settlement
- No silent admin balance edits (ledger + audit only)
- Decimal money types; no JS float math for funds
- Frontend never trusted for balances, prices, or order status
- Prototype banners on simulated data

---

## 9. Phased delivery

Phases 00–23 as specified in the master prompt. **Current execution target:** Phase 00 docs + Phase 01 init + Phase 04 landing/auth identity + customer shell (visual milestone).

A later engineer must read `PROJECT_STATE.md` before writing code.
