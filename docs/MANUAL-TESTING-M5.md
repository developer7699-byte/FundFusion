# M5 — disputes, penalties, admin surfaces, reconciliation

What to run, what it proves, and what each of PRD §6.10's four outcomes
actually does to the ledger.

## The one command

```bash
# terminal 1
cd api && OTP_STATIC_DEV=246810 npx ts-node src/main.ts

# terminal 2
npm run disputes:exercise --workspace api
```

It opens four sell orders, disputes each, and resolves them one per outcome
over HTTP. It exits non-zero if a journal does not balance, a balance goes
negative, or anything is left locked.

### Recorded run — 2026-11-21

Both parties start with 1,000 USDT. Each order is 100 USDT at a mid rate of
₹100 with a 300bps markup, so the quoted platform fee is 3.00.

| Outcome | Customer | Merchant | What happened |
|---|---|---|---|
| **RELEASE** | 1000 → 900 | 1000 → 1097 | The merchant did pay, so it settles normally: 97.00 to them, 3.00 to revenue |
| **REFUND** | 900 → 900 | 1097 → 1097 | Escrow back to the customer, bond back to the merchant. Both net zero — nothing was sold, nothing was earned |
| **SPLIT** (40) | 900 → 860 | 1097 → 1135.80 | 40 to the merchant less a proportional 1.20 fee; the other 60 back to the customer |
| **REFUND_WITH_PENALTY** | 860 → 870 | 1135.80 → 1125.80 | Full refund, plus 10.00 compensation drawn from the merchant's bond. The other 90 of the bond returned |

```
platform revenue        8.400000000000000000     (3.00 + 1.20, twice over two runs)
still locked or bonded  0.000000000000000000
unbalanced journals     0
negative balances       0
```

**Reading the REFUND row.** Both balances are unchanged because the escrow
and the bond both return to where they came from. That is the point: a
refund is not a punishment.

**Reading the penalty row.** The merchant lost exactly 10.00 — the
configured 1000bps of the 100 USDT order — and kept the remaining 90 of
their bond. §6.10 rules out full forfeiture: a merchant whose bank had a
genuine outage would lose everything, word would spread, and merchant supply
would dry up.

## The decisions behind the numbers

**Compensation goes to the customer, not to platform revenue.** The PRD does
not say which. A platform that earns from disputes has an incentive nobody
should want it to have.

**A penalty where no bond exists is refused, not clamped to zero.** PRD §6.11
says a customer buying USDT has an empty wallet by definition and posts no
bond, so `REFUND_WITH_PENALTY` on a buy has nothing to draw from. It refuses
and names the alternatives, rather than posting a no-op that reads as a
penalty in the audit log.

**§6.10's list is written from the sell side.** "Release to the merchant" does
not generalise — on a buy the merchant holds the escrow. The outcomes are
stated so they hold on both sides:

| Code | §6.10's words | Meaning |
|---|---|---|
| `RELEASE` | Release to the merchant | The escrow goes to the counterparty, as a normal settlement would |
| `REFUND` | Refund to the customer | It returns to whoever posted it |
| `SPLIT` | Partial split | Divided, with the fee following what actually moved |
| `REFUND_WITH_PENALTY` | Refund plus a penalty from the bond | Full refund, plus compensation from the defaulting party's bond |

**A split on a sell counts as a default.** The merchant sent part of what they
owed, which is a partial failure and still a failure. An admin who disagrees
has RELEASE available.

## Checking the rest by hand

| What | How |
|---|---|
| SUPPORT can read everything | `GET /api/v1/admin/disputes`, `/admin/users`, `/admin/orders`, `/admin/ledger`, `/admin/overview` — all 200 |
| SUPPORT can resolve nothing | `POST /api/v1/admin/disputes/:id/resolve` — 403 |
| An ordinary user reaches no admin read | Every one of them — 403 |
| A resolve without `Idempotency-Key` | 400, naming the header |
| An outcome outside the closed list | 400 |
| Repeated defaults pause a desk | Resolve three sells against one merchant; the desk goes INACTIVE and the engine refuses its next accept |
| Reconciliation on a schedule | Runs daily at 03:00 when `JOBS_ENABLED=true`; logs the drift and every unbalanced journal by id |

The role split is the one worth checking yourself. PRD §9.2 exists because a
support account able to release escrow is the most common insider-fraud path
in platforms like this.

## Still missing

- **Support tickets.** `dispute.ticket_id` is now nullable and nothing fills
  it. Tickets are M6; a dispute that could not exist without one could not
  exist in M5 at all.
- **Notifications.** Nobody is told their dispute was resolved (PRD §10, M6).
- **Admin screens.** These are HTTP routes; the surfaces that use them are M6.
