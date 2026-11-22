# Design — Port the `main` UI onto the real v1 API

Date: 2026-11-22
Branch: `feat/v1-rebuild`
Status: approved approach, pre-build
Decisions of record: `questions/data.js` round `ui-r1`

## Intent and why

The `main` branch holds a finished, polished product UI for FundFusion —
customer, merchant and admin surfaces, laid out and styled. It was built
against a prototype backend that no longer exists. The `feat/v1-rebuild`
branch holds the real product: a ledger-true v1 API (auth, wallet on BSC
testnet, P2P engine, disputes, reconciliation) with a plain, parked "spine"
UI wired to it and under test.

We want the `main` design to become the real application: its exact screens
and layout, driven by the live v1 API instead of mock data. The spine proved
the wiring; now the product wears its real face.

Not a shipping step. Nothing goes to real users in this work. This is an
internal, testnet-only build. That framing is what makes the out-of-scope
decision below acceptable.

## Goals

- The customer core loop works end to end on the `main` design, against v1 on
  testnet: sign in (with MFA), see wallet, deposit (receive), withdraw (send),
  buy, sell, manage payment methods, read an order's detail incl. the frozen
  payee instruction.
- Every figure on screen comes from the ledger via v1. No JavaScript `number`
  ever holds money; money stays a string end to end (PRD §5.3).
- No screen offers an action the order's state forbids.
- `main`'s visual design, layout and component positions are preserved exactly
  for the screens we keep.

## Non-goals

- Merchant and admin surfaces beyond what the customer loop needs. They come in
  a later slice; the v1 endpoints exist (`/v1/p2p/merchant/*`, `/v1/admin/*`).
- Notifications, support, PWA. Later (PRD M6).
- Any backend change. This is UI-and-wiring only. If a screen needs an endpoint
  that does not exist, that is a finding to raise, not a thing to build here.

## Anti-goals (failure even if it "works")

- Shipping, or wiring, any PRD §3 out-of-scope feature: gift cards, game
  top-ups, utilities, UPI QR scan-and-pay, convert, multi-asset (BTC/ETH),
  verification tiers, staking. Not even a working-but-hidden one.
- A money figure that passed through a float, or a balance read from anything
  but the ledger.
- A tile that looks actionable and silently does nothing in a way a user would
  read as a bug (see the inert-element rule — it must read as deliberate).

## Constraints

- **CLAUDE.md money rules (PRD §5):** ledger is the only truth; money is a
  string computed with a decimal library; USDT `NUMERIC(38,18)`, INR
  `NUMERIC(20,2)`; money mutations carry an `Idempotency-Key`.
- **CLAUDE.md scope (PRD §3):** do not build out-of-scope features, and do not
  leave **routes or tables** for them lying around. This design keeps that line
  firm — see the inert rule: no route, no table, no API, no store behind a
  parked tile; only its disabled face.
- **One client, one session.** v1 client is `web/src/lib/api.ts`: `v1<T>(path,
  init)`, token keys `ff.access` / `ff.refresh`, `newIdempotencyKey()`, session
  helpers, auto-refresh on 401. `main`'s own `api()` (base `/api`, token
  `nx.access`, fallback-to-mock) is the deleted prototype's client and is **not**
  reused.

## Approaches considered

1. **Reskin the current spine.** Keep the spine screens (already v1-wired,
   tested) and restyle them to resemble `main`. — Rejected: a reskin reaches
   "close to main", not "exactly main"; the owner wants the exact design, and
   `main`'s screen *structure*, not just its colours, is the asset.
2. **Port `main`'s screens, rewire to v1 (chosen).** Drop the spine's screen
   components; bring `main`'s screen components across; strip out-of-scope;
   replace every `main` data call (prototype `api()` + mock fallback) with the
   v1 client. Keep `lib/api.ts` and `lib/auth.ts` — the tested plumbing — and
   keep the spine's v1 call sites as the copy-reference for how each endpoint is
   consumed.
3. **Fresh branch from `main`.** Start from `main`, delete out-of-scope, rewire.
   — Rejected: discards the v1 client, auth and the passing integration tests
   that already live on `feat/v1-rebuild`; reintroduces the prototype client we
   deleted in M0.

Chosen: **2.** It is the only path that yields `main`'s exact UI while keeping
the money wiring that already works and is tested.

## Decisions of record (from `ui-r1`)

- **Q1 → "exact" = visual design/layout/components of `main`, v1-legal screens
  only.** Banned screens are not ported as working features.
- **Q2 → port `main`, rewire to v1.** "Drop current UI" drops the spine's
  *screen components only*. `lib/api.ts` (v1 client) and `lib/auth.ts` stay.
- **Q3 → first slice:** auth + wallet (deposit/receive + withdraw/send) + buy +
  sell + payment-methods + order detail. The smallest set where money
  round-trips on screen.
- **Q4 → out-of-scope elements stay as inert UI (owner override of the
  delete-it default), under the three conditions below.** This deviates from
  CLAUDE.md's "no out-of-scope surface" on its face, deliberately, because this
  is a pre-ship internal build and the full design is the reference artifact.
  **Recorded here so no later reader/subagent strips the tiles as a spec
  violation.**
- **Q5 → drop multi-asset.** Wallet shows USDT balance + INR estimate only,
  matching the ledger. No BTC/ETH rows.

### The inert-element rule (Q4 conditions)

A parked out-of-scope affordance (gift-cards, utilities, scan-pay, convert,
request-money, referrals, rewards, and the like):

1. **Face only.** No route, no nav target, no API call, no store, no table
   behind it. The CLAUDE.md hard line ("no routes or tables") stays intact — only
   the visual tile/button remains, in its `main` position.
2. **One explicit pattern.** All parked affordances render through a single,
   clearly-named disabled component (e.g. `<ParkedAction>` / a `coming-soon`
   variant) so they read as *deliberate*, not dead-by-accident. A tap gives a
   neutral "not available yet" affordance, never a silent no-op and never a 404
   route.
3. **Written down** — this document. Testing phase may prune or revive these;
   that is a future decision, not this build's.

## The how, as decided

### Screen → v1 endpoint map (first slice)

| `main` screen | v1 endpoint(s) | Notes |
|---|---|---|
| Login / Register / VerifyOtp | `POST /v1/auth/login` → `/login/verify`; `/register` → `/register/verify`; `POST /v1/auth/mfa/begin` → `/mfa/confirm`; `POST /v1/auth/refresh`; `GET /v1/auth/me` | MFA is the money gate. Copy the spine's auth call sites. |
| CustomerDashboard | `GET /v1/wallet/summary`; P2P rates from `POST /v1/p2p/quotes` | USDT + INR estimate only. |
| WalletHome | `GET /v1/wallet/summary`, `GET /v1/wallet/activity` | No multi-asset. |
| Deposit / Receive | `GET /v1/wallet/address` | Deposit address = "receive". No "simulate" button — real on-chain deposit. After showing the address, poll `GET /v1/wallet/activity` (or `/summary`) for a pending→confirmations→credited state; the ledger credits at 15 confirmations (PRD M3). Builder's call on the exact pending affordance. |
| Withdraw / Send | `GET/POST /v1/wallet/allowlist`, `POST /v1/wallet/withdrawals` | "Send" = external withdrawal to an allowlisted address; cooldown + OTP per PRD. |
| Buy / Sell (QuoteFlow) | `POST /v1/p2p/quotes` → `POST /v1/p2p/orders` (`Idempotency-Key`) → `GET /v1/p2p/orders/:id`; then the customer's completion action **by side** (matrix below) | `convert` side is parked (inert). |
| Payment methods | `GET/POST /v1/wallet/payment-methods`, `PATCH :id/default`, `DELETE :id` | New in 0.3.2. |
| Order detail | `GET /v1/p2p/orders/:id` | Shows the frozen payee instruction (where to send the rupees). |

Endpoints out of this slice: `/v1/p2p/merchant/*`, `/v1/admin/*`, disputes.
**Correction to an earlier draft:** `POST /v1/p2p/orders/:id/utr` is a *customer*
action on a BUY (the customer is the payer) and is **in** this slice;
`/accept` is the merchant action and is out.

### Order-state × side → customer action

States (`order.state.ts`): `QUOTED → AWAITING_MERCHANT → ACCEPTED →
PAYMENT_SUBMITTED → COMPLETED`, plus `DISPUTED / REFUNDED / EXPIRED`. The
customer's available action differs by side; every other state is a read-only
waiting view, and the order-detail component renders exactly the one action the
state allows (anti-goal: never offer a forbidden action).

| State | SELL (customer sells USDT, receives INR) | BUY (customer buys USDT, pays INR) |
|---|---|---|
| QUOTED | create order | create order |
| AWAITING_MERCHANT | wait (read-only) — see counterparty open question | wait (read-only) |
| ACCEPTED | wait for merchant to pay INR | **submit UTR** (`/utr`) — customer is payer; payee instruction now bound |
| PAYMENT_SUBMITTED | **confirm receipt** (`/confirm`) — customer received INR | wait for receiver to confirm |
| COMPLETED / DISPUTED / REFUNDED / EXPIRED | read-only | read-only |

`payeeInstruction` on the order is null until a counterparty binds it; the UI
shows "awaiting payee" until then, then the frozen bank/UPI destination.

### Money handling

- All amounts are strings from the API to the DOM. Use `main`'s existing
  `inr()` / `usdt()` formatters for *display only*; never parse a money string
  to a `number` for arithmetic. Any arithmetic (totals, fees) uses the value the
  API already computed — the UI does not re-derive money.
- Every order-creating / withdrawal POST sends an `Idempotency-Key` via
  `newIdempotencyKey()`.

### What carries over, what is dropped

- **Keep:** `lib/api.ts`, `lib/auth.ts`, `lib/utils.ts` (formatters), the
  design-system components (`components/ui/*`, `components/brand/*`), the v1
  integration tests.
- **Port from `main` / this branch's richer tree:** the customer screen
  components and layouts for the slice above, in their `main` layout.
- **Drop:** `main`'s `api()` prototype client and its mock fallbacks; the
  spine's plain screen components once their `main` replacement is wired;
  multi-asset data shapes.
- **Park (inert):** out-of-scope tiles, per the inert rule.

## What's left to the builder

- Choose the mechanical port order within the slice (auth → wallet → quote/order
  → payment-methods is the natural dependency order; the spine already shows
  each call site).
- Name and place the single `<ParkedAction>` pattern and its "not available yet"
  affordance.
- Reconcile any `main` screen that assumes a field the v1 response does not
  carry: prefer the v1 shape, and raise anything that looks like a missing
  endpoint rather than inventing one.
- Keep `lint`, `typecheck`, `test`, `test:e2e`, `build` green (api jest needs
  `--watchman=false`, per project memory).

## Resolved decisions — round `ui-r2`

Surfaced by the builder check, decided in `questions/data.js` round `ui-r2`.

1. **Counterparty for buy/sell → seeded/operator merchant stands in.** The engine
   has no auto-accept; an order parks at `AWAITING_MERCHANT` until a merchant
   accepts (`/v1/p2p/orders/:id/accept`). For this slice a seed + accept path
   (the parked `SpineMerchant`, or a script) plays the testnet counterparty so
   the customer loop reaches `COMPLETED`. **No merchant UI is built this slice.**
   The auto-match intent in memory remains a later backend change (finding
   below), not this work.
2. **MFA-enrollment screen → design a new one in `main`'s language.** The money
   gate 403s every wallet/p2p/payment route until TOTP is enrolled
   (`/auth/mfa/begin` → `/confirm`), and `main` never drew this mandatory screen.
   A dedicated enrollment screen is built in `main`'s visual style — a
   **conscious, documented deviation from "exact `main`"** (recorded here so it
   is not mistaken for scope creep). Wiring copied from `SpineAuth.tsx` stage
   `enrol`.
3. **Wallet tiles → Send is inert, Withdraw is the real external send,
   Deposit/Receive is the address screen.** All four `main` tiles keep their
   place. Withdraw → `POST /v1/wallet/withdrawals` (allowlist + TOTP). Deposit
   and Receive both resolve to `GET /v1/wallet/address`. **Send** (internal
   user-to-user transfer, no v1 endpoint) renders as an inert `<ParkedAction>`
   per the `ui-r1-q4` rule.
4. **INR estimate → USDT only this slice; server-computed INR deferred.** The UI
   shows the USDT balance and no INR headline for now, because balances are
   USDT-only, no rates GET endpoint exists, and PRD §5 bars the UI from
   multiplying balance × rate. A backend finding (below) adds a server-computed
   estimate later; the headline returns then.

## Backend findings raised (not built here)

- An INR estimate for a balance must be **server-computed** (decimal, no float)
  — either on `GET /v1/wallet/summary` or a dedicated non-persisting endpoint.
  Multiplying in the UI is barred. Pending `ui-r2` Q4.
- If Goal #1 requires an automatic counterparty (per the auto-match intent in
  memory), auto-accept is a backend change outside this UI slice. Pending
  `ui-r2` Q1.

## Out of scope for this design

Merchant/admin slice, notifications, support, PWA, and the M7 reconciliation
soak are tracked in the PRD and are separate work.
