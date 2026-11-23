# FundFusion

A custodial USDT wallet and P2P settlement platform. The platform holds USDT on
BNB Smart Chain and lets users convert between USDT and Indian rupees through
vetted liquidity merchants.

The platform custodies the crypto and runs the escrow. It **never touches
rupees** — rupees move bank-to-bank between customer and merchant, and the
platform records the UTR as evidence and moves the USDT.

Three roles share one web application: customer, merchant and admin.

> **v1 runs on BSC testnet only.** This is not a bank, an escrow agent, or a
> licensed VDA platform, and it holds no real money.

## Read first

| Document | What it is |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | **The spec.** Wins over every other document. |
| [`docs/RUNNING.md`](docs/RUNNING.md) | How to run the app locally — prerequisites, env, demo data, commands, troubleshooting |
| [`docs/DEPENDENCIES.md`](docs/DEPENDENCIES.md) | Accounts, keys and costs needed from the client, ordered by what they block |
| [`CLAUDE.md`](CLAUDE.md) | Rules for agents working in this repo |
| [`AGENTS.md`](AGENTS.md) | Shared working rules |
| [`docs/decisions/`](docs/decisions/) | How the spec got its shape |

## Stack

React 19 + Vite + TypeScript + Tailwind 4 · NestJS 11 · Drizzle · PostgreSQL 16
· Redis 7 + BullMQ · BSC testnet

## Local setup

```bash
cp .env.example api/.env     # testnet values only — never a real secret
npm install
npm run db:up                # Postgres 16 + Redis 7 via Docker Compose
npm run db:migrate           # schema into fundfusion_dev
npm run db:migrate:test      # and into fundfusion_test
npm run dev:api              # http://localhost:3001
npm run dev:web              # http://localhost:5173
```

All infrastructure runs in Docker. Nothing needs PostgreSQL or Redis
installed on the machine — and because many machines already have them, the
containers publish **5433** and **6380** rather than the default ports, so
they cannot collide with or quietly shadow an existing instance.

`npm run db:reset` throws both databases away and rebuilds them from the
migrations. `npm run db:down` stops the containers and keeps the data.

Swagger: `http://localhost:3001/api/docs`

## Layout

```
api/     NestJS modular monolith — auth, ledger, wallet, chain, rates, p2p, admin
web/     Vite + React SPA — customer, merchant and admin routing
docs/    Spec, dependencies and decision record
questions/   Open questions for the project owner
```

## Status

Phase 1 (v1) is in progress. Milestones are `docs/PRD.md` §14; the definition of
done is §15. Scope boundaries are §3 — gift cards, game top-ups, utilities, UPI
QR scan-and-pay, verification tiers and staking are **not** in v1.
