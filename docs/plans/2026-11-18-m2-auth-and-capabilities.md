# M2 — Auth, Roles, Capabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A verified phone is the financial gate, a capability registry decides
every privileged action with deny always winning, and no admin action happens
without a stored reason in an append-only log.

**Architecture:** A v1 `AuthModule` and `CapabilityModule` on Drizzle, built
alongside the prototype's in-memory auth exactly as M1's ledger was — the
prototype surfaces still run on `PrototypeStore`. OTP stays static
(`OTP_STATIC_DEV`); no SMS provider is contacted. Google OAuth is built behind a
config seam that is inert until credentials exist, so the milestone completes
without them.

**Tech Stack:** NestJS 11 · Drizzle ORM · PostgreSQL 17 · bcrypt · JWT

**Spec:** `docs/PRD.md` — M2 row of §14. Sign-in §9.1, roles §9.2,
capabilities §9.3, admin obligations §9.4, security baseline §13.5,
session assumptions §19.

## Global Constraints

- **Phone OTP is the financial gate.** Until a phone is verified the account has
  no deposit address, no balance, and cannot place orders. (PRD §9.1)
- **One verified phone equals exactly one account**, enforced by a unique
  constraint. This is what stops one person farming accounts to self-trade. (§9.1)
- `effective = (role grants ∪ user grants) − user denies`. **Deny always
  wins.** (§9.3)
- Every per-user override carries an actor, a reason, and an **optional
  expiry**. Most denies are temporary risk holds; without an expiry they
  quietly become permanent and nobody remembers why. (§9.3)
- MFA is mandatory on every admin account. Every privileged action requires a
  typed reason code, which is stored. The audit log is **append-only**. (§9.4)
- **No admin may edit a balance directly.** Corrections are compensating
  journal entries. (§9.4)
- Access token 15 min, refresh 7 days, with rotation and a device list. (§19)
- OTP is rate limited. Sessions use refresh-token rotation with reuse
  detection. (§13.5)
- OTP never contacts an SMS provider in this milestone. `OTP_STATIC_DEV`
  supplies the code and it is logged, never returned in a response body.
- Money rules from M1 are unchanged. Do not modify `api/src/ledger/`.
- Commit messages: one line, `feat(context): message`, **no** `Co-Authored-By`.

## Review Focus

1. **A deny that has expired is still enforced**, or a live deny is ignored
   because the expiry comparison is inverted. → Task 2.
2. **Two accounts verify the same phone number**, because the uniqueness check
   races between two concurrent verifications. → Task 3.
3. **An unverified phone reaches a money operation** through a path that forgot
   the guard — the gate must be enforced centrally, not per-controller. → Task 3.
4. **A refresh token is replayed after rotation** and still mints a new access
   token, so a stolen token outlives its theft. → Task 4.
5. **A privileged action succeeds with a blank or missing reason code**, leaving
   an audit row that explains nothing. → Task 5.

---

### Task 1: Schema for capabilities, phone verification and admin MFA

**Files:**
- Modify: `api/src/db/schema/enums.ts` (roles, capability keys, grant effect)
- Modify: `api/src/db/schema/identity.ts` (`phoneVerifiedAt`, `mfaSecret`, `mfaEnrolledAt`)
- Create: `api/src/db/schema/capability.ts`
- Modify: `api/src/db/schema/index.ts`
- Create: `api/src/db/schema/capability.spec.ts`
- Create: `api/drizzle/0002_*.sql` (generated)

**Interfaces:**
- Produces: `capability`, `roleCapability`, `userCapability` tables;
  `capabilityKey` and `grantEffect` enums; `user.phoneVerifiedAt`,
  `user.mfaSecret`, `user.mfaEnrolledAt`. Tasks 2–5 consume them.

- [ ] **Step 1: Write the failing schema test**

`api/src/db/schema/capability.spec.ts`, against real PostgreSQL:

```ts
it('role_name carries the v1 admin roles', async () => {
  expect(await enumValues('role_name')).toEqual(
    expect.arrayContaining(['CUSTOMER', 'MERCHANT', 'SUPPORT', 'SUPER_ADMIN']),
  )
})
it('capability_key carries the v1 capabilities', async () => {
  expect(await enumValues('capability_key')).toEqual(
    expect.arrayContaining(['DEPOSIT', 'WITHDRAW', 'SEND', 'P2P_BUY', 'P2P_SELL']),
  )
})
it('one verified phone can belong to only one account', async () => {
  // unique index on user.phone must exist
  expect(await hasUniqueIndexOn('user', 'phone')).toBe(true)
})
it('a user capability override records actor, reason and optional expiry', async () => {
  const cols = await columnNames('user_capability')
  expect(cols).toEqual(expect.arrayContaining(['effect', 'actor_id', 'reason', 'expires_at']))
})
it('user carries phone verification and MFA columns', async () => {
  const cols = await columnNames('user')
  expect(cols).toEqual(expect.arrayContaining(['phone_verified_at', 'mfa_secret', 'mfa_enrolled_at']))
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace api -- capability.spec`
Expected: FAIL — the enums and tables do not exist.

- [ ] **Step 3: Write the schema**

`capabilityKey` enum: `DEPOSIT`, `WITHDRAW`, `SEND`, `P2P_BUY`, `P2P_SELL`.
PRD §18 says `GIFT_CARD` and `UTILITY` re-enter by registering a capability,
not by a migration — do **not** add them now; that is the point of the registry.
`grantEffect` enum: `ALLOW`, `DENY`. `roleCapability` is `(role, capability)`
unique. `userCapability` is `(user, capability)` unique and carries `effect`,
`actorId`, `reason` (not null), `expiresAt` (nullable).

- [ ] **Step 4: Generate, read, and apply the migration**

Run: `npm run db:generate --workspace api`, read the SQL, then apply to both
databases. A `NOT NULL` column added to a populated table needs a default —
M1's migration 0001 failed on exactly this.

- [ ] **Step 5: Run the schema test**

Run: `npm run test --workspace api -- capability.spec`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/src/db api/drizzle
git commit -m "feat(db): add capability registry and phone verification schema"
```

---

### Task 2: The capability registry — deny always wins

**Files:**
- Create: `api/src/capability/capability.types.ts`
- Create: `api/src/capability/capability.service.ts`
- Create: `api/src/capability/capability.module.ts`
- Create: `api/src/capability/capability.service.spec.ts`

**Interfaces:**
- Consumes: the tables from Task 1.
- Produces: `CapabilityService.effective(userId): Promise<Set<CapabilityKey>>`,
  `CapabilityService.can(userId, key): Promise<boolean>`,
  `CapabilityService.grant(userId, key, { actorId, reason, expiresAt })`,
  `CapabilityService.deny(userId, key, { actorId, reason, expiresAt })`.
  Tasks 3 and 5 consume them.

- [ ] **Step 1: Write the failing tests**

`api/src/capability/capability.service.spec.ts`:

```ts
it('a role grant is effective', async () => {
  expect(await capabilities.can(customerId, 'DEPOSIT')).toBe(true)
})
it('a user grant adds a capability the role lacks', async () => {
  await capabilities.grant(customerId, 'P2P_SELL', grantMeta())
  expect(await capabilities.can(customerId, 'P2P_SELL')).toBe(true)
})
it('a user deny beats a role grant', async () => {
  await capabilities.deny(customerId, 'DEPOSIT', grantMeta())
  expect(await capabilities.can(customerId, 'DEPOSIT')).toBe(false)
})
it('a user deny beats a user grant for the same capability', async () => {
  await capabilities.grant(customerId, 'WITHDRAW', grantMeta())
  await capabilities.deny(customerId, 'WITHDRAW', grantMeta())
  expect(await capabilities.can(customerId, 'WITHDRAW')).toBe(false)
})
it('an expired deny stops being enforced', async () => {
  await capabilities.deny(customerId, 'DEPOSIT', grantMeta({ expiresAt: past() }))
  expect(await capabilities.can(customerId, 'DEPOSIT')).toBe(true)
})
it('a deny with no expiry never lapses', async () => {
  await capabilities.deny(customerId, 'DEPOSIT', grantMeta({ expiresAt: null }))
  expect(await capabilities.can(customerId, 'DEPOSIT')).toBe(false)
})
it('an expired grant stops being effective', async () => {
  await capabilities.grant(customerId, 'P2P_SELL', grantMeta({ expiresAt: past() }))
  expect(await capabilities.can(customerId, 'P2P_SELL')).toBe(false)
})
it('an override without a reason is refused', async () => {
  await expect(capabilities.deny(customerId, 'DEPOSIT', { actorId, reason: '' }))
    .rejects.toThrow(/reason/i)
})
it('effective() is the full set, not one key at a time', async () => {
  expect([...(await capabilities.effective(customerId))].sort())
    .toEqual(['DEPOSIT', 'P2P_BUY', 'P2P_SELL', 'SEND', 'WITHDRAW'])
})
```

Tests 5–7 are Review Focus #1: an inverted expiry comparison passes the
simple cases and fails exactly here.

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace api -- capability.service.spec`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `CapabilityService`**

`effective` reads role grants and user overrides in one query, filters out rows
whose `expiresAt` is in the past, then computes
`(roleGrants ∪ userAllows) − userDenies`. Compute the subtraction last and
unconditionally, so no ordering of rows can let a deny lose.

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test --workspace api -- capability.service.spec`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add api/src/capability
git commit -m "feat(capability): add registry with deny-wins resolution"
```

---

### Task 3: Phone OTP and the financial gate

**Files:**
- Create: `api/src/auth/v1/otp.service.ts`
- Create: `api/src/auth/v1/phone-gate.guard.ts`
- Create: `api/src/auth/v1/otp.service.spec.ts`
- Create: `api/src/auth/v1/phone-gate.spec.ts`

**Interfaces:**
- Consumes: `CapabilityService` from Task 2.
- Produces: `OtpService.request(userId, phone)`, `OtpService.verify(userId, phone, code)`,
  and `PhoneGateGuard`, which rejects any route marked `@RequiresVerifiedPhone()`
  when `user.phoneVerifiedAt` is null. Task 5 consumes the guard.

- [ ] **Step 1: Write the failing tests**

```ts
// otp.service.spec.ts
it('issues the static development code and never returns it in the response', async () => {
  const res = await otp.request(userId, '+919876543210')
  expect(res).toEqual({ sent: true })          // the code is logged, not returned
})
it('verifies the static code', async () => {
  await otp.request(userId, '+919876543210')
  expect(await otp.verify(userId, '+919876543210', '246810')).toEqual({ verified: true })
})
it('rejects a wrong code', async () => { ... rejects.toThrow(/invalid/i) })
it('rejects an expired challenge', async () => { ... rejects.toThrow(/expired/i) })
it('rate limits repeated attempts', async () => {
  // 5 wrong codes, then the 6th is refused even if correct
  await expect(otp.verify(userId, phone, '246810')).rejects.toThrow(/too many/i)
})
it('one verified phone cannot belong to two accounts', async () => {
  await otp.verify(userA, phone, '246810')
  await expect(otp.verify(userB, phone, '246810')).rejects.toThrow(/already/i)
})
it('concurrent verifications of the same phone leave exactly one account verified', async () => {
  const results = await Promise.allSettled([verifyAs(userA), verifyAs(userB)])
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
})
```

The concurrent case is Review Focus #2 — the unique constraint must arbitrate,
not a read-then-write.

```ts
// phone-gate.spec.ts — Review Focus #3
it('an unverified phone cannot reach a money operation', async () => {
  await expect(guardFor(unverifiedUser)).rejects.toThrow(/verify your phone/i)
})
it('a verified phone passes the gate', async () => { ... resolves })
it('the gate is applied by a guard, not by each controller', () => {
  // every route carrying @RequiresVerifiedPhone resolves through PhoneGateGuard
  expect(routesMissingTheGuard()).toEqual([])
})
```

- [ ] **Step 2: Run to verify both fail**

Run: `npm run test --workspace api -- otp.service.spec phone-gate.spec`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `OtpService` and `PhoneGateGuard`**

The code comes from `OTP_STATIC_DEV` when set; it is written to the log and
never to a response body. Store a bcrypt hash of the code with an expiry and an
attempt counter. Verification sets `phoneVerifiedAt` and `phone` in one
statement and lets the unique index on `phone` reject the second account.

- [ ] **Step 4: Run to verify they pass**

Run: `npm run test --workspace api -- otp.service.spec phone-gate.spec`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/auth/v1
git commit -m "feat(auth): enforce the verified-phone financial gate"
```

---

### Task 4: Sessions with refresh rotation and reuse detection

**Files:**
- Create: `api/src/auth/v1/session.service.ts`
- Create: `api/src/auth/v1/session.service.spec.ts`

**Interfaces:**
- Produces: `SessionService.issue(userId, device)`, `SessionService.rotate(refreshToken)`,
  `SessionService.revokeAll(userId)`, `SessionService.devices(userId)`.

- [ ] **Step 1: Write the failing tests**

```ts
it('issues an access and a refresh token', async () => { ... })
it('rotating returns a new pair and invalidates the old refresh token', async () => {
  const first = await sessions.issue(userId, device)
  const second = await sessions.rotate(first.refreshToken)
  expect(second.refreshToken).not.toBe(first.refreshToken)
})
// Review Focus #4
it('replaying a rotated refresh token is refused', async () => {
  const first = await sessions.issue(userId, device)
  await sessions.rotate(first.refreshToken)
  await expect(sessions.rotate(first.refreshToken)).rejects.toThrow(/reuse|revoked/i)
})
it('detected reuse revokes the whole family, not just that token', async () => {
  const first = await sessions.issue(userId, device)
  const second = await sessions.rotate(first.refreshToken)
  await sessions.rotate(first.refreshToken).catch(() => undefined)
  await expect(sessions.rotate(second.refreshToken)).rejects.toThrow()
})
it('stores a device list', async () => { ... })
it('refresh tokens are stored hashed, never in clear text', async () => {
  expect(await rawRefreshColumn()).not.toContain(first.refreshToken)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace api -- session.service.spec`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `SessionService`**

Access 15 min, refresh 7 days (PRD §19). Store only a bcrypt hash of the
refresh token. Rotation marks the old row revoked and writes a new one in the
same family; presenting an already-revoked token revokes every live session in
that family, because a replay means the token leaked.

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test --workspace api -- session.service.spec`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/auth/v1
git commit -m "feat(auth): rotate refresh tokens and detect reuse"
```

---

### Task 5: Admin MFA, reason codes and the append-only audit log

**Files:**
- Create: `api/src/audit/audit.service.ts`
- Create: `api/src/audit/audit.module.ts`
- Create: `api/src/audit/audit.service.spec.ts`
- Create: `api/src/auth/v1/require-reason.decorator.ts`
- Create: `api/drizzle/0003_*.sql` (append-only trigger)

**Interfaces:**
- Consumes: `CapabilityService` from Task 2.
- Produces: `AuditService.record({ actorId, action, entity, entityId, reason, oldValue, newValue, ipAddress })`.

- [ ] **Step 1: Write the failing tests**

```ts
it('records a privileged action with its reason', async () => { ... })
// Review Focus #5
it('refuses to record without a reason', async () => {
  await expect(audit.record({ ...action, reason: '' })).rejects.toThrow(/reason/i)
})
it('refuses a whitespace-only reason', async () => {
  await expect(audit.record({ ...action, reason: '   ' })).rejects.toThrow(/reason/i)
})
it('an audit row cannot be updated', async () => {
  await expect(rawUpdate(auditId)).rejects.toThrow(/append-only/i)
})
it('an audit row cannot be deleted', async () => {
  await expect(rawDelete(auditId)).rejects.toThrow(/append-only/i)
})
it('an admin account without MFA cannot perform a privileged action', async () => {
  await expect(privilegedAs(adminWithoutMfa)).rejects.toThrow(/mfa/i)
})
it('no admin path can write a balance', () => {
  // PRD §9.4: corrections are compensating journal entries
  expect(sourceFilesWriting(/wallet_account.*set/i)).toEqual([])
})
```

Append-only is enforced by a database trigger, not by discipline — Review Focus
#5's sibling: a rule only the application enforces is a rule a migration or a
psql session can bypass.

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace api -- audit.service.spec`
Expected: FAIL.

- [ ] **Step 3: Implement `AuditService` and the trigger**

Reason is trimmed and must be non-empty. The migration adds a `BEFORE UPDATE OR
DELETE` trigger on `audit_log` that raises an exception.

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test --workspace api -- audit.service.spec`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/audit api/src/auth/v1 api/drizzle
git commit -m "feat(audit): add append-only log with mandatory reason codes"
```

---

### Task 6: Google OAuth behind a config seam

**Files:**
- Create: `api/src/auth/v1/google-oauth.service.ts`
- Create: `api/src/auth/v1/google-oauth.service.spec.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `GoogleOauthService.isConfigured(): boolean`,
  `GoogleOauthService.verifyIdToken(token): Promise<{ email: string; sub: string }>`.

The milestone must complete without credentials. The service reports itself
unconfigured and the sign-in route returns a clear error rather than crashing.

- [ ] **Step 1: Write the failing tests**

```ts
it('reports itself unconfigured when no client id is set', () => {
  expect(service.isConfigured()).toBe(false)
})
it('refuses sign-in with a clear message when unconfigured', async () => {
  await expect(service.verifyIdToken('x')).rejects.toThrow(/not configured/i)
})
it('reports itself configured once both id and secret are present', () => {
  process.env.GOOGLE_CLIENT_ID = 'id'; process.env.GOOGLE_CLIENT_SECRET = 'secret'
  expect(service.isConfigured()).toBe(true)
})
it('treats an empty client id as unconfigured', () => {
  process.env.GOOGLE_CLIENT_ID = ''
  expect(service.isConfigured()).toBe(false)
})
```

- [ ] **Step 2: Run to verify it fails, implement, verify it passes**

Run: `npm run test --workspace api -- google-oauth.service.spec`

- [ ] **Step 3: Add the keys to `.env.example`, commented**

- [ ] **Step 4: Run the whole gate**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: exit 0 throughout.

- [ ] **Step 5: Commit**

```bash
git add api/src/auth/v1 .env.example
git commit -m "feat(auth): add google oauth seam"
```

---

## M2 is done when

- The phone gate is enforced: an unverified phone cannot reach a money
  operation, and the guard — not each controller — is what enforces it.
- Deny-wins is proven, including the expiry cases in both directions.
- Refresh-token reuse is detected and revokes the family.
- The audit log rejects updates and deletes at the database level.
- `npm run lint && npm run typecheck && npm run test && npm run build` exits 0.
