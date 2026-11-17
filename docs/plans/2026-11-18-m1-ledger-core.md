# M1 — Ledger Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A double-entry ledger on PostgreSQL where balances are derived from
balanced journals, money is exact decimal, every rounding residue is accounted
for, and concurrent posting cannot corrupt a balance.

**Architecture:** A new `LedgerModule` backed by Drizzle, built alongside the
prototype's in-memory `LedgerService` rather than replacing it — `wallet.service`
and `ops.service` still depend on the prototype, and rewiring them is M4.5/M6.
Three services: `AccountService` resolves wallet accounts, `PostingService`
writes balanced journals inside one transaction, `BalanceService` derives
bucket balances by summing entries. No service writes a balance anywhere.

**Tech Stack:** NestJS 11 · Drizzle ORM · PostgreSQL 17 (local) · decimal.js · Jest

**Spec:** `docs/PRD.md` — M1 row of §14. Money model §5, §5.1, §5.2.
Testing §13.4. Settlement shapes that M4 will post: §6.3, §6.4.

## Global Constraints

- USDT is `NUMERIC(38,18)`; INR is `NUMERIC(20,2)`. (PRD §5.1)
- Money crosses every boundary as a **string**. A JavaScript `number` never
  holds money. (PRD §5.1)
- **No code writes a balance.** Balances are `SUM(credits) - SUM(debits)` over
  journal entries. An admin correction is a compensating journal entry with an
  author and a reason, like every other movement. (PRD §5 rule 1)
- Every journal balances to exactly zero, or the transaction rolls back.
- Rounding is conservative at user-facing boundaries: **customer payouts round
  down, customer payables round up.** The platform is never short by
  construction. (PRD §5.1)
- Every rounding residue posts to the `ROUNDING` account. A silently dropped
  residue produces an unbalanced journal, which makes the reconciliation alert
  fire permanently, which teaches everyone to ignore it. (PRD §5.1)
- Every money operation takes an `Idempotency-Key`. (PRD §5 rule 2)
- **Never mock PostgreSQL in a ledger test.** The behaviour under test is the
  database's row locking; a mock proves only that it agrees with itself. (PRD §13.4)
- Commit messages: one line, `feat(context): message`, **no** `Co-Authored-By`. (`CLAUDE.md`)
- Do not modify the prototype `LedgerService`, `PrototypeStore`, or the 6-decimal
  `usdtAmount`/`inrAmount` in `money/decimal.ts`. Those belong to the prototype
  surfaces until a later milestone retires them.

## Review Focus

Five failure modes the spec implies that no happy path exercises. Each has a
test assigned to the task that owns the code.

1. **A money string with more than 18 decimal places** reaches the boundary and
   is silently truncated by the driver or the column, so the journal no longer
   sums to zero. → Task 1.
2. **A journal that balances in decimal but not in the database**, because one
   leg was written at a different scale than another. → Task 3.
3. **An `Idempotency-Key` replayed with a different body** returns the first
   result, silently discarding the second request's intent — or worse, posts
   twice. → Task 3.
4. **Two concurrent debits against the same account** each read a sufficient
   balance before either commits, and together overdraw it. → Task 5.
5. **A negative or zero amount**, or a journal with a single leg, is accepted
   and corrupts the invariant. → Task 3.

---

### Task 1: Money primitives

**Files:**
- Create: `api/src/money/money.ts`
- Create: `api/src/money/money.spec.ts`

**Interfaces:**
- Produces: `usdt(value: string | Decimal): Decimal` (18 dp, exact),
  `inr(value: string | Decimal): Decimal` (2 dp, exact),
  `usdtString(v: Decimal): string`, `inrString(v: Decimal): string`,
  `payoutDown(v: Decimal, dp: number): { value: Decimal; residue: Decimal }`,
  `payableUp(v: Decimal, dp: number): { value: Decimal; residue: Decimal }`.
  Later tasks consume all six.

- [ ] **Step 1: Write the failing tests**

`api/src/money/money.spec.ts`:

```ts
it('keeps 18 decimal places exactly', () => {
  expect(usdtString(usdt('0.123456789012345678'))).toBe('0.123456789012345678')
})
it('rejects more than 18 decimal places rather than truncating', () => {
  expect(() => usdt('0.1234567890123456789')).toThrow(/precision/i)
})
it('rejects a value that does not fit NUMERIC(38,18)', () => {
  expect(() => usdt('1'.repeat(21))).toThrow(/range/i)
})
it('never returns a JavaScript number', () => {
  expect(typeof usdtString(usdt('1'))).toBe('string')
})
it('rounds a customer payout down', () => {
  const r = payoutDown(new Decimal('9700.005'), 2)
  expect([r.value.toFixed(2), r.residue.toFixed(3)]).toEqual(['9700.00', '0.005'])
})
it('rounds a customer payable up', () => {
  const r = payableUp(new Decimal('9700.001'), 2)
  expect([r.value.toFixed(2), r.residue.toFixed(3)]).toEqual(['9700.01', '-0.009'])
})
it('reports a zero residue when the value is already exact', () => {
  expect(payoutDown(new Decimal('10.00'), 2).residue.isZero()).toBe(true)
})
it('residue plus rounded value always reconstructs the original', () => {
  const r = payoutDown(new Decimal('1.239'), 2)
  expect(r.value.plus(r.residue).toFixed(3)).toBe('1.239')
})
```

The precision and range cases are Review Focus #1: a value the column cannot
hold must fail loudly at the boundary, not arrive truncated.

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace api -- money.spec`
Expected: FAIL — `Cannot find module './money'`.

- [ ] **Step 3: Implement the six functions in `api/src/money/money.ts`**

Use a `Decimal` clone configured with `precision: 60` so intermediate products
do not lose digits; do not mutate the global `Decimal` that `money/decimal.ts`
configures for the prototype. `usdt`/`inr` throw `RangeError` when the value
exceeds the column's integer digits (20 for USDT, 18 for INR) and throw when it
carries more decimal places than the scale allows. `payoutDown`/`payableUp`
return the rounded value together with `original.minus(rounded)`.

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test --workspace api -- money.spec`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add api/src/money/money.ts api/src/money/money.spec.ts
git commit -m "feat(money): add exact decimal primitives"
```

---

### Task 2: Accounts and derived balances

**Files:**
- Create: `api/src/ledger/ledger.types.ts`
- Create: `api/src/ledger/account.service.ts`
- Create: `api/src/ledger/balance.service.ts`
- Create: `api/src/ledger/balance.spec.ts`
- Create: `api/src/ledger/test-db.ts` (shared harness)

**Interfaces:**
- Consumes: `usdt`, `usdtString` from Task 1.
- Produces: `Bucket = 'AVAILABLE' | 'LOCKED' | 'BONDED' | 'PENDING'`;
  `AccountService.ensureAccount(userId, assetSymbol): Promise<string>` returning
  the `wallet_account.id`; `BalanceService.balance(accountId, bucket): Promise<string>`
  and `BalanceService.balances(accountId): Promise<Record<Bucket, string>>`.
  Task 3 and Task 4 consume all of them.

- [ ] **Step 1: Write the test harness**

`api/src/ledger/test-db.ts` exports `withTestDb()` — connects to
`TEST_DATABASE_URL`, truncates every table in dependency order before each test,
and exposes the Drizzle handle. It never mocks the database (PRD §13.4).

- [ ] **Step 2: Write the failing tests**

`api/src/ledger/balance.spec.ts`:

```ts
it('a new account has a zero balance in every bucket', async () => {
  const id = await accounts.ensureAccount(userId, 'USDT')
  expect(await balances.balances(id)).toEqual({
    AVAILABLE: '0', LOCKED: '0', BONDED: '0', PENDING: '0',
  })
})
it('ensureAccount is idempotent', async () => {
  const a = await accounts.ensureAccount(userId, 'USDT')
  const b = await accounts.ensureAccount(userId, 'USDT')
  expect(a).toBe(b)
})
it('derives a balance from entries, never from a column', async () => {
  // two credits and one debit posted directly as journal rows
  expect(await balances.balance(id, 'AVAILABLE')).toBe('70.000000000000000000')
})
it('keeps buckets independent', async () => {
  expect(await balances.balance(id, 'LOCKED')).toBe('30.000000000000000000')
  expect(await balances.balance(id, 'AVAILABLE')).toBe('70.000000000000000000')
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test --workspace api -- balance.spec`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement the three files**

`ensureAccount` inserts the `wallet` and `wallet_account` rows if absent, using
`ON CONFLICT DO NOTHING` against the `(wallet_id, asset_id)` unique index, then
selects the id — so two concurrent callers converge on one row.
`balance()` is `SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END)`
filtered by `account_id` and `account_type`, returned as a string via
`COALESCE(..., 0)::text`.

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test --workspace api -- balance.spec`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/src/ledger
git commit -m "feat(ledger): derive balances from journal entries"
```

---

### Task 3: Balanced, atomic, idempotent posting

**Files:**
- Create: `api/src/ledger/posting.service.ts`
- Create: `api/src/ledger/ledger.module.ts`
- Create: `api/src/ledger/posting.spec.ts`
- Modify: `api/src/app.module.ts` (register `LedgerModule`)

**Interfaces:**
- Consumes: `AccountService`, `BalanceService`, `Bucket` from Task 2; money
  primitives from Task 1.
- Produces: `PostingService.post(req: PostingRequest): Promise<{ id: string; replayed: boolean }>`
  where `PostingRequest = { idempotencyKey: string; memo: string; lines: PostingLine[] }`
  and `PostingLine = { accountId?: string; accountType: LedgerAccountType; direction: 'DEBIT' | 'CREDIT'; amount: string; assetSymbol: string }`.
  Task 4, 5 and 6 consume it.

- [ ] **Step 1: Write the failing tests**

`api/src/ledger/posting.spec.ts`:

```ts
it('posts a balanced two-leg journal', async () => {
  const { id } = await posting.post(transfer('10'))
  expect(await sumOfEntries(id)).toBe('0')
})
it('rejects an unbalanced journal and writes nothing', async () => {
  await expect(posting.post(unbalanced())).rejects.toThrow(/balanced/i)
  expect(await countTransactions()).toBe(0)     // rolled back, not partially written
})
it('rejects a single-leg journal', async () => {
  await expect(posting.post(oneLeg())).rejects.toThrow(/at least two/i)
})
it('rejects a zero amount', async () => {
  await expect(posting.post(withAmount('0'))).rejects.toThrow(/positive/i)
})
it('rejects a negative amount', async () => {
  await expect(posting.post(withAmount('-1'))).rejects.toThrow(/positive/i)
})
it('replaying an idempotency key returns the first transaction', async () => {
  const first = await posting.post(transfer('10'))
  const again = await posting.post(transfer('10'))
  expect(again).toEqual({ id: first.id, replayed: true })
  expect(await countTransactions()).toBe(1)
})
it('replaying a key with a different body is refused', async () => {
  await posting.post(transfer('10'))
  await expect(posting.post(transfer('25'))).rejects.toThrow(/idempotency/i)
  expect(await countTransactions()).toBe(1)
})
it('stores every amount at the column scale', async () => {
  await posting.post(transfer('10'))
  expect(await firstAmount()).toBe('10.000000000000000000')
})
```

Tests 2, 4, 5 are Review Focus #5; test 7 is Review Focus #3 — a replayed key
carrying different intent must be refused, not silently answered with the old
result; test 8 is Review Focus #2.

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace api -- posting.spec`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `PostingService.post`**

Inside one `db.transaction`: validate (at least two lines, every amount
positive, credits minus debits is exactly zero in `Decimal`), insert the
`ledger_transaction` row, insert every `ledger_entry`, return the id. The
`idempotency` column is already `UNIQUE`, so a replay surfaces as a unique
violation — catch it, re-read the stored transaction, compare a hash of the
request body, and either return `{ replayed: true }` or throw. Let the unique
index decide the race rather than a pre-read.

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test --workspace api -- posting.spec`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add api/src/ledger api/src/app.module.ts
git commit -m "feat(ledger): add balanced idempotent journal posting"
```

---

### Task 4: The ROUNDING account

**Files:**
- Create: `api/src/ledger/rounding.spec.ts`
- Modify: `api/src/ledger/posting.service.ts`

**Interfaces:**
- Consumes: `payoutDown`, `payableUp` from Task 1; `PostingService` from Task 3.
- Produces: `PostingService.postWithRounding(req, residue: { amount: string; assetSymbol: string })`
  which appends the balancing `ROUNDING` leg.

- [ ] **Step 1: Write the failing tests**

`api/src/ledger/rounding.spec.ts`:

```ts
it('a residue posts to the ROUNDING account so the journal still sums to zero', async () => {
  const { id } = await posting.postWithRounding(payout('9700.005'), residue('0.005'))
  expect(await sumOfEntries(id)).toBe('0')
  expect(await amountAt(id, 'ROUNDING')).toBe('0.005000000000000000')
})
it('a zero residue adds no ROUNDING leg', async () => {
  const { id } = await posting.postWithRounding(payout('9700.00'), residue('0'))
  expect(await legCount(id, 'ROUNDING')).toBe(0)
})
it('the sell-side worked example from PRD §6.3 balances exactly', async () => {
  // 100 USDT at ₹97.00 → merchant 97.00 USDT, platform revenue 3.00 USDT
  const { id } = await posting.post(sellSettlement())
  expect(await sumOfEntries(id)).toBe('0')
  expect(await amountAt(id, 'REVENUE')).toBe('3.000000000000000000')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace api -- rounding.spec`
Expected: FAIL — `postWithRounding` is not a function.

- [ ] **Step 3: Implement `postWithRounding`**

When the residue is non-zero, append one `ROUNDING` leg whose direction is
whichever side makes the journal sum to zero, then delegate to `post`.

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test --workspace api -- rounding.spec`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/ledger
git commit -m "feat(ledger): post rounding residues to a dedicated account"
```

---

### Task 5: Concurrency

**Files:**
- Create: `api/src/ledger/concurrency.spec.ts`
- Modify: `api/src/ledger/posting.service.ts` (add `postDebit` with row locking)

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: `PostingService.postDebit(accountId, bucket, amount, req)` which
  takes `SELECT ... FOR UPDATE` on the account row before checking sufficiency.

- [ ] **Step 1: Write the failing test**

`api/src/ledger/concurrency.spec.ts` — Review Focus #4:

```ts
it('concurrent debits against one account cannot overdraw it', async () => {
  await credit(accountId, 'AVAILABLE', '100')
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, (_, i) => posting.postDebit(accountId, 'AVAILABLE', '30', key(i))),
  )
  const ok = results.filter((r) => r.status === 'fulfilled').length
  expect(ok).toBe(3)                                   // 3 x 30 = 90 <= 100
  expect(await balances.balance(accountId, 'AVAILABLE')).toBe('10.000000000000000000')
})
it('a balance never goes negative under concurrent load', async () => {
  expect(new Decimal(await balances.balance(accountId, 'AVAILABLE')).isNegative()).toBe(false)
})
it('the same idempotency key used concurrently posts exactly once', async () => {
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, () => posting.post(transfer('10', 'same-key'))),
  )
  expect(await countTransactions()).toBe(1)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace api -- concurrency.spec`
Expected: FAIL — without row locking, more than three debits succeed and the
balance goes negative.

- [ ] **Step 3: Implement `postDebit` with `.for('update')`**

Take the lock on `wallet_account` for the target id inside the transaction,
derive the bucket balance under that lock, reject when insufficient, then post.
Drizzle expresses this as `.for('update')` natively — this is why the PRD chose
it over Prisma (§11).

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test --workspace api -- concurrency.spec`
Expected: PASS, exactly three winners.

- [ ] **Step 5: Commit**

```bash
git add api/src/ledger
git commit -m "feat(ledger): lock accounts before debiting"
```

---

### Task 6: The invariant test

**Files:**
- Create: `api/src/ledger/invariant.spec.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–5. Produces nothing.

The PRD calls this the highest-value layer and the one most often skipped. It
finds ordering bugs that example-based tests miss, and keeps finding them as the
code changes.

- [ ] **Step 1: Write the test**

Generate a deterministic pseudo-random sequence (seeded, so a failure is
reproducible) of 200 operations drawn from: credit available, lock, release
lock, bond, release bond, debit, settle, refund. Apply each through
`PostingService`, allowing rejections. After every operation assert:

```ts
it('every journal sums to zero and no balance is ever negative', async () => {
  for (const op of sequence(SEED, 200)) {
    await apply(op).catch(() => undefined)        // rejections are legal outcomes
    expect(await everyJournalSumsToZero()).toBe(true)
    expect(await anyNegativeBalance()).toBe(false)
  }
})
it('total credits equal total debits across the whole ledger', async () => {
  expect(await ledgerWideSum()).toBe('0')
})
```

- [ ] **Step 2: Run it**

Run: `npm run test --workspace api -- invariant.spec`
Expected: PASS. If it fails, the seed reproduces the sequence — fix the ledger,
never the assertion.

- [ ] **Step 3: Run the whole suite and the M0 gate**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: exit 0 throughout.

- [ ] **Step 4: Commit**

```bash
git add api/src/ledger
git commit -m "test(ledger): add invariant sequence test"
```

---

## M1 is done when

- Invariant and concurrency tests are green (PRD §14, M1 row).
- Every journal in the database sums to zero.
- No balance column exists and no code writes one.
- `npm run lint && npm run typecheck && npm run test && npm run build` exits 0.
