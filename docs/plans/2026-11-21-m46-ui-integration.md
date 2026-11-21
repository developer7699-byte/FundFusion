# M4.6 — the real API behind the real screens

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drive the v1 API from the application's own screens, so the engine
can be demonstrated and tested by clicking rather than by curl.

**Architecture:** The screens exist and are good; they read from an in-memory
prototype API and from local mock files. This plan builds the handful of
read endpoints v1 is missing, repoints the client at v1, and rewires each
calling screen. Only seven files in `web/src` call an API at all, so the
work is bounded — the 101 routes are mostly marketing pages and screens fed
by `demo-data.ts`.

**Not in scope:** real money, real email, payment instructions, disputes,
notifications, support. This is a demonstration and test harness for the
API, not a pilot. Where a screen needs data v1 will not have until M5 or M6,
it keeps its local mock and says so on screen.

**Tech Stack:** NestJS 11, Drizzle, React 19, TanStack Query, vitest.

**Spec:** [`docs/PRD.md`](../PRD.md) — §6, §8, §9, §14 (M4.5 and M6).

## Global Constraints

- Money crosses the boundary as **strings**; a JavaScript `number` never holds money (PRD §5.1).
- Every money mutation carries an `Idempotency-Key` (PRD §5 rule 2).
- Moving money requires a verified email **and** an enrolled authenticator (PRD §9.1).
- Server-side calculation is absolute; client values are display hints (PRD §13.5).
- A read endpoint returns only what its caller may see: one user's own rows, or an admin's (PRD §13.5, object-level checks).
- Out of v1 scope, not to be added: gift cards, top-ups, utilities, UPI scan-and-pay, tiers, staking (PRD §3).
- Commits: one line, conventional-commit shaped, no `Co-Authored-By` (CLAUDE.md).

## Review Focus

1. **A list endpoint that leaks another user's rows.** Every new read here is a list, and a missing `where user = me` is invisible in a demo where everyone is you. Owned by Tasks 1 and 2.
2. **A screen that shows a stale balance after a money action.** The ledger moved but the query cache did not; the user sees their old balance and tries again. Owned by Tasks 5 and 6.
3. **A screen offering an action the order's state forbids**, producing a 409 the user cannot interpret. Owned by Tasks 6 and 7.
4. **Money rendered through a JavaScript number** — `toFixed`, `parseFloat`, or arithmetic in a component — silently truncating 18 decimals. Owned by Task 5.
5. **A signed-out or half-enrolled user reaching a money screen** and getting a raw 403 instead of being sent to enrolment. Owned by Task 4.

---

### Task 1: The reads a wallet screen needs

**Files:**
- Create: `api/src/wallet/v1/activity.service.ts`, `activity.service.spec.ts`
- Modify: `api/src/wallet/v1/wallet-v1.controller.ts`

**Interfaces:**
- Produces: `ActivityService.forUser(userId, limit?): Promise<ActivityRow[]>` where
  `ActivityRow = { id, kind, bucket, direction, amount, assetSymbol, memo, at }`, amount a string.
- Routes: `GET v1/wallet/activity`, `GET v1/wallet/summary` (balances plus the deposit address, so a dashboard is one request).

- [ ] **Step 1: Write the failing tests**

```ts
it('lists this user\'s ledger entries, newest first', ...)
it('never includes another user\'s entries', ...)        // Review Focus #1
it('returns amounts as strings at full scale', ...)
it('labels a deposit, a withdrawal and a settlement differently', ...)
it('caps the page size rather than returning a ledger', ...)
```

- [ ] **Step 2–4: RED, implement, GREEN**

Join `ledger_entry` to `ledger_transaction` and to this user's `wallet_account`;
`kind` comes from the transaction memo prefix the posting services already write.

- [ ] **Step 5: Commit** — `feat(wallet): expose activity and a wallet summary`

---

### Task 2: The reads an order screen and an admin need

**Files:**
- Modify: `api/src/p2p/order-feed.service.ts` (+ spec), `api/src/p2p/p2p.controller.ts`
- Create: `api/src/v1/admin-read.service.ts`, `admin-read.service.spec.ts`
- Modify: `api/src/v1/v1.controller.ts`

**Interfaces:**
- Produces: `OrderFeedService.minePaged(userId, limit?)` → `OrderDetail[]` for every order where the user is customer or assigned merchant.
- Produces: `AdminReadService.users()`, `.orders()`, `.ledger(limit?)` — all `RequiresAdmin`.
- Routes: `GET v1/p2p/orders`, `GET v1/admin/users`, `GET v1/admin/orders`, `GET v1/admin/ledger`.

- [ ] **Step 1: Write the failing tests**

```ts
it('lists orders where I am the customer', ...)
it('lists orders where I am the assigned merchant', ...)
it('never lists an order I am not party to', ...)        // Review Focus #1
it('refuses the admin lists to a SUPPORT account', ...)  // PRD §9.2
it('refuses the admin lists to an ordinary user', ...)
```

- [ ] **Step 2–4: RED, implement, GREEN**
- [ ] **Step 5: Commit** — `feat(v1): list orders and the admin read surface`

---

### Task 3: Becoming a merchant, and a demo seed

**Files:**
- Create: `api/src/p2p/merchant.service.ts`, `merchant.service.spec.ts`
- Modify: `api/src/p2p/p2p.controller.ts`
- Create: `api/scripts/demo-seed.ts`; add `demo:seed` to `api/package.json`

**Interfaces:**
- Produces: `MerchantService.open(userId, deskName)` → the profile, granting `P2P_BUY` and `P2P_SELL`; `MerchantService.profile(userId)`.
- Routes: `POST v1/p2p/merchant/desk`, `GET v1/p2p/merchant/desk`.

A merchant desk is currently created with raw SQL. A demo nobody can set up
without `psql` is a demo nobody runs.

- [ ] **Step 1: Write the failing tests**

```ts
it('opens a desk and grants both P2P capabilities', ...)
it('refuses a second desk for the same user', ...)
it('refuses a desk before the authenticator is enrolled', ...)  // PRD §9.1
```

- [ ] **Step 2–4: RED, implement, GREEN**

- [ ] **Step 5: Write `demo:seed`**

Creates a customer and a merchant with known credentials, opens the desk,
and funds both from the testnet faucet through the real deposit path.
It prints the two emails and the fixed sign-in code. It refuses to run
against a database whose URL is not local, because it creates accounts with
a known password.

- [ ] **Step 6: Commit** — `feat(p2p): open a merchant desk, and seed a demo`

---

### Task 4: Sign-in, on the real screens

**Files:**
- Modify: `web/src/lib/api.ts` (point at `/api/v1`), `web/src/lib/auth.ts`, `web/src/features/auth/pages.tsx`
- Modify: `web/src/app/providers.tsx`
- Test: `web/src/features/auth/auth-v1.test.tsx`

The existing flow is phone and an SMS OTP. PRD §9.1 replaced it: email and
password, then an emailed code, then an authenticator before money moves.
`web/src/spine/api.ts` already encodes the v1 envelope and the
`Idempotency-Key`; this task makes it the app's only client and deletes the
duplicate.

- [ ] **Step 1: Write the failing tests**

```tsx
it('registers, verifies the emailed code, then enrols an authenticator', ...)
it('sends a signed-in but unenrolled user to enrolment, not to a 403', ...)  // Review Focus #5
it('shows the authenticator secret once', ...)
it('keeps the session across a reload', ...)
```

- [ ] **Step 2–4: RED, implement, GREEN**
- [ ] **Step 5: Commit** — `feat(web): sign in against the v1 api`

---

### Task 5: The wallet screens

**Files:**
- Modify: `web/src/features/customer/wallet-flows.tsx`, `web/src/features/customer/pages.tsx`, `web/src/features/customer/CustomerDashboard.tsx`
- Test: `web/src/features/customer/wallet-v1.test.tsx`

Balance, deposit address, activity, and the withdrawal flow — allowlist,
cooldown and a fresh authenticator code.

- [ ] **Step 1: Write the failing tests**

```tsx
it('shows the balance at full scale, never through a number', ...)   // Review Focus #4
it('shows the real deposit address and refuses to invent one', ...)
it('refreshes the balance after a withdrawal is requested', ...)     // Review Focus #2
it('shows the cooldown refusal in the server\'s words', ...)
it('removes the simulate-deposit buttons', ...)   // the prototype's, which v1 has no route for
```

- [ ] **Step 2–4: RED, implement, GREEN**
- [ ] **Step 5: Commit** — `feat(web): wallet screens on the v1 api`

---

### Task 6: The customer's orders

**Files:**
- Modify: `web/src/features/customer/ops-pages.tsx`
- Test: `web/src/features/customer/orders-v1.test.tsx`

Quote, confirm, the order list, and the one settlement action a state allows.

- [ ] **Step 1: Write the failing tests**

```tsx
it('shows both sides of the snapshot before confirming', ...)
it('sends a fresh Idempotency-Key per confirmation', ...)
it('offers no action the order state forbids', ...)         // Review Focus #3
it('refreshes the balance after an order is confirmed', ...) // Review Focus #2
it('shows the expiry refusal rather than a blank screen', ...)
```

- [ ] **Step 2–4: RED, implement, GREEN**
- [ ] **Step 5: Commit** — `feat(web): customer orders on the v1 api`

---

### Task 7: The merchant desk

**Files:**
- Modify: `web/src/features/merchant/MerchantAvailablePage.tsx`, `MerchantOrdersPage.tsx`, `MerchantOrderDetailPage.tsx`, `MerchantWalletPage.tsx`
- Modify: `web/src/lib/merchant-store.ts` (leave what v1 cannot yet serve, clearly marked)
- Test: `web/src/features/merchant/merchant-v1.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it('lists the live feed with each obligation', ...)
it('refreshes the feed on the broadcast event', ...)
it('shows ORDER_ALREADY_ASSIGNED as a refusal, not a crash', ...)   // Review Focus #3
it('shows the self-dealing refusal in the server\'s words', ...)
it('opens a desk for a user who has none', ...)
```

- [ ] **Step 2–4: RED, implement, GREEN**
- [ ] **Step 5: Commit** — `feat(web): merchant desk on the v1 api`

---

### Task 8: The admin screens, and removing what is now dead

**Files:**
- Modify: `web/src/features/admin/pages.tsx`
- Delete: the prototype routes now superseded — `api/src/wallet/wallet.controller.ts`, the order, merchant and admin halves of `api/src/ops/ops.controller.ts`, `api/src/auth/auth.controller.ts`
- Modify: `api/src/app.module.ts`
- Test: `api/test/removed-routes.e2e-spec.ts` (extend)

CLAUDE.md: do not leave superseded surface lying around. Support,
notifications and disputes have no v1 replacement yet, so those routes and
their screens stay until M5 and M6, and nothing else does.

- [ ] **Step 1: Write the failing tests**

```ts
it('no longer serves the prototype wallet routes', ...)   // 404
it('no longer serves the prototype auth routes', ...)
it('still serves support and notifications', ...)         // until M5/M6
```

- [ ] **Step 2–4: RED, implement, GREEN**
- [ ] **Step 5: Commit** — `refactor(api): remove the superseded prototype surface`

---

### Task 9: A demo run, by clicking

**Files:**
- Create: `docs/DEMO.md`

- [ ] **Step 1: Seed, then drive a sell and a buy through the screens**
- [ ] **Step 2: Record what each screen showed, and what it could not**
- [ ] **Step 3: Run the whole gate and commit**

Run: `npm run lint && npm run typecheck && npm test && npm run test:e2e --workspace api && npm run build`

---

## M4.6 is done when

- A person can sign up, enrol an authenticator, see a real deposit address, and watch a testnet deposit arrive — on the application's own screens.
- A sell and a buy complete through those screens, between two accounts.
- Every figure on screen comes from the ledger, and no money passes through a JavaScript number.
- No screen offers an action the order's state forbids.
- The superseded prototype routes are gone.
- `lint`, `typecheck`, `test`, `test:e2e` and `build` all exit 0.
