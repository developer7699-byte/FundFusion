# M4.5 — the thin end-to-end spine

A full sell and a full buy, over HTTP, against the real engine on BSC
testnet. [`MANUAL-TESTING-M3.md`](MANUAL-TESTING-M3.md) covers the wallet;
this covers the path a person drives.

## What exists now

Two HTTP surfaces run side by side, and they are not the same thing.

| Surface | Routes | Backed by |
|---|---|---|
| **v1 — real** | `/api/v1/*` | PostgreSQL, the ledger, the P2P engine, BSC testnet |
| prototype | `/api/auth/*`, `/api/wallet/*`, `/api/customer/*`, `/api/merchant/*`, `/api/admin/*` | In-memory maps. Unchanged, and still what the existing screens use |

The browser spine lives at **`/spine`** and talks only to v1. It is
deliberately plain: it exists to prove the engine end to end, not to be the
product. Rewiring the existing screens onto v1 is M6.

## Running it

```bash
npm run db:up
npm run db:migrate

# terminal 1 — the API, with the deposit watcher running
cd api && JOBS_ENABLED=true OTP_STATIC_DEV=246810 npx ts-node src/main.ts

# terminal 2 — the browser spine
npm run dev:web          # then open http://localhost:5173/spine

# or drive the whole thing without a browser
npm run spine:roundtrip --workspace api
```

`OTP_STATIC_DEV` fixes the emailed sign-in code in development. Without it
the code is written to the API log, which is where it goes until a domain
exists and Resend is wired (`docs/DEPENDENCIES.md` §1.3).

### Recorded run — 2026-11-21

Driven by `spine:roundtrip`, which speaks only HTTP using the same routes
and headers the browser spine uses.

```
── 3. Deposit real test USDT to both, credited by the watcher
customer deposit address 0x4b7877dD11Ef2d15297Cb0a013F8513d8D9EBf3C
merchant deposit address 0x8Ac70Cc894B230b4dbAe1D14a96c277bc6Ca8930
customer AVAILABLE 150.000000000000000000
merchant AVAILABLE 150.000000000000000000

── 4. SELL — the customer sells 100 USDT
quoted 100.000000000000000000 USDT = ₹9409.00 at 94.09, fee 3.000000000000000000
merchant sees it, obligation 100.000000000000000000
sell order COMPLETED

── 5. BUY — the customer buys 50 USDT
quoted 50.000000000000000000 USDT = ₹4995.50 at 99.91
buy order COMPLETED

── 6. The ledger
customer AVAILABLE 100.000000000000000000
merchant AVAILABLE 197.000000000000000000
platform revenue 3.000000000000000000
unbalanced journals 0
```

**Reading those numbers.** The customer deposited 150, sold 100 and bought
50 back, so 100 remains. The merchant deposited 150, received 97 on the sell
— 100 less the 3 USDT platform fee — then gave up 50 on the buy, leaving
197. Platform revenue is the 3.00 from the sell; the buy earned nothing
because `quote.buyFeeBps` is still 0 and nobody has set it.

PRD §15 item 1 names 97.00 USDT to the merchant and 3.00 to revenue on a
100 USDT order. Both hold exactly. Its ₹9,700 figure is the **mid-rate**
illustration: the customer receives ₹9,409 because the 300bps markup applies
on their side (PRD §7). Mid 97.00, customer sell rate 94.09, customer buy
rate 99.91.

## What this proves, and what it does not

**Proved on testnet, over HTTP:** deposit addresses, crediting on finality,
quotes and their snapshots, confirmation with an idempotency key, the
merchant feed, first-accept-wins, UTR submission, receipt confirmation,
settlement postings, and a ledger with no unbalanced journal.

**Not yet driven by a human in a browser.** The spine page serves and the
dev proxy reaches the API, but the recorded run above was driven by the
script. It uses the same routes, headers and order of operations the page
does, so the surface is exercised — the clicking is not.

## The three refusals worth checking by hand

| Try this | What should happen |
|---|---|
| Accept your own order as a merchant | `403 SELF_DEALING_REFUSED`, and it never appears in your feed |
| Confirm an order with no `Idempotency-Key` | `400`, naming the header |
| Two merchants accept at once | One `201`, one `409 ORDER_ALREADY_ASSIGNED` |

The first is new in M4.5 and matters most: PRD §9.1 gave up the
one-phone-one-account rule, and self-dealing on the engine is the one place
this platform's incentives can be gamed. The engine refuses it inside the
same transaction that would otherwise post the bond — the feed filter is a
convenience on top, not the control.

## Still missing

- **No Redis adapter on the socket.** One API instance needs none; several do
  (PRD §11). It is a socket.io adapter at that point, not a code change.
- **No scheduled reconciliation.** The service exists; the job is M5.
- **The prototype screens still point at the prototype API.** M6.
- **Email codes go to the API log.** Needs a domain and DNS records.
