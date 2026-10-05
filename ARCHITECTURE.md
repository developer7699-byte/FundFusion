# Architecture — NEXORA PAY

## Shape

Modular monolith.

```
NexoraPay/
  web/     Vite React SPA
  api/     NestJS REST (+ later WebSocket)
  docker-compose.yml
```

The SPA talks only to `api` over HTTP. Balances, quotes, and order states are owned by the API and PostgreSQL. Redis holds OTP, refresh-token denylist/rotation metadata, and cache.

## Request path

Browser → React Router (role layouts) → TanStack Query → `web/src/lib/api.ts` → NestJS controllers → services → Prisma (transactional) → PostgreSQL.

## Auth

- Access JWT (short-lived)
- Refresh JWT (rotating, hashed at rest)
- HttpOnly cookie optional; prototype also returns tokens for local SPA
- RBAC guards: `CUSTOMER`, `MERCHANT`, `ADMIN`
- Mock OTP (never a real SMS gateway in Phase 01)

## Ledger (from Phase 06)

Double-entry: every `LedgerTransaction` has balanced `LedgerEntry` rows. Wallet `available` / `locked` are derived or maintained in the same DB transaction as entries. No silent admin edits.

## Providers

Core services depend on interfaces. Phase 01 ships `MockRateProvider` and `MockNotificationProvider` stubs. Other mocks land with their modules.

## What is out of scope for the first milestone

Merchant/admin full consoles, escrow engine, gift cards, utilities, Playwright suite, production hardening.
