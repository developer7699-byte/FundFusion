# M3 — the wallet on BSC testnet

What to run, what it proves, and what a clean result looks like.
[`MANUAL-TESTING.md`](MANUAL-TESTING.md) covers M0–M2.

## Prerequisites

| | |
|---|---|
| Docker | `npm run db:up` — Postgres on 5433, Redis on 6380 |
| Migrations | `npm run db:migrate && npm run db:migrate:test` |
| `api/.env` | `BSC_RPC_HTTP_URL`, `BSC_RPC_WS_URL`, `BSC_HD_SEED`, `USDT_CONTRACT_ADDRESS` |
| tBNB | The gas wallet needs a balance. It pays for every sweep and tops up the hot wallet. |

The three wallets all derive from `BSC_HD_SEED`, on separate BIP-44 branches
so none can ever collide — see [`api/src/chain/derivation.ts`](../api/src/chain/derivation.ts):

| Wallet | Path | Holds |
|---|---|---|
| Deposit addresses | `m/44'/60'/0'/0/{index}` | One per user, swept when they cross the threshold |
| Gas wallet | `m/44'/60'/0'/1/0` | tBNB. Dispenses gas; on testnet it also owns the test token |
| Hot wallet | `m/44'/60'/0'/2/0` | Swept USDT, and pays withdrawals out |

## The one command

```bash
npm run chain:roundtrip --workspace api
```

It runs the whole of M3 against live testnet using the same services the API
runs: derive an address, send test USDT to it, credit it on finality, sweep
it, withdraw it back out through the allowlist and the authenticator, then
reconcile.

It exits non-zero if reconciliation is not clean.

### What a good run looks like

```
── 4. Wait for the watcher to credit it on finality
credited 1 deposit(s)
AVAILABLE 25.000000000000000000

── 5. Sweep the deposit address to the hot wallet
swept 25 from 0x4b78…Bf3C in 0xe95212f3…
deposit address now holds 0 USDT

── 7. Withdraw 20 USDT back out
withdrawal … is APPROVED
LOCKED 20.000000000000000000
paid out in 0x832c5ba2…

── 8. Reconcile the ledger against the chain (PRD §13.1)
ledger   5.000000000000000000
on chain 5.000000000000000000
drift    0.000000000000000000 (tolerance 0.010000000000000000)
unbalanced journals: 0

RECONCILED ✓
```

### Recorded run — 2026-11-21

| | |
|---|---|
| Token | [`0x15511d371397aBB0348d8a21E6010DEb3a41F6AB`](https://testnet.bscscan.com/address/0x15511d371397aBB0348d8a21E6010DEb3a41F6AB) |
| Deposit address | `0x4b7877dD11Ef2d15297Cb0a013F8513d8D9EBf3C` |
| Deposit | `0x706c43f987aa22bf9d59c5a626d893b04c52cec164d360a1d982f980062a8b63` |
| Sweep | `0xe95212f31e17fac6a55c59b2a6d08faa3efca3fd3dc5e52bb6ba631f8911305a` |
| Payout | `0x832c5ba29cbddf0e2a3d3e419ee9599fcf9a7c68d5cf8762b080dfc6c42c9b2b` |
| Result | ledger 5, chain 5, drift 0, 0 unbalanced journals |

### The one thing it fast-forwards

The 24-hour address cooldown. Waiting it out in a script proves nothing that
[`allowlist.service.spec.ts`](../api/src/chain/../wallet/v1/allowlist.service.spec.ts)
does not already prove, including that re-saving the address does **not**
restart it. The script says so in its own output when it does this.

Everything else is real: a real transfer, real finality, real gas, a real
authenticator code, a real payout.

## Reading the result

### Reconciliation drift is a real finding, not noise

`drift` is on-chain custody minus what the ledger says the platform holds.

- **Negative** — the chain holds *less* than the ledger promises. The platform
  cannot honour every balance it is showing. A missed reversal, or an
  unauthorised withdrawal.
- **Positive** — the chain holds *more* than the ledger knows about. Usually a
  deposit nobody credited.

This check caught a real one during M3: 10 USDT moved to the hot wallet by a
manual chain test with no ledger entry behind it. That is exactly the class of
mistake it exists to find, and it is the only check here whose two sides are
produced by independent systems.

### A withdrawal stuck in `SENDING`

This is deliberate, and it needs a person.

A broadcast that throws **may still have reached the network**, and a token
transfer that lands cannot be recalled — so nothing retries it automatically.
Check the hot wallet on BscScan for a transfer matching the withdrawal:

- **A transfer went out** — the money is gone. Settle the ledger to match.
- **Nothing went out** — return the row to `APPROVED` and it will send on the
  next pass.

Guessing is how one withdrawal becomes two.

## Checking the parts on their own

| What | Command |
|---|---|
| Redeploy the test token | `npm run chain:deploy-token --workspace api` |
| Chain, sweeps, watcher, reconciliation | `npx jest src/chain --workspace api` |
| Withdrawals, allowlist, payouts | `npx jest src/wallet/v1 --workspace api` |
| The whole gate | `npm run lint && npm run typecheck && npm test && npm run test:e2e --workspace api && npm run build` |

## What M3 does not yet have

- **No HTTP routes.** Deposits, withdrawals and the allowlist are services
  wired into `AppModule`, reachable from tests and the round-trip script but
  not from a browser. The customer-facing routes are M4.5's spine.
- **No scheduled reconciliation.** `ReconciliationService` runs on demand; the
  scheduled job and its drift alert are M5.
- **No cold storage.** PRD §8.3's cold wallet and its manual top-up are not
  part of v1 on testnet.
