# Running FundFusion locally

How to get the API and web app running on a fresh machine, with demo data and
test accounts. For the quick version see the README's *Local setup*; for the
screen-by-screen demo walk and the honest record of what was run on testnet see
[`DEMO.md`](DEMO.md). The spec is [`PRD.md`](PRD.md) and wins over this page.

> **v1 runs on BSC testnet only — no real money.** Every value below is a
> throwaway development credential. Never put a real secret in `api/.env`.

---

## 1. Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 20+ (26 is used in development) | Runs the API and builds the web app |
| npm | 10+ (ships with Node) | Workspaces — the repo is one npm workspace with `web` and `api` |
| Docker + Docker Compose | current | PostgreSQL 16 and Redis 7 run in containers; nothing else needs installing |

Everything else is an npm dependency. You do **not** need PostgreSQL or Redis
installed on the host — the containers publish **5433** and **6380** (not the
defaults 5432/6379) so they never collide with an existing instance.

---

## 2. First-time setup

```bash
cp .env.example api/.env     # testnet values only — never a real secret
npm install                  # installs root + web + api workspaces
npm run db:up                # PostgreSQL 16 + Redis 7 via Docker Compose, waits for health
npm run db:migrate           # schema into fundfusion_dev
npm run db:migrate:test      # schema into fundfusion_test (integration/schema tests, PRD §13.4)
```

### `api/.env` — what to fill in

The copied `.env.example` boots the API for auth, ledger and the UI. A few keys
decide how far you can go:

| Key | Default in example | Effect |
|---|---|---|
| `OTP_STATIC_DEV=246810` | set | Sign-in code is fixed instead of random. **Required** for `demo:seed` — it reads this code. Leave it set in development. |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | placeholders | Replace with any long random strings. |
| `JOBS_ENABLED=true` | commented out | Deposit watcher, order-timeout sweep and deposit sweep. Off by default so a migration never starts watching a chain. **Deposits are never credited without it.** |
| `BSC_RPC_HTTP_URL`, `BSC_RPC_WS_URL`, `BSC_HD_SEED`, `USDT_CONTRACT_ADDRESS` | commented out | Custody + testnet chain. Needed for real deposits/withdrawals. Half a configuration is refused outright. See [`DEPENDENCIES.md`](DEPENDENCIES.md) §2. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | commented out | Google sign-in reports itself unconfigured until both are set. Nothing else depends on them. |

**Minimum to run the UI and the auth/ledger flow:** the example as-is (no chain
keys). **Minimum to credit a deposit or move on-chain USDT:** `JOBS_ENABLED=true`
plus the four chain keys.

---

## 3. Run it

Two long-lived processes, one per terminal:

```bash
npm run dev:api     # NestJS, http://localhost:3001  — Swagger at /api/docs
npm run dev:web     # Vite + React, http://localhost:5173 — proxies /api to :3001
```

| URL | What |
|---|---|
| http://localhost:5173 | The web app (customer / merchant / admin, one SPA) |
| http://localhost:3001 | The API |
| http://localhost:3001/api/docs | Swagger |

Open the web app, not the API, in the browser.

---

## 4. Demo data and test accounts

With the API running and `api/.env` configured (section 2):

```bash
npm run demo:seed --workspace api
```

This creates **`customer@demo.test`** and **`merchant@demo.test`**, opens a
merchant desk through `POST /v1/p2p/merchant/desk`, sends 150 test USDT to each
derived address, and **prints the password, the emailed OTP code and each
authenticator (TOTP) secret**. Put the printed secret into any TOTP app —
moving money always needs a code, being signed in is never enough (PRD §9.1).

`demo:seed` refuses to run against a non-local database, because it publishes
those credentials.

### Driving a full buy/sell round-trip

There is no customer-facing merchant UI; the merchant side is an operator
script. In a second terminal:

```bash
npm run seed:merchant --workspace api                 # serve the merchant feed until Ctrl-C
npm run seed:merchant --workspace api -- <orderId>    # or handle one order and exit
```

It signs in as `merchant@demo.test`, keeps the desk open, polls the merchant
feed and accepts/confirms each order. You drive the customer side in the browser
at http://localhost:5173. The screen-by-screen walk is [`DEMO.md`](DEMO.md) §6.2.

> Crediting a deposit needs `JOBS_ENABLED=true` and the chain keys, and the
> watcher must be live **before** the USDT lands (see the hazard in
> [`DEMO.md`](DEMO.md) §5). Without the chain configured you can still exercise
> auth, MFA, payment methods and quoting, but not a credited balance.

---

## 5. Everyday commands

Run from the repo root:

| Command | Does |
|---|---|
| `npm run dev:api` / `npm run dev:web` | Start API / web in watch mode |
| `npm run db:up` / `npm run db:down` | Start / stop the Postgres + Redis containers (`down` keeps the data) |
| `npm run db:migrate` / `npm run db:migrate:test` | Apply migrations to the dev / test database |
| `npm run db:reset` | Drop **both** databases, recreate, re-migrate dev + test |
| `npm run db:generate` | Generate a new Drizzle migration from schema changes |
| `npm run lint` | Lint api (eslint) + web (oxlint) |
| `npm run typecheck` | Type-check both workspaces |
| `npm run test` | api Jest + web Vitest |
| `npm run build` | Production build of both workspaces |

API-only extras (`--workspace api`): `test:e2e`, `test:cov`, `chain:deploy-token`,
`demo:seed`, `seed:merchant`, `disputes:exercise`.

---

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Deposits never show up | `JOBS_ENABLED` not `true`, or chain keys missing. The watcher must also be live before the USDT lands ([`DEMO.md`](DEMO.md) §5). |
| `demo:seed` fails on the sign-in code | `OTP_STATIC_DEV` not set in `api/.env` — the seed reads it. |
| Jest prints no summary / seems to hang | Watchman quirk — run the api tests with `--watchman=false`. |
| Port 3001 answers but routes 404 | Something else is on 3001. The real API serves under `/api` (e.g. `/api/v1/auth/login`). Stop the other process. |
| `db:up` can't bind a port | A stale container holds 5433/6380 — `npm run db:down` then `npm run db:up`. |
| Container starts but migrate fails | Give it a moment; `db:up` waits for health, but re-run `npm run db:migrate` if the DB came up slowly. |

---

## 7. Layout

```
api/     NestJS modular monolith — auth, ledger, wallet, chain, rates, p2p, admin
web/     Vite + React SPA — customer, merchant and admin routing
docs/    Spec (PRD.md), dependencies, decisions, demo and this guide
questions/   Open questions for the project owner
docker/  Postgres init SQL (creates the test database)
```
