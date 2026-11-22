# Payment methods + the INR payee instruction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. TDD: a failing test before the code, against **real PostgreSQL** (PRD §13.4).

**Goal:** Let a user (customer or merchant) hold bank/UPI payment methods, and surface the **payee's** method to the **payer** on an accepted P2P order, so the manual INR leg (PRD §6.3/6.4) can actually be paid. The chosen method is **snapshotted onto the order** so it is immutable like the quote (PRD §7 "the snapshot is law").

**Why now:** the P2P engine is complete but has no way to tell the payer where to send the rupees. No bank/UPI columns exist anywhere in the schema. The approved UI has payment-method screens and shows the payee's UPI/bank on order detail. This is the blocker for the UI re-skin.

**Scope (in):** payee identity/reference data, and its immutable per-order snapshot. **Scope (out, PRD §3):** UPI QR *scan-and-pay* (a VPA here is a static payee address string the payer types/copies, not a scanned QR), any PSP/callback, any INR custody or movement. **No ledger impact** — payment methods are reference data, not money.

**Spec:** PRD §6.3, §6.4 (bank-to-bank, platform records UTR), §13.5 (object-level IDOR, server-side), §19 (support never sees unnecessary PII).

## Global constraints
- No money crosses here; still, every field is validated server-side (PRD §13.5).
- A read returns only what its caller may see (PRD §13.5): the payer sees the payee's snapshot once the order is `ACCEPTED`+; the owner sees their own methods; admin/support see **masked** account numbers / VPA.
- Commits one line, conventional-commit shaped, no `Co-Authored-By` (CLAUDE.md).

## Data model

**`payment_method`** (reference data, keyed to `user` — both roles need it):
- `id` uuid pk · `userId` → user · `type` enum `BANK|UPI` · `label` text
- `holderName` text · `accountNumber` text (nullable) · `ifsc` text (nullable) · `upiVpa` text (nullable)
- `isDefault` boolean · `createdAt` · `deletedAt` (soft delete — an order snapshot must survive the method being removed)
- Partial unique index: one non-deleted default per user. Shape check: `BANK` ⇒ accountNumber+ifsc+holderName; `UPI` ⇒ upiVpa.

**`order_payment_instruction`** (the immutable snapshot, one per order):
- `id` uuid pk · `orderId` → p2p_order (unique) · `payeeUserId` → user · `sourceMethodId` → payment_method (nullable, for trace; snapshot stands alone)
- snapshot columns: `type`, `holderName`, `accountNumber`, `ifsc`, `upiVpa` · `chosenAt`

**Payee by side (PRD §6.3/6.4):** `SELL` → customer receives INR (customer is payee); `BUY` → merchant receives INR (merchant is payee).

## Validation
- IFSC `^[A-Z]{4}0[A-Z0-9]{6}$` · account number `^\d{9,18}$` · VPA `^[\w.\-]{2,256}@[a-zA-Z]{2,64}$` · holderName non-empty, ≤140.

## Status — complete (0.3.2)
Tasks 1–6 done, green (unit + e2e, real PG). Owner confirmed both decisions **yes**:
1. Manage methods behind `V1AuthGuard + MoneyGateGuard`. ✓
2. Reject a bind with no payee method — `422 NO_PAYMENT_METHOD`, before anything locks. ✓

**Deviation:** Task 5's admin-masking was **not built** — there is no admin
order-detail endpoint yet (an open backlog item), so nothing admin-facing
surfaces a payee instruction to mask. The masking helper lands with that
endpoint. `order-feed.detail` already refuses non-parties, so the two trade
parties see the full instruction and no one else.
**Added beyond plan:** the merchant feed (`availableFor`) now omits BUY orders
from a merchant who has no live method, so the feed never offers an order that
would 422 on accept.

---

### Task 1: Schema + migration
**Files:** `db/schema/payment.ts` (new), `db/schema/enums.ts` (add `paymentMethodType`), `db/schema/index.ts`, generated migration under `drizzle/`, `db/schema/schema.spec.ts`.
- [ ] Add the two tables + enum. Generate migration (`npm run db:generate`), apply to dev + test.
- [ ] Spec: tables exist, default partial-unique holds, FK to user, soft-delete column present.

### Task 2: PaymentMethodService (TDD, real PG)
**Files:** `payment/payment-method.service.ts` (+ spec), `payment/payment.module.ts`.
- [ ] `list(userId)`, `add(userId, dto)`, `remove(userId, id)`, `setDefault(userId, id)`.
- [ ] Tests: type-shape validation; first method auto-default; setDefault moves the flag (one default); remove is soft; another user's method is never listed/removed (IDOR).

### Task 3: CRUD endpoints
**Files:** `payment/payment.controller.ts`, DTOs. Routes under `/v1/wallet/payment-methods` behind `V1AuthGuard + MoneyGateGuard`.
- [ ] GET (mine) · POST (add) · DELETE `/:id` · PATCH `/:id/default`. Validation DTOs.

### Task 4: Bind the snapshot at the money-leg boundary (TDD, real PG)
**Files:** `payment/payment-instruction.service.ts` (+ spec), `p2p/p2p.dto.ts` (ConfirmOrderDto += optional `paymentMethodId`; accept body `{ paymentMethodId? }`), `p2p/order.service.ts` (SELL confirm), `p2p/assignment.service.ts` (BUY accept).
- [ ] At SELL confirm: snapshot the customer's chosen/default method onto the order; reject if none (Decision 2).
- [ ] At BUY accept: snapshot the merchant's chosen/default method; reject if none.
- [ ] Tests: snapshot written once; immutable; survives source method deletion; no method ⇒ 422.

### Task 5: Surface on order detail with exposure + masking (TDD)
**Files:** `p2p/order-feed.service.ts` (`detail`), masking helper.
- [ ] Payer sees the full payee snapshot once `ACCEPTED`+; the payee sees it; neither sees it before `ACCEPTED`.
- [ ] Admin/staff reads (`v1/admin-read.service.ts`, disputes) show account number as last-4 / partial VPA (PRD §19).
- [ ] Tests: each viewer case; pre-ACCEPTED hidden; admin masked.

### Task 6: e2e wire + CHANGELOG
- [ ] Extend `test/p2p.e2e-spec.ts` (or new) for a full buy + sell showing the payer reading the payee instruction.
- [ ] CHANGELOG entry.

## Review focus
1. **IDOR on payment methods** — a list/delete/setDefault that touches another user's row. Owned by Task 2.
2. **PII leak** — payee bank details visible before `ACCEPTED`, to a non-party, or un-masked to support. Owned by Task 5.
3. **Snapshot drift** — reading the live method instead of the frozen snapshot, so an edited/deleted method changes a historical order. Owned by Tasks 4–5.
4. **Bind with no method** — a SELL/BUY that reaches payment with no payee destination. Owned by Task 4.
