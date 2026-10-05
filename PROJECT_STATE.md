# PROJECT_STATE — NEXORA PAY

Later engineers must read this file before writing code. Do not restart the repository.

## Current phase

**Prototype complete on mock rails (phases 00–19 surface coverage).** Playwright/perf/prod hardening remain optional.

## Current status

Working tree: `Projects/FundFusion` (`web/` + `api/`).

## Completed features

- Marketing site, auth, design system, theme toggle
- Mock ledger (Decimal, balanced, locked ≠ spendable)
- Wallet deposit/send/withdraw/quotes
- P2P/UPI orders with escrow states, merchant accept/UTR/complete, admin refund
- Gift cards, utilities, notifications, support
- Merchant and admin navigation for every specified route

## Known issues

- Store resets on API restart
- Some admin/merchant pages summarize mock data rather than every sub-filter
- Playwright not added
- PostgreSQL unused until credentials exist

## Next (optional)

Persist mock store to Postgres, WebSockets, Playwright, production secrets.

## Must not change

- Mock-only rails
- NEXORA PAY brand
- Decimal ledger / no silent admin edits
