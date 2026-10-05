# NEXORA PAY

**Your Digital Money. Your Way.**

Original digital-finance prototype: customer, merchant, and admin desks on one NestJS + PostgreSQL backend. Every balance and payment event is **simulated**.

This is not a bank, escrow agent, licensed VDA platform, or live UPI provider.

## Local setup

### 1. PostgreSQL

Docker Desktop is optional. This machine already has PostgreSQL 18. Create a prototype role (use your superuser client):

```sql
CREATE USER nexora WITH PASSWORD 'nexora_dev_only';
CREATE DATABASE nexorapay OWNER nexora;
GRANT ALL PRIVILEGES ON DATABASE nexorapay TO nexora;
```

Copy `api/.env` from `.env.example` if needed. Default URL:

`postgresql://nexora:nexora_dev_only@localhost:5432/nexorapay?schema=public`

Then:

```
cd api
npx prisma db push
npx prisma db seed
npm run start:dev
```

Redis is reserved for OTP throttling in a later phase.

### 2. Web

```
cd web
npm run dev
```

Open `http://localhost:5173`  
Swagger: `http://localhost:3001/api/docs`

### Demo operators (after seed)

| Role | Email | Password |
|------|-------|----------|
| Customer | customer@nexorapay.dev | Nexora!Demo1 |
| Merchant | merchant@nexorapay.dev | Nexora!Demo1 |
| Admin | admin@nexorapay.dev | Nexora!Demo1 |

Mock OTP in development: `246810`

## Read first

- `BLUEPRINT.md` — product contract
- `PROJECT_STATE.md` — current phase (required before continuing)
- `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `API.md`, `TESTING.md`

## Stack

React + Vite + TypeScript · NestJS · Prisma · PostgreSQL · Redis
