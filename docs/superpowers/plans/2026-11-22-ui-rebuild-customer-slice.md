# Customer UI Slice on v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put `main`'s customer UI onto the live v1 API — sign in (with MFA), wallet, deposit/withdraw, buy, sell, payment methods, order detail — so money round-trips on BSC testnet through the real design.

**Architecture:** Port `main`'s screen components onto the existing, tested v1 client (`web/src/lib/api.ts`). Drop the plain spine screen components; keep `lib/api.ts` and `lib/auth.ts`. Each `main` data call (prototype `api()` + mock fallback) is replaced by `v1<T>()`, copying the call pattern the spine already proves. Out-of-scope affordances render as one inert `<ParkedAction>`; no route/store/table behind them.

**Tech Stack:** Vite + React + react-router + @tanstack/react-query, TypeScript. Tests: vitest + React Testing Library (follow `web/src/features/**/**-v1.test.tsx` and `web/src/spine/spine-*.test.tsx`).

**Spec:** `docs/superpowers/specs/2026-11-22-ui-rebuild-on-v1-design.md`

## Global Constraints

- Money crosses the UI boundary as **strings**; a JavaScript `number` never holds money (PRD §5.3). Display with `inr()`/`usdt()` from `lib/utils.ts`; never parse a money string to a number for arithmetic. The UI never re-derives money — it shows what the API computed.
- Display precision is 2dp (project memory `fundfusion-ui-alignment-decisions`); the **full-precision string** still goes back in every request body.
- Every money-mutating POST (`/p2p/orders`, `/wallet/withdrawals`) carries an `Idempotency-Key` via `newIdempotencyKey()`; one key per logical attempt, reused on retry.
- One client, one session: `v1<T>(path, init)`, tokens `ff.access`/`ff.refresh`. `main`'s prototype `api()` (base `/api`, token `nx.access`, mock fallback) is not used; remove the legacy `api()` export once no screen references it.
- No route, nav target, store, API call, or table for any PRD §3 out-of-scope feature (gift cards, utilities, scan-pay, convert, referrals, rewards). Only the inert visual face, via `<ParkedAction>`.
- Keep `main`'s exact layout/positions for the screens kept. The MFA-enrollment screen is the one sanctioned new screen, drawn in `main`'s style.
- Commits: one-line conventional-commit shape, **no `Co-Authored-By` or any attribution trailer** (CLAUDE.md hard rule).
- `api` jest runs with `--watchman=false` (project memory).

## Review Focus

- **Money gate 403 before MFA is enrolled.** `/auth/me` exposes `mfaEnrolled`/`canMoveMoney`; every wallet/p2p/payment route 403s until TOTP is enrolled. A signed-in but un-enrolled user must be routed to the enrollment screen, not shown a crash or an empty wallet. → Task 2.
- **Order in a terminal/aside state** (`DISPUTED`, `EXPIRED`, `REFUNDED`). Order detail must render read-only with no action offered. → Task 8.
- **Order with null `payeeInstruction`** (still `AWAITING_MERCHANT`). Detail shows "awaiting payee", does not crash dereferencing the null. → Task 8.
- **401 refresh mid money-flow.** The client auto-refreshes on 401; a retried order/withdrawal POST must reuse the same `Idempotency-Key` so it cannot double-spend. → Tasks 5, 7.
- **An 18-dp USDT string rendered.** The formatter shows 2dp without floatifying, and the untouched full-precision string is what posts. → Task 3.

---

### Task 1: Routing shell, `<ParkedAction>`, and inert out-of-scope surface

**Files:**
- Modify: `web/src/App.tsx` (customer route table)
- Create: `web/src/components/ui/ParkedAction.tsx`
- Modify: `web/src/features/customer/components/QuickActionGrid.tsx` (port from `main`, mark out-of-scope tiles inert)
- Modify: `web/src/layouts/CustomerLayout.tsx` (port `main`'s layout)
- Test: `web/src/App.routes.test.tsx`

**Interfaces:**
- Produces: `<ParkedAction label="..." />` — a disabled, clearly-marked affordance; tapping shows a neutral "not available yet" state, never navigates, never calls the API.
- Consumes: nothing.

- [ ] **Step 1: Write failing tests** — legal customer routes (`/customer/dashboard`, `/wallet`, `/wallet/deposit`, `/wallet/withdraw`, `/wallet/receive`, `/buy`, `/sell`, `/payment-methods`, `/orders`, `/orders/:id`, `/mfa/enroll`) resolve; out-of-scope paths (`/customer/gift-cards`, `/customer/utilities/*`, `/customer/pay/scan`, `/customer/convert`, `/customer/referrals`, `/customer/rewards`) are **absent** (render NotFound); `<ParkedAction>` renders disabled and does not navigate on click.
- [ ] **Step 2: Run, verify fail.** `cd web && npx vitest run src/App.routes.test.tsx` — FAIL.
- [ ] **Step 3: Port `main`'s `CustomerLayout` + `QuickActionGrid`; add `ParkedAction`; set the route table** to the legal set plus `/mfa/enroll`. Out-of-scope grid tiles render as `<ParkedAction>`; no routes for them. Keep `main`'s grid layout and positions.
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat(web): port the customer shell and park out-of-scope tiles`

---

### Task 2: Auth — login, register, OTP, and the MFA-enrollment screen

**Files:**
- Modify: `web/src/features/auth/pages.tsx` (port `main`'s LoginPage, RegisterPage, VerifyOtpPage, ForgotPasswordPage)
- Create: `web/src/features/auth/MfaEnrollPage.tsx` (new, in `main`'s style)
- Reference: `web/src/spine/SpineAuth.tsx` (stage `enrol` wiring), `web/src/lib/auth.ts` (`useAuth`, `homeFor`)
- Test: `web/src/features/auth/auth-v1.test.tsx`

**Interfaces:**
- Consumes: `v1()` on `POST /auth/register` → `/auth/register/verify`; `POST /auth/login` → `/auth/login/verify`; `POST /auth/mfa/begin` (returns the TOTP secret/otpauth) → `POST /auth/mfa/confirm` (`{ code }`); `GET /auth/me` (`{ ..., mfaEnrolled, canMoveMoney }`); `storeSession()`, `signedIn()`.
- Produces: a `RequireAuth money` behavior — a signed-in user whose `/auth/me` shows `mfaEnrolled=false` is redirected to `/mfa/enroll`.

- [ ] **Step 1: Write failing tests** — login→verify stores a session; a signed-in, un-enrolled user hitting a money route is redirected to `/mfa/enroll`; enroll calls `/auth/mfa/begin` then `/auth/mfa/confirm` with the entered code and, on success, lands on `homeFor(user)`.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Port the `main` auth pages onto `v1()`; build `MfaEnrollPage` in `main`'s visual language, copying the begin/confirm wiring from `SpineAuth`.** Wire the money-gate redirect in the `RequireAuth money` guard in `App.tsx`.
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat(web): auth and mfa enrolment on the v1 api`

---

### Task 3: Dashboard + wallet home (USDT only)

**Files:**
- Modify: `web/src/features/customer/CustomerDashboard.tsx`, `web/src/features/customer/wallet-flows.tsx` (`WalletHome`)
- Modify: `web/src/features/customer/components/TotalAssetsCard.tsx` (drop multi-asset)
- Reference: `web/src/spine/SpineCustomer.tsx:62` (`v1<Balances>('/wallet/balances')`)
- Test: `web/src/features/customer/wallet-v1.test.tsx`

**Interfaces:**
- Consumes: `GET /v1/wallet/summary` → `{ balances, address, network }`; `GET /v1/wallet/activity` → journal entries (newest first). `balances` is a `Record<string,string>` of ledger buckets (e.g. `AVAILABLE`, `LOCKED`).
- Produces: wallet snapshot shape consumed by Tasks 4/5/7's wallet screens.

- [ ] **Step 1: Write failing tests** — dashboard renders the USDT available balance from `/wallet/summary` as a string; **no INR headline** is shown; **no BTC/ETH rows**; an 18-dp USDT balance renders at 2dp while the test asserts the component received the full string unmodified; activity lists entries from `/wallet/activity`.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Rewire `CustomerDashboard`/`WalletHome` to `/wallet/summary` + `/wallet/activity`; strip the multi-asset list and the INR estimate; keep `main`'s card layout.**
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat(web): wallet home and dashboard on v1 balances`

---

### Task 4: Deposit / Receive (address) + inert Send

**Files:**
- Modify: `web/src/features/customer/wallet-flows.tsx` (`DepositFlow`, `ReceiveFlow`, `SendFlow`)
- Reference: `web/src/spine/SpineCustomer.tsx:73` (`v1<{address:string}>('/wallet/address')`)
- Test: `web/src/features/customer/wallet-v1.test.tsx`

**Interfaces:**
- Consumes: `GET /v1/wallet/address` → `{ address, network }`; `GET /v1/wallet/activity` for the pending→credited state.
- Produces: nothing downstream.

- [ ] **Step 1: Write failing tests** — Deposit and Receive both render the real address from `/wallet/address` (no "simulate" button); the screen shows a pending/awaiting-confirmations affordance that resolves off `/wallet/activity`; `SendFlow` renders as `<ParkedAction>` and issues no API call.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Rewire Deposit/Receive to `/wallet/address`; remove the simulate button; make Send inert.**
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat(web): deposit and receive on the real address`

---

### Task 5: Withdraw (external send) with allowlist + TOTP

**Files:**
- Modify: `web/src/features/customer/wallet-flows.tsx` (`WithdrawFlow`, `AddressesFlow`)
- Reference: `web/src/spine/SpineCustomer.tsx` withdrawal path
- Test: `web/src/features/customer/wallet-v1.test.tsx`

**Interfaces:**
- Consumes: `GET /v1/wallet/allowlist`; `POST /v1/wallet/allowlist` `{ address, code, label }`; `POST /v1/wallet/withdrawals` `{ address, amount, code }` + `Idempotency-Key`. `code` is the **TOTP authenticator code** (not an emailed OTP).

- [ ] **Step 1: Write failing tests** — adding an allowlist address posts `{address, code, label}`; a withdrawal posts the full-precision `amount` string, the allowlisted `address`, the TOTP `code`, and an `Idempotency-Key`; **a 401-then-refresh retry reuses the same `Idempotency-Key`** (assert the header is identical across the two attempts).
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Rewire Withdraw/Addresses onto allowlist + withdrawals; generate the idempotency key once per attempt.**
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat(web): withdrawals with allowlist and otp on v1`

---

### Task 6: Payment methods CRUD

**Files:**
- Create/port: `web/src/features/customer/PaymentMethodsPage.tsx` (mirror `main`'s `MerchantPaymentMethodsPage` style for the customer)
- Modify: `web/src/App.tsx` (`/customer/payment-methods` route)
- Test: `web/src/features/customer/payment-methods-v1.test.tsx`

**Interfaces:**
- Consumes: `GET /v1/wallet/payment-methods`; `POST` `{ type: 'BANK'|'UPI', label, holderName, accountNumber?, ifsc?, upiVpa? }`; `PATCH /:id/default`; `DELETE /:id`.

- [ ] **Step 1: Write failing tests** — list renders methods; adding a BANK method posts `{type:'BANK', holderName, accountNumber, ifsc, label}` and a UPI method posts `{type:'UPI', upiVpa, holderName, label}`; set-default PATCHes `:id/default`; delete DELETEs `:id`.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Build the payment-methods screen in `main`'s style onto the CRUD endpoints.**
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat(web): customer payment methods on v1`

---

### Task 7: Buy / Sell (QuoteFlow) end to end

**Files:**
- Modify: `web/src/features/customer/wallet-flows.tsx` (`QuoteFlow`)
- Reference: `web/src/spine/SpineCustomer.tsx:81-127` (quote→order→detail→utr/confirm)
- Test: `web/src/features/customer/orders-v1.test.tsx`

**Interfaces:**
- Consumes: `POST /v1/p2p/quotes` → `Quote { usdtAmount, inrAmount, rate, fee, ... }`; `POST /v1/p2p/orders` (`{ quoteId, paymentMethodId, side }`) + `Idempotency-Key` → `{ id }`; `GET /v1/p2p/orders/:id` → `OrderDetail { orderId, side, status, payeeInstruction, ... }`; `POST /v1/p2p/orders/:id/utr` `{ utr }` (BUY, customer is payer); `POST /v1/p2p/orders/:id/confirm` (SELL, customer confirms receipt).
- Produces: the `OrderDetail` shape Task 8 reads.
- The `convert` side renders inert (`<ParkedAction>`), never calls the API.

- [ ] **Step 1: Write failing tests** — a sell quotes then creates an order with an `Idempotency-Key` and a bound `paymentMethodId`; a trade attempted with no payment method is refused in-UI before any POST (the API returns `422 NO_PAYMENT_METHOD`); on BUY at `status==='ACCEPTED'` the UTR action posts `/utr`; on SELL at `status==='PAYMENT_SUBMITTED'` the confirm action posts `/confirm`; retry after a 401-refresh reuses the order `Idempotency-Key`.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Rewire `QuoteFlow` onto the quote→order→detail chain, copying the spine pattern; gate submit on a selected payment method; make `convert` inert.**
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat(web): buy and sell flows on the v1 engine`

---

### Task 8: Orders list + order detail (state × side matrix)

**Files:**
- Modify: `web/src/features/customer/ops-pages.tsx` (`OrdersList`, `OrderDetail`)
- Test: `web/src/features/customer/orders-v1.test.tsx`

**Interfaces:**
- Consumes: `GET /v1/p2p/orders` (orders the user is party to); `GET /v1/p2p/orders/:id` → `OrderDetail`.
- The action offered follows the matrix in the spec (§ Order-state × side → customer action).

- [ ] **Step 1: Write failing tests** — list renders the user's orders with side + status; detail at each `(status, side)` offers exactly the allowed action and no other (BUY/`ACCEPTED`→UTR; SELL/`PAYMENT_SUBMITTED`→confirm; all else read-only); `DISPUTED`/`EXPIRED`/`REFUNDED` render read-only with no action; an order with `payeeInstruction === null` renders "awaiting payee" without throwing; a bound instruction renders the frozen bank/UPI destination.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Rewire `OrdersList`/`OrderDetail`; implement the conditional action strictly from the matrix; guard the null payee.**
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat(web): order list and detail with the state machine`

---

### Task 9: Seeded testnet counterparty + end-to-end demo

**Files:**
- Create: `api/scripts/seed-accept-merchant.ts` (or extend the existing `demo:seed`) — a script that opens a merchant desk and accepts the customer's order from the feed, so a buy and a sell complete on testnet.
- Modify: `docs/DEMO.md` (record the customer-UI round-trip)
- Reference: `web/src/spine/SpineMerchant.tsx` (accept wiring), `POST /v1/p2p/merchant/desk`, `GET /v1/p2p/merchant/feed`, `POST /v1/p2p/orders/:id/accept`, `/utr`, `/confirm`.

**Interfaces:**
- Consumes: the merchant endpoints as the operator counterparty. No customer-facing merchant UI is built.

- [ ] **Step 1: Write the script** that seeds a bonded merchant and, given an order id (or by polling the feed), accepts and drives the merchant side (accept → for a SELL submit UTR / for a BUY confirm) to `COMPLETED`.
- [ ] **Step 2: Drive a full sell and a full buy** from the customer screens against the live testnet API, with this script as the counterparty.
- [ ] **Step 3: Record the run in `docs/DEMO.md`** — each screen, each figure, proving money round-trips and the ledger balances.
- [ ] **Step 4: Run the full gate.** `npm run lint && npm run typecheck && npm test && npm run test:e2e --workspace api -- --watchman=false && npm run build`
- [ ] **Step 5: Commit** — `feat(web): complete the customer buy and sell loop on testnet`

---

## Done when

- A person signs up, enrolls an authenticator, sees a real deposit address, and watches a testnet deposit credit — on `main`'s design.
- A buy and a sell complete through the screens, with the seeded merchant as counterparty, every figure from the ledger, no JS number holding money.
- No screen offers an action the order's state forbids; out-of-scope tiles are inert with nothing behind them.
- `lint`, `typecheck`, `test`, `test:e2e`, `build` all exit 0.
