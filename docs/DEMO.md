# Demo — driving the v1 API from the application's own screens

What M4.6 built: the customer, merchant and admin screens now talk to the v1
engine instead of the in-memory prototype. This page is how to run that by
clicking, and an honest record of what each screen shows and what it cannot.

Spec: [`PRD.md`](PRD.md). Plan: [`plans/2026-11-21-m46-ui-integration.md`](plans/2026-11-21-m46-ui-integration.md).

---

## 1. Setup

```bash
npm run db:up                 # PostgreSQL and Redis
npm run db:migrate
```

`api/.env` needs three keys beyond the chain configuration:

| Key | Why |
|---|---|
| `OTP_STATIC_DEV=246810` | Without it the API mails a **random** sign-in code and `demo:seed` cannot read it. The seed refuses to start rather than failing later with a flat "Invalid code". |
| `JOBS_ENABLED=true` | The deposit watcher, the sweeps and the order clocks are off by default so a migration never starts watching a chain by accident. Deposits are **never credited** without it. |
| `BSC_RPC_HTTP_URL`, `BSC_RPC_WS_URL`, `BSC_HD_SEED`, `USDT_CONTRACT_ADDRESS` | Custody and the testnet. Half a configuration is refused outright. |

Then:

```bash
npm run dev:api               # http://localhost:3001
npm run dev:web               # http://localhost:5173, proxies /api
npm run demo:seed --workspace api
```

`demo:seed` creates `customer@demo.test` and `merchant@demo.test`, opens a
merchant desk **through `POST /v1/p2p/merchant/desk`** rather than with raw
SQL, sends 150 test USDT to each derived address, and prints the password,
the emailed code and each authenticator secret. It refuses to run against a
database whose host is not local, because it publishes those credentials.

Put the printed authenticator secret into any TOTP app. Moving money needs a
code from it; being signed in is never enough (PRD §9.1).

---

## 2. The walk

| Step | Screen | What it does |
|---|---|---|
| 1 | `/register` | Email, password, display name → `POST /v1/auth/register` |
| 2 | `/verify-otp` | The emailed code → a session |
| 3 | `/enrol-authenticator` | Secret shown **once**, then confirmed. Until this is done every money screen redirects here rather than collecting a 403 |
| 4 | `/customer/wallet/deposit` | The real derived address. Credited after 15 confirmations by the watcher — there is no button that credits a balance |
| 4b | `/customer/wallet/payment-methods` | Add a bank or UPI payee via `POST /v1/wallet/payment-methods`. A sell cannot confirm without one — the customer receives the rupees, so the engine binds their payee and refuses `422 NO_PAYMENT_METHOD` otherwise (PRD §6.3) |
| 5 | `/customer/sell` | Amount → `POST /v1/p2p/quotes` → the snapshot → `POST /v1/p2p/orders` with a fresh `Idempotency-Key`. The customer's chosen (or default) payee is frozen onto the order |
| 6 | `/merchant/available-orders` | The live feed with each obligation. Refetched on the `order.broadcast` socket event. First accept wins; the loser is shown the engine's 409 |
| 7 | `/customer/orders/:id` | The one action this state allows — submit a UTR on a buy, confirm receipt on a sell — and nothing else |
| 8 | `/admin/dashboard` | Escrow locked, bonded, revenue, open disputes, orders by status |

---

## 3. What the screens show, and what they cannot

**Every figure is a string from the ledger.** No screen multiplies, sums or
rounds money. The wallet shows each bucket — available, locked, bonded,
pending — separately, because a total would mean adding them in a JavaScript
number (PRD §5.1).

Removed, because nothing behind them was real:

- the two "Continue with Google" buttons, which signed you in as a demo
  account and filled the form with a random address;
- the simulate-broadcast and simulate-confirm deposit buttons;
- the hardcoded TRC20 / ERC20 / UPI deposit addresses;
- the admin suspend-user, complete-order and refund-order buttons;
- the fabricated BILL_PAY, GIFT_CARD and RECHARGE rows in the transaction
  list, and the gift-card, utility and UPI scan-and-pay screens (PRD §3).

Still local mocks, clearly marked in `web/src/lib/merchant-store.ts`:
merchant settlement accounts, notices, earnings and the desk profile.
Notifications and support are no longer served at all: the prototype surface
behind them was removed in M0, and M6 rebuilds them on the database.

**The gap that mattered — now closed (0.3.2).** The payee's INR destination
is real: `payment_method` holds a user's bank/UPI payees, the engine freezes
the payee onto an order at the money-leg boundary (the customer's on a sell
at confirm, the merchant's on a buy at accept), and the order detail
(`GET /v1/p2p/orders/:id`) shows the payer where to send the rupees. The API
flow no longer stops where the rupees move. The approved UI still has to be
re-skinned onto this (the parked web spine does not yet read the instruction
or offer the payment-method screen), which is M6's "three roles usable end to
end".

---

## 4. What was actually run, on BSC testnet

`demo:seed` against a live API, then a full sell driven over the exact routes
and headers the screens send.

| Step | Result |
|---|---|
| Two accounts, authenticator enrolled | `customer@demo.test`, `merchant@demo.test` |
| A desk opened through `POST /v1/p2p/merchant/desk` | no SQL |
| 150 test USDT to each derived address | credited by the watcher at 15 confirmations: `Credited 150.000000000000000000 USDT` for both |
| `POST /v1/p2p/quotes` | 100 USDT → ₹9409.00 at ₹94.09, fee 3.000000000000000000 USDT |
| `POST /v1/p2p/orders` with an `Idempotency-Key` | order created, broadcast |
| `GET /v1/p2p/merchant/feed` | 1 offered, obligation 100.000000000000000000 USDT |
| accept → UTR → customer confirms receipt | `COMPLETED` |
| `GET /v1/p2p/orders` | `COMPLETED SELL role CUSTOMER` |
| `GET /v1/wallet/summary` | customer 150 → **50**, merchant 150 → **247** |

The merchant received **97**, not 100, and the platform took **3**. The
journal balances:

```
AVAILABLE   297.000000000000000000
LOCKED        0.000000000000000000
BONDED        0.000000000000000000
EXTERNAL   -300.000000000000000000
REVENUE       3.000000000000000000
```

That is PRD §15's first done-condition, met on testnet, through the routes
the screens call.

A buy followed, over the same routes with the sides reversed — the customer
submits the UTR and the **merchant** confirms receipt:

| Step | Result |
|---|---|
| `POST /v1/p2p/quotes` side BUY | 20 USDT for ₹1998.20 at ₹99.91 |
| accept → customer UTR → merchant confirms | `COMPLETED` |
| balances | customer 50 → **70**, merchant 247 → **227** |

The customer asked for 20 USDT and received exactly 20. The merchant fee was
`0.000000000000000000`, because `quote.buyFeeBps` defaults to 0 — "zero until
the business sets it", blocked on commercial decision D-01 (PRD §18). So PRD
§15's second done-condition is only half shown here: the buy-side maths is
exact, but the fee leg carries no value at the default setting. The leg
itself is covered by `settlement.service.spec.ts`.

### Not verified

- **The click-through itself.** The browser could not be driven from the
  session that produced this page, so steps 5–8 of §2 were exercised over
  HTTP with the screens' own routes, headers and idempotency keys — not by a
  person using the screens. The screens' own behaviour is covered by
  `auth-v1`, `wallet-v1`, `orders-v1` and `merchant-v1` tests.

---

## 5. A hazard found while running this

The first attempt was run with `JOBS_ENABLED` unset, so nothing credited. On
enabling it, `SweepService` swept 150 USDT out of **both** deposit addresses
and into the hot wallet, while `DepositWatcherService` credited **neither** —
its cursor starts at the finalized head, so the blocks holding those two
transfers had already passed and were never scanned.

`SweepService.sweepOnce` decides purely on an address's on-chain balance. It
does not ask whether that balance was ever recorded as a deposit or credited
to a journal. Whenever the watcher is behind, newly initialised, or was off
while a deposit landed, a customer's USDT is taken into the treasury and
never appears in their balance.

This is M3 code and outside M4.6's scope, so it was recorded rather than
fixed. The second run — with the watcher already live before the transfers
landed — credited both correctly, which is the run recorded above.
