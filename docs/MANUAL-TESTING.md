# Manual testing — M0 through M2

What you can exercise by hand today, and how. Everything below runs on your
local PostgreSQL with OTP static — no SMS provider, no chain, no credentials.

> **Scope.** M0–M2 built the ledger, auth, capabilities and audit log, plus a
> thin HTTP surface at `/api/v1/*` to drive them. The **web UI is still the
> prototype** and talks to the old mock endpoints — it does not use any of
> this yet. Wiring the UI to v1 is M4.5/M6.

## 0. One-time setup

```bash
# Databases (already created if you ran M1/M2)
psql -lqt | cut -d'|' -f1 | grep fundfusion   # expect fundfusion_dev, fundfusion_test

# Apply all migrations
npm run db:migrate --workspace api

# Append-only trigger on audit_log (not part of drizzle's generated set)
psql -f api/drizzle/0005_audit_append_only.sql fundfusion_dev
```

Create `api/.env` from `.env.example` if you have not:

```bash
cp .env.example api/.env
```

The defaults are fine. `OTP_STATIC_DEV=246810` is what makes OTP testable
without SMS.

## 1. Start the API

```bash
npm run dev:api
```

Expect `PostgreSQL connected.` and `Nest application successfully started`.
Swagger is at <http://localhost:3001/api/docs>.

## 2. Seed the reference data

Roles, the capabilities each role grants, and the USDT asset. Idempotent.

```bash
curl -s -X POST localhost:3001/api/v1/admin/seed | jq
```

Expect `{"success":true,"data":{"seeded":true},...}`.

## 3. Register a customer

```bash
curl -s -X POST localhost:3001/api/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.test","password":"Example!Demo1","displayName":"Tester"}' | jq
```

Keep three values from the response: `userId`, `accessToken`, `refreshToken`.

```bash
TOKEN="<accessToken>"
USER_ID="<userId>"
REFRESH="<refreshToken>"
```

## 4. The financial gate — the heart of M2

**Before verifying a phone, a money operation must be refused.**

```bash
curl -s -i localhost:3001/api/v1/wallet/balances -H "Authorization: Bearer $TOKEN" | head -1
```

Expect **`HTTP/1.1 403 Forbidden`** and a message telling you to verify your
phone. PRD §9.1: until a phone is verified an account has no deposit address,
no balance, and cannot place orders.

Now verify the phone:

```bash
curl -s -X POST localhost:3001/api/v1/auth/otp/request \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"phone":"+919876543210"}' | jq
```

Expect `{"sent":true}` — and note the code is **not** in the response. It is
printed in the API log instead. Look at your `npm run dev:api` terminal:

```
[OtpService] OTP for +919876543210: 246810 (development only, expires in 10m)
```

```bash
curl -s -X POST localhost:3001/api/v1/auth/otp/verify \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"phone":"+919876543210","code":"246810"}' | jq
```

Expect `{"verified":true}`. **Now retry the gated call:**

```bash
curl -s localhost:3001/api/v1/wallet/balances -H "Authorization: Bearer $TOKEN" | jq
```

Expect `200` and four buckets at `0.000000000000000000` — available, locked,
bonded, pending (PRD §5.2), each at 18 decimal places.

### Prove one phone equals one account

Register a second user, request an OTP for the **same** number, and verify.
Expect **409 Conflict**. This is what stops one person farming accounts to
self-trade.

## 5. Capabilities — deny always wins

```bash
curl -s localhost:3001/api/v1/auth/me -H "Authorization: Bearer $TOKEN" | jq '.data.capabilities'
```

Expect `["DEPOSIT","P2P_BUY","P2P_SELL","SEND","WITHDRAW"]` — what the
CUSTOMER role grants.

Deny one:

```bash
curl -s -X POST localhost:3001/api/v1/admin/capabilities/deny \
  -H 'content-type: application/json' \
  -d "{\"userId\":\"$USER_ID\",\"capability\":\"WITHDRAW\",\"reason\":\"manual risk hold\"}" | jq
```

Re-read `me` — `WITHDRAW` is gone.

**Now the part that matters.** Grant it back:

```bash
curl -s -X POST localhost:3001/api/v1/admin/capabilities/grant \
  -H 'content-type: application/json' \
  -d "{\"userId\":\"$USER_ID\",\"capability\":\"WITHDRAW\",\"reason\":\"support exception\"}" | jq
```

Re-read `me`. **`WITHDRAW` is still absent.** The grant was written *after* the
deny and still loses, because deny always wins (PRD §9.3). A support agent
granting an exception cannot silently lift a risk hold.

Try an override with no reason — expect **400**:

```bash
curl -s -X POST localhost:3001/api/v1/admin/capabilities/deny \
  -H 'content-type: application/json' \
  -d "{\"userId\":\"$USER_ID\",\"capability\":\"SEND\",\"reason\":\"\"}" | jq
```

## 6. The audit log is append-only

```bash
curl -s localhost:3001/api/v1/admin/audit | jq '.data[0] | {action, entity, reason}'
```

Every privileged action carries its reason. Now try to rewrite history:

```bash
psql -c "UPDATE audit_log SET reason = 'rewritten'" fundfusion_dev
psql -c "DELETE FROM audit_log" fundfusion_dev
```

Both fail with `audit_log is append-only`. The rule is enforced by a database
trigger, not by application code — a rule only the application enforces is one
any psql session can bypass.

> Boundary, stated honestly: a row-level trigger does not fire on `TRUNCATE`,
> so a superuser can still clear the table. The trigger defends against
> application-level tampering, which is the threat it exists for.

## 7. Session rotation and reuse detection

```bash
curl -s -X POST localhost:3001/api/v1/auth/refresh \
  -H 'content-type: application/json' -d "{\"refreshToken\":\"$REFRESH\"}" | jq
```

You get a new pair. **Replay the old one:**

```bash
curl -s -i -X POST localhost:3001/api/v1/auth/refresh \
  -H 'content-type: application/json' -d "{\"refreshToken\":\"$REFRESH\"}" | head -1
```

Expect **401**, and every session in that family is revoked — a replayed token
means it leaked, and you cannot tell whether the attacker or the real user is
presenting it.

Decode the access token at <https://jwt.io> — it carries `sub` and expires in
exactly 900 seconds (15 minutes, PRD §19).

## 8. The ledger

The ledger has no HTTP surface yet — money movement arrives with the P2P engine
in M4. Its behaviour is covered by 140 automated tests. To see it directly:

```bash
psql -c "\d ledger_entry" fundfusion_dev     # amount is numeric(38,18)
psql -c "\d wallet_account" fundfusion_dev   # NO available/locked columns
```

Balances are derived by summing journal entries. There is no balance column to
disagree with the journal (PRD §5 rule 1).

## 9. The automated suite

```bash
npm run lint && npm run typecheck && npm run test && npm run build
npm run test:e2e --workspace api
```

Expect: lint 0 · typecheck 0 · api 140 · web 17 · e2e 19 · build 0.

The e2e suite walks the same flow as this document, so if a manual step
surprises you, `api/test/v1-flow.e2e-spec.ts` is the executable version.

## What you cannot test yet

| Not yet | Arrives in |
|---|---|
| The web UI against v1 | M4.5 / M6 — the UI still uses the prototype mock API |
| Deposits, withdrawals, real balances | M3 — needs BSC testnet |
| Buy / sell orders, escrow, merchants | M4 |
| Google sign-in | Needs `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` |
| Real SMS OTP | Needs TRAI DLT registration |
