# M0 — Repo Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the repository down to v1 scope, replace Prisma with Drizzle on a
schema that obeys the PRD's money rules, make the brand a config key, and put CI
in front of every later milestone.

**Architecture:** Six independently reviewable tasks. CI lands first so each
later task is gated by it. The brand becomes config before any deletion, so the
deletions do not fight a rename. Web and API dead surface are removed
separately. Drizzle is introduced alongside Prisma and Prisma is removed only
once Drizzle owns the schema.

**Tech Stack:** NestJS 11 · Drizzle ORM · PostgreSQL 16 · Vite + React 19 +
TypeScript · GitHub Actions

**Spec:** `docs/PRD.md` — M0 row of §14. Scope boundaries §3, money model §5,
stack §11, testing §13.4.

## Global Constraints

- USDT columns are `NUMERIC(38,18)`. INR columns are `NUMERIC(20,2)`. (PRD §5.1)
- Money crosses the application boundary as **strings**; a JavaScript `number`
  never holds money. (PRD §5.1)
- No balance columns. Balances derive from journal entries. (PRD §5 rule 1)
- Commit messages: one line, `feat(context): message` shape, **never** a
  `Co-Authored-By:` trailer. (`CLAUDE.md`)
- Out of v1 and must not survive anywhere in the tree: gift cards, game top-ups,
  utilities (recharge/DTH/electricity/bill), UPI QR scan-and-pay, verification
  tiers, staking, referrals, rewards, the weekly merchant bonus pool. (PRD §3)
- The package and repository stay `fundfusion`; the displayed name comes from
  `PLATFORM_NAME`. (PRD §11)
- Nothing in M0 requires a client-supplied credential. (`docs/DEPENDENCIES.md` §0)

## Review Focus

Five failure modes the spec implies that no task's happy path exercises. Each
has a test assigned to the task that owns the code.

1. **A deep link to a deleted route renders a blank screen instead of 404.**
   Removing a `<Route>` without a catch-all leaves `/customer/gift-cards`
   matching nothing and React Router renders empty. → Task 3.
2. **A deleted API route still answers 200** because the handler was removed but
   the service method and its module registration were not. → Task 4.
3. **`PLATFORM_NAME` unset renders the literal `undefined`** in the UI and the
   Swagger title. An unset optional config must fall back, not interpolate. → Task 2.
4. **A migration silently narrows money precision.** `numeric(36,18)` →
   `numeric(38,18)` is widening and safe; the reverse truncates. The generated
   SQL must be asserted, not trusted. → Task 5.
5. **CI passes because a script does not exist.** `npm run lint --workspace web`
   exits 0 when `lint` is undefined, so a workflow of `npm run` calls can be
   green while running nothing. → Task 1.

---

### Task 1: CI pipeline and a green baseline

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `package.json` (root scripts)
- Modify: `web/package.json` (add `typecheck`)

**Interfaces:**
- Produces: root scripts `lint`, `typecheck`, `test`, `build`, each fanning out
  to both workspaces. Later tasks' verification steps call these.

- [ ] **Step 1: Add the fan-out scripts to root `package.json`**

Add to `scripts`: `lint`, `typecheck`, `test`, `build`. Each runs the
corresponding script in `api` and `web`. `web` has no `typecheck` script — add
`"typecheck": "tsc -b --noEmit"` to `web/package.json`. `web` has no `test`
script; the root `test` runs the API suite only until M1 adds web tests.

- [ ] **Step 2: Write the guard test for Review Focus #5**

`api/src/config/scripts.spec.ts` — reads both workspace `package.json` files and
asserts each script name the CI workflow invokes is actually defined:

```ts
describe('ci scripts', () => {
  it.each(['lint', 'typecheck', 'build'])('web defines %s', (name) => {
    expect(webPkg.scripts[name]).toBeDefined()
  })
  it.each(['lint', 'typecheck', 'test', 'build'])('api defines %s', (name) => {
    expect(apiPkg.scripts[name]).toBeDefined()
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm run test --workspace api -- scripts.spec`
Expected: FAIL — `web` has no `typecheck`.

- [ ] **Step 4: Add the missing scripts until the test passes**

Note `api`'s `lint` currently ends in `--fix`, which mutates files. CI must not
rewrite the tree: change it to `eslint "{src,test}/**/*.ts"` and add a separate
`lint:fix` for local use.

- [ ] **Step 5: Run the full local baseline and record what is red**

Run: `npm install && npm run lint && npm run typecheck && npm run test && npm run build`
Expected: every command exits 0. Fix whatever fails — the M0 done condition is
"build green". Do not weaken a check to make it pass.

- [ ] **Step 6: Write `.github/workflows/ci.yml`**

Triggers on `push` and `pull_request`. One job, `ubuntu-latest`, Node 22 with
`cache: npm`. Steps: checkout, setup-node, `npm ci`, then `lint`, `typecheck`,
`test`, `build` as separate named steps so a failure names itself.

- [ ] **Step 7: Verify the workflow parses and the baseline is green**

Run: `npm run test --workspace api -- scripts.spec` and confirm PASS, then push
the branch and confirm the Actions run is green.

- [ ] **Step 8: Commit**

```bash
git add .github package.json web/package.json api/package.json api/src/config
git commit -m "ci: add github actions pipeline and workspace scripts"
```

---

### Task 2: `PLATFORM_NAME` as configuration

**Files:**
- Create: `api/src/config/platform.config.ts`
- Create: `api/src/config/platform.config.spec.ts`
- Create: `web/src/lib/brand.ts`
- Modify: `api/src/main.ts:22` (Swagger title), `api/src/health.controller.ts:14`
- Modify: `web/src/components/layout/SiteChrome.tsx:39`, `web/index.html`
- Modify: `package.json:2,5` (name and description), `.env.example`

**Interfaces:**
- Produces: `platformConfig()` returning `{ platformName: string }`, registered
  with `ConfigModule.forFeature`. Web exports `PLATFORM_NAME: string` from
  `@/lib/brand`.

- [ ] **Step 1: Write the failing tests**

`api/src/config/platform.config.spec.ts`:

```ts
it('defaults when PLATFORM_NAME is unset', () => {
  delete process.env.PLATFORM_NAME
  expect(platformConfig().platformName).toBe('FundFusion')
})
it('defaults when PLATFORM_NAME is empty', () => {
  process.env.PLATFORM_NAME = ''
  expect(platformConfig().platformName).toBe('FundFusion')
})
it('reads the configured value', () => {
  process.env.PLATFORM_NAME = 'PandaPay'
  expect(platformConfig().platformName).toBe('PandaPay')
})
```

The empty-string case is Review Focus #3: `process.env.X ?? 'default'` returns
`''` for an empty variable, so the fallback must treat empty as unset.

- [ ] **Step 2: Add the brand-leak guard test**

Same file — walks `api/src` and `web/src` and asserts no source file contains
the literal `NEXORA`, `Nexora` or `nexora` (case-insensitive), excluding this
spec file itself:

```ts
it('no source file hardcodes the old brand', () => {
  expect(filesContaining(/nexora/i)).toEqual([])
})
```

- [ ] **Step 3: Run to verify both fail**

Run: `npm run test --workspace api -- platform.config.spec`
Expected: FAIL — module not found, then 30 brand hits across 16 files.

- [ ] **Step 4: Implement `platformConfig()` in `api/src/config/platform.config.ts`**

`registerAs('platform', () => ({ platformName: process.env.PLATFORM_NAME || 'FundFusion' }))`.
Wire it into `ConfigModule.forRoot({ isGlobal: true, load: [platformConfig] })`
in `api/src/app.module.ts`. Use it for the Swagger title and the health
response's `service` field.

- [ ] **Step 5: Implement `web/src/lib/brand.ts`**

`export const PLATFORM_NAME = import.meta.env.VITE_PLATFORM_NAME || 'FundFusion'`.
Replace every hardcoded brand string in `web/src` with it. Demo credentials in
`web/src/app/providers.tsx`, `web/src/features/auth/pages.tsx` and
`api/src/prototype/prototype.store.ts` move to an `example.test` domain — they
are fixtures, not brand.

- [ ] **Step 6: Add `PLATFORM_NAME` and `VITE_PLATFORM_NAME` to `.env.example`**

Both commented with their default, so an operator sees the key exists.

- [ ] **Step 7: Rename the package**

`package.json`: `"name": "fundfusion"`, `"description": "FundFusion modular monolith"`.

- [ ] **Step 8: Run tests and the full baseline**

Run: `npm run test --workspace api -- platform.config.spec && npm run typecheck && npm run build`
Expected: PASS, and both workspaces build.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(config): make platform name configurable"
```

---

### Task 3: Remove out-of-scope web surface

**Files:**
- Delete: `web/src/features/customer/CustomerScanPayPage.tsx`,
  and in `web/src/features/customer/components/`: `GiftCardsModal.tsx`,
  `BillPaymentModal.tsx`, `EarnModal.tsx`, `LaunchpadModal.tsx`,
  `CopyTradeModal.tsx`, `RewardsModal.tsx`, `ReferralModal.tsx`,
  `VirtualCardModal.tsx`, `CardlessCashModal.tsx`, `LeaderboardModal.tsx`,
  `OffersModal.tsx`, `QuickUtilitiesSection.tsx`
- Modify: `web/src/App.tsx` (routes), `web/src/features/customer/ops-pages.tsx`
  (drop `GiftHub`, `GiftBrand`, `GiftHistory`, `UtilityFlow`, `PayScanLive`,
  `PayConfirm`; keep `OrdersList`, `OrderDetail`, `NoticeCenter`,
  `SupportDesk`, `TicketDetail`, `AccountLive`)
- Modify: `web/src/features/customer/pages.tsx` (drop `UtilitiesHub`, `PayHome`),
  `dashboard.config.ts`, `CustomerDashboard.tsx`,
  `components/FullServicesMenu.tsx`, `components/QuickActionGrid.tsx`,
  `components/MoreServicesModal.tsx`, `components/PromoBannerCard.tsx`,
  `layouts/CustomerLayout.tsx`, `layouts/DeskLayout.tsx`,
  `layouts/MobileSimulatorLayout.tsx`, `lib/language.tsx`,
  `features/marketing/LandingPage.tsx`, `features/marketing/Pages.tsx`
- Create: `web/src/components/layout/NotFound.tsx`
- Test: `web/src/App.routes.spec.tsx`

**Interfaces:**
- Consumes: `PLATFORM_NAME` from Task 2.
- Produces: a `<Route path="*" element={<NotFound />} />` catch-all inside every
  authenticated layout and the public layout.

- [ ] **Step 1: Write the failing route test**

`web/src/App.routes.spec.tsx` — renders the router at each path and asserts the
out-of-scope ones reach `NotFound`. This is Review Focus #1:

```tsx
const GONE = [
  '/customer/gift-cards', '/customer/gift-cards/orders', '/customer/utilities',
  '/customer/utilities/mobile-recharge', '/customer/utilities/dth',
  '/customer/utilities/electricity', '/customer/utilities/bill-payment',
  '/customer/pay', '/customer/pay/scan', '/customer/pay/confirm',
  '/customer/referrals', '/customer/rewards', '/customer/verification',
  '/admin/gift-cards', '/admin/utilities',
]
it.each(GONE)('%s renders not-found', async (path) => {
  renderAt(path)
  expect(await screen.findByTestId('not-found')).toBeInTheDocument()
})
it.each(['/customer/wallet', '/customer/orders'])('%s still renders', ...)
```

`web` has no test runner yet — add Vitest and `@testing-library/react` as dev
dependencies and a `test` script, then add `web` to the root `test` script from
Task 1.

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace web`
Expected: FAIL — the routes still resolve to real pages.

- [ ] **Step 3: Create `NotFound` in `web/src/components/layout/NotFound.tsx`**

Renders `data-testid="not-found"`, a heading, and a link home. Add the catch-all
`<Route path="*">` to the public, customer, merchant and admin layouts.

- [ ] **Step 4: Delete the route entries and the component files**

Remove the listed `<Route>` lines from `App.tsx` and their now-unused imports,
then delete the files. Strip every reference from the dashboard config, the
service menus, the nav link arrays and the marketing copy. `AdminNote`
placeholder routes for gift cards and utilities go too.

- [ ] **Step 5: Verify no dangling imports**

Run: `npm run typecheck && npm run lint`
Expected: exit 0 — this is what proves no file still imports a deleted module.

- [ ] **Step 6: Run the route test**

Run: `npm run test --workspace web`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore(web): remove out-of-scope routes and screens"
```

---

### Task 4: Remove out-of-scope API surface

**Files:**
- Delete: `api/src/customer/` (dead — `CustomerModule` is never imported by
  `api/src/app.module.ts`)
- Modify: `api/src/ops/ops.controller.ts` (drop `gift-cards`, `gift-cards/brands/:id`,
  `gift-cards/history`, `gift-cards/orders`, `utilities/orders`, `utilities/history`)
- Modify: `api/src/ops/ops.service.ts` (drop `giftCatalog`, `giftBrand`,
  `giftOrders` and the utility order methods)
- Modify: `api/src/prototype/prototype.store.ts`, `api/src/prototype/types.ts`
  (drop the gift and utility catalogs and their types)
- Test: `api/test/removed-routes.e2e-spec.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: no new exports. `OpsService` loses six methods.

- [ ] **Step 1: Write the failing e2e test**

`api/test/removed-routes.e2e-spec.ts` — boots the real `AppModule` and asserts
404 on every removed path. This is Review Focus #2: asserting on the booted
application, not on the controller class, is what catches a handler that is
still registered somewhere.

```ts
const GONE = [
  ['get', '/api/ops/gift-cards'],
  ['get', '/api/ops/gift-cards/brands/x'],
  ['get', '/api/ops/gift-cards/history'],
  ['post', '/api/ops/gift-cards/orders'],
  ['post', '/api/ops/utilities/orders'],
  ['get', '/api/ops/utilities/history'],
]
it.each(GONE)('%s %s is 404', async (method, path) => {
  await request(app.getHttpServer())[method](path).expect(404)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:e2e --workspace api`
Expected: FAIL — routes answer 200 or 401, not 404.

- [ ] **Step 3: Delete the handlers, the service methods and the mock catalogs**

Remove the controller routes first, then the service methods they called, then
the store seed data and types those methods read. Delete `api/src/customer/`
entirely.

- [ ] **Step 4: Run the e2e test and the unit suite**

Run: `npm run test:e2e --workspace api && npm run test --workspace api`
Expected: PASS. `ops.service.spec.ts` may assert on deleted methods — delete
those cases, do not stub them.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(api): remove gift card and utility endpoints"
```

---

### Task 5: Translate the schema to Drizzle

**Files:**
- Create: `api/drizzle.config.ts`
- Create: `api/src/db/schema/enums.ts`, `identity.ts`, `money.ts`, `movement.ts`,
  `p2p.ts`, `ops.ts`, `index.ts`
- Create: `api/src/db/db.module.ts`, `api/src/db/db.service.ts`
- Create: `api/src/db/schema/schema.spec.ts`
- Create: `api/drizzle/0000_init.sql` (generated)
- Modify: `api/package.json` (deps and scripts), `api/src/app.module.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `DbService` exposing `db` (a `NodePgDatabase<typeof schema>`) and
  `pool`. Every table object is exported from `api/src/db/schema/index.ts`.

**Translation is mechanical except for five corrections the PRD pins. Make
exactly these and no others:**

| # | Prisma today | Drizzle | Why |
|---|---|---|---|
| 1 | `Decimal(36,18)` | `numeric(38,18)` | PRD §5.1 |
| 2 | `Decimal(18,2)` | `numeric(20,2)` | PRD §5.1 |
| 3 | `WalletAccount.available`, `.locked` | **dropped** | PRD §5 rule 1 — no balance columns |
| 4 | `LedgerAccountType` = AVAILABLE, LOCKED, PLATFORM_FEE, ESCROW, EXTERNAL | add `BONDED`, `PENDING`, `ROUNDING`, `REVENUE` | PRD §5.2 buckets and the §5.1 `ROUNDING` account |
| 5 | `GiftCardBrand`, `GiftCardProduct`, `GiftCardOrder`, `UtilityService`, `UtilityOrder` | **dropped** | PRD §3 non-goals |

Everything else — all 38 remaining models, their uuid primary keys, defaults,
`@@unique` and `@@index` declarations, and cascade behaviour — carries across
unchanged. File grouping follows the model groups: identity (Role, User,
UserRole, Session, OtpChallenge, CustomerProfile, MerchantProfile), money
(Asset, BlockchainNetwork, Wallet, WalletAccount, WalletAddress,
LedgerTransaction, LedgerEntry), movement (Deposit, Withdrawal, Transfer,
ConversionQuote), p2p (P2POrder, Escrow, MerchantAssignment, PaymentProof,
Settlement, Transaction), ops (Notification, SupportTicket, SupportMessage,
Dispute, AuditLog, SecurityEvent, SystemSetting).

- [ ] **Step 1: Install Drizzle**

Run: `npm install drizzle-orm pg --workspace api && npm install -D drizzle-kit @types/pg --workspace api`

- [ ] **Step 2: Write the failing schema test**

`api/src/db/schema/schema.spec.ts` — connects to the real local Postgres
(`DATABASE_URL`), runs the generated migration against a scratch database, and
queries `information_schema.columns`. Never mock the database here (PRD §13.4).
This is Review Focus #4:

```ts
it('usdt columns are numeric(38,18)', async () => {
  const cols = await moneyColumns()
  for (const c of cols.filter(isUsdt))
    expect([c.numeric_precision, c.numeric_scale]).toEqual([38, 18])
})
it('inr columns are numeric(20,2)', async () => { /* [20, 2] */ })
it('wallet_account has no balance columns', async () => {
  expect(await columnNames('wallet_account')).not.toContain('available')
  expect(await columnNames('wallet_account')).not.toContain('locked')
})
it('ledger_account_type has every bucket', async () => {
  expect(await enumValues('ledger_account_type')).toEqual(
    expect.arrayContaining(['AVAILABLE', 'LOCKED', 'BONDED', 'PENDING', 'ROUNDING', 'REVENUE']),
  )
})
it('no out-of-scope tables exist', async () => {
  expect(await tableNames()).not.toContain('gift_card_brand')
  expect(await tableNames()).not.toContain('utility_service')
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test --workspace api -- schema.spec`
Expected: FAIL — no schema module.

- [ ] **Step 4: Write the schema files**

Translate group by group per the table above. Money columns use
`numeric('col', { precision: 38, scale: 18 })` and are read as strings — set
`pg.types` parsing so `NUMERIC` never becomes a JS `number` (Global Constraints).

- [ ] **Step 5: Write `drizzle.config.ts` and generate the migration**

Run: `npm run db:generate --workspace api`
Expected: `api/drizzle/0000_init.sql` appears. Read it before applying — confirm
every `numeric` is `(38,18)` or `(20,2)`, and that no gift or utility table and
no `available`/`locked` column is present.

- [ ] **Step 6: Implement `DbService` and register `DbModule`**

A `pg.Pool` from `DATABASE_URL`, `drizzle(pool, { schema })`, closed in
`onModuleDestroy`. Register `DbModule` in `app.module.ts` alongside the existing
modules — do not remove `PrismaModule` yet; that is Task 6.

- [ ] **Step 7: Apply and run the schema test**

Run: `npm run db:up && npm run db:migrate --workspace api && npm run test --workspace api -- schema.spec`
Expected: PASS on all five assertions.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(db): translate schema to drizzle"
```

---

### Task 6: Remove Prisma

**Files:**
- Delete: `api/prisma/schema.prisma`, `api/prisma/seed.ts`,
  `api/src/prisma/prisma.service.ts`, `api/src/prisma/prisma.module.ts`
- Modify: `api/src/app.module.ts:6,16`, `api/package.json`, `package.json`
- Test: `api/src/db/no-prisma.spec.ts`

**Interfaces:**
- Consumes: `DbModule` from Task 5.
- Produces: nothing new. `api/src/app.module.ts` no longer imports `PrismaModule`.

- [ ] **Step 1: Write the failing guard test**

`api/src/db/no-prisma.spec.ts`:

```ts
it('no source file imports prisma', () => {
  expect(filesMatching(/@prisma\/client|PrismaService|PrismaModule/)).toEqual([])
})
it('no prisma dependency remains', () => {
  const deps = { ...apiPkg.dependencies, ...apiPkg.devDependencies }
  expect(deps['@prisma/client']).toBeUndefined()
  expect(deps['prisma']).toBeUndefined()
})
it('no prisma scripts remain', () => {
  expect(Object.keys(apiPkg.scripts).filter(s => s.startsWith('prisma:'))).toEqual([])
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace api -- no-prisma.spec`
Expected: FAIL — `app.module.ts` imports `PrismaModule`, three `prisma:*`
scripts exist, both packages are installed.

- [ ] **Step 3: Delete the Prisma files and dependencies**

Remove the import and the `PrismaModule` entry from `app.module.ts`, delete the
four files, drop `@prisma/client` and `prisma` from `api/package.json`, drop the
`prisma:*` scripts and the top-level `"prisma"` seed block. Point the root
`db:migrate` and `db:seed` scripts at the Drizzle equivalents.
`api/src/customer/` was the only consumer of `PrismaService` and Task 4 deleted it.

- [ ] **Step 4: Run the guard test and the whole baseline**

Run: `npm run test --workspace api -- no-prisma.spec && npm run lint && npm run typecheck && npm run test && npm run build`
Expected: PASS and exit 0 throughout.

- [ ] **Step 5: Update the changelog**

Add a `[0.3.0]` entry to `CHANGELOG.md` recording the v1 rebuild start: scope
stripped to the PRD, Prisma replaced by Drizzle, brand moved to config, CI added.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(api): remove prisma"
```

---

## M0 is done when

- `npm run lint && npm run typecheck && npm run test && npm run build` exits 0.
- CI is green on the branch.
- No source file matches `/nexora/i`, `/gift.?card/i`, `/utilit/i` or `/prisma/i`.
- The generated migration declares `numeric(38,18)` and `numeric(20,2)` only.
- `wallet_account` has no `available` or `locked` column.

This matches the PRD §14 M0 condition — "build green, dead surface gone" — and
leaves M1 a ledger schema that already obeys §5.
