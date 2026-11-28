# Grilling — FundFusion / PandaPay (Crypto-to-UPI, P2P USDT, Digital Store)

**Idea (grill-me/IDEA.md):** a crypto platform where users deposit/withdraw USDT on
BEP-20, trade P2P, and pay utilities and gift cards. Roles: user, merchant, super admin.

**Reference documents (reference only, not requirements):**

| Document | Status |
|---|---|
| `PandaPay SOW & Engineering Master Blueprint V2.0` (23 pp) | The real spec. Supersedes SOW V1.0 and Draft v0.2. Staking permanently removed. |
| `Crypto_UPI_Settlement_SOW V1.0` (22 pp, scanned) | Superseded by V2.0. Earlier agency proposal, same skeleton, less detail. |
| `grill-me/IDEA.md` (FASTXP2P Blueprint v1.0) | Earlier self-authored plan. Mock-first, Next.js. Conflicts with the repo as built. |

**Repo as found (16 Nov 2026):**

- `web/` — Vite + React 19 + Tailwind 4, ~21,900 LOC. Covers far more than scope
  (Launchpad, Copy Trade, Earn, Virtual Card, Leaderboard, Rewards, Cardless Cash).
- `api/` — NestJS 11, ~2,500 LOC, **in-memory store that resets on restart**.
- `api/prisma/schema.prisma` — 536 lines, 30+ models, sound double-entry shape, **unused**.
- Four competing product names: FundFusion, NEXORA PAY, PandaPay, FASTXP2P.

**Status:** COMPLETE — 47 decisions, 9 rounds, frontier empty. All rounds closed on the questions page 2026-11-27. See `PRD.md`. Branch: `feat/v1-rebuild`.

---

## Round 1 — Scope lock: what is in v1, what is out

| # | Question | Your answer | Your comment |
|---|----------|-------------|--------------|
| q1 | The v1 spine | **A — Wallet (USDT BEP-20) + P2P buy/sell with merchant escrow. Nothing else.** *(rec)* | — |
| q2 | Does the platform hold INR | **A — Never. INR moves merchant↔customer by UPI; platform records the UTR and moves USDT only.** *(rec)* | — |
| q3 | Chains and assets | **A — USDT on BEP-20 only.** *(rec)* | — |
| q4 | Custody model | **A — Fully custodial, self-managed HD wallet, isolated signer interface.** *(rec)* | — |
| q5 | Real chain or mock | **A — Real BEP-20 on BSC testnet, mainnet behind a flag.** *(rec)* | — |
| q6 | Client surfaces | **B — Responsive web, PWA-installable.** *(rec)* | Web application only. No contract for Android/iOS apps. |
| q7 | Identity verification | **A — Phone OTP, flat limits, limit engine built for later tiers.** *(rec)* · **CHANGED (R7, 2026-11-21): identity moved to email + authenticator; phone dropped.** | Onboarding via OAuth, email **and** phone — but verification is phone OTP only. |
| q8 | Fate of existing code | **A — Keep repo + design system, delete out-of-scope screens, rebuild backend on PostgreSQL.** *(rec)* | **Re-evaluate the tech stack on both sides.** Cut a branch off `main`, then change. |
| q9 | Commercial engine | **A — Configurable versioned fee engine + 3%/3.75% postings. Weekly bonus pool deferred.** *(rec)* | — |

**Summary.** v1 is deliberately narrow: a custodial USDT BEP-20 wallet on a real
double-entry ledger, plus a P2P buy/sell market with merchant escrow — on BSC
testnet, as one responsive web app, with phone-OTP verification and a
configurable fee engine. UPI QR pay, gift cards, game top-ups, utilities,
verification tiers, native apps and the weekly merchant bonus pool are all **out
of v1**.

Two answers opened new ground rather than closing it. **q2=A** means the platform
has no INR to seize, so merchant INR liquidity is self-declared and
unenforceable — Round 2 q11 closes that hole. **q8** reopened the tech stack on
both sides — Round 2 q14 and q15.

Working branch: `feat/v1-rebuild`, cut from `main`. `main` stays as the last
known state of the prototype.

---

## Round 2 — The P2P engine, the INR problem, and the stack

| # | Question | Your answer | Your comment |
|---|----------|-------------|--------------|
| q10 | Shape of the P2P market | **B — Quote-and-broadcast, first-accept-wins. Platform sets the rate.** *(rec)* | — |
| q11 | Proving merchant INR capacity | **A — USDT collateral locked at accept; the bond IS the INR guarantee.** *(rec)* | Asked how Binance handles this. Answered; re-confirming as q11b. |
| q12 | Who confirms the INR arrived | **A — The receiver confirms. Payer uploads UTR. No confirmation → admin dispute.** *(rec)* | — |
| q13 | Rate source and spread | **PENDING** — worked example provided, re-asked as q13b | "Explain this with example then I'll answer in the next round." |
| q14 | Frontend stack | **A — Keep Vite + React SPA + vite-plugin-pwa.** *(rec)* | — |
| q15 | Backend stack | **A — NestJS + Drizzle + PostgreSQL + Redis/BullMQ.** *(rec)* | — |
| q16 | Product name | **C — FundFusion** | Name not confirmed; use what the UI says. → `PLATFORM_NAME` config key, default = current UI string; package stays `fundfusion`. |
| q17 | Team and deadline | **A — You + me, no fixed external deadline. Ledger → P2P engine → surfaces.** *(rec)* | — |

**Summary.** The engine is settled: the platform quotes a price, broadcasts to
eligible merchants, and the first to accept wins atomically. Merchants bond USDT
against their INR obligations, because the platform has no INR to seize. The INR
recipient is the oracle on settlement, with UTR evidence and an admin dispute
queue behind it — which makes **disputes a core operational surface, not an edge
case**. Stack: NestJS + Drizzle + PostgreSQL + Redis/BullMQ behind the existing
Vite + React SPA. Two of us, no external deadline, correctness first.

**Open from this round:** q13 (rate engine) deferred for a worked example —
re-asked as q13b. q11 re-confirmed as q11b now that the Binance precedent is on
the table.

### On the Binance question (q11)

Binance does not custody fiat either. Their protection is **structural**: crypto
is escrowed first, so the fiat payer never pays out of someone else's locked
funds. If the fiat buyer ghosts, the trade times out and the crypto returns —
nothing was at risk. Policing is reputational: cancellation-rate metrics,
temporary bans, an appeal desk working from bank statements, plus a standing
security deposit for merchant-tier accounts only.

Mapped onto us, the customer also loses only time, so a Binance-style model
genuinely loses no money. The case for collateral is that **our customer is a
payer, not a trader** (their quote dies and the rate may have moved), that phase-2
UPI QR pay puts someone at a shop counter, and that broadcast-to-eligible means
*we* chose the merchant. Correction to Round 2: the capital objection was
overstated — per-order locking and a standing deposit are economically
near-identical. The real cost of collateral is **merchant supply**, not capital.

---

## Round 3 — Rate engine re-ask, money movement, operational policy

| # | Question | Your answer | Your comment |
|---|----------|-------------|--------------|
| q13b | Rate engine (re-asked with worked example) | **A — Pluggable provider: feed + admin markup + bounded manual override + immutable snapshot, 90s TTL.** *(rec)* | — |
| q11b | Collateral vs reputation | **A — Keep USDT collateral per order.** *(rec)* | Confirmed after seeing the Binance precedent. |
| q18 | Pre-verification limits | **A — Phone OTP is the financial gate. One phone = one account.** *(rec)* · **CHANGED (R7): authenticator is the gate; one-phone-one-account replaced by merchant manual review.** | — |
| q19 | Deposit confirmations | **CHANGED 2026-11-16 → credit on `finalized` block tag, ~1–2s.** Originally A (15 confirmations, ~45s). | Premise was stale: BSC block time is ~0.45s since Fermi (Jan 2026), and BEP-126 gives deterministic finality. Counting confirmations is now slower *and* weaker than reading the finalized head. Reorg-reversal path still built. |
| q20 | Custody of swept funds | **A — Threshold sweep → hot wallet (days of withdrawals) → cold. Funded gas wallet with alerts.** *(rec)* | — |
| q21 | Withdrawal approval | **A — Auto below a threshold with velocity caps; manual above or on risk flag.** *(rec)* | — |
| q22 | Timeout windows | **A — 120s / 15min / 15min. Receiver timeout → DISPUTE, never auto-release.** *(rec)* | — |
| q23 | Merchant broadcast | **A — WebSocket gateway over Redis pub/sub, single publish instant.** *(rec)* | — |
| q24 | Admin roles | **A — Two roles: SUPPORT (read, no money) and SUPER_ADMIN (MFA + reason code).** *(rec)* | **Super admin must control permissions at role level AND user level, as service/feature capabilities** — e.g. block gift cards for one user, block self-withdrawal for another. |

**Summary.** Money movement is fully specified. Deposits credit at 15
confirmations with a reorg-reversal journal; funds sweep to a bounded hot wallet
with cold storage behind it and a monitored gas wallet (BEP-20 sweeps need BNB
*in* each deposit address — two transactions, recurring dust cost). Withdrawals
auto-approve under a threshold but always sit behind an address allowlist, a 24h
cooldown on new addresses, and a fresh OTP. Phone OTP gates everything
financial, one phone to one account. Timeouts may return funds, **never advance
them** — receiver silence escalates to dispute. Merchants get orders over
WebSocket from a single publish instant, with broadcast and accept timestamps
logged for fairness.

Your q24 comment adds an **entitlement layer** over RBAC: capabilities
controllable per role *and* per user. Shapes Round 4 q25.

---

## Round 4 — Entitlements, disputes, and everything around the code

| # | Question | Your answer | Your comment |
|---|----------|-------------|--------------|
| q25 | Per-user capability model | **A — Capability registry. Roles grant; per-user GRANT/DENY overrides; DENY wins; actor + reason + optional expiry.** *(rec)* | — |
| q26 | Defaulting merchant's bond | **A — Proportionate penalty: customer refunded in full, configurable compensation from bond, rest released, repeat defaults auto-pause.** *(rec)* | — |
| q27 | Notifications and OTP | **A — In-app centre as durable record + web push + email + SMS for OTP only. India-capable DLT vendor.** *(rec)* | — |
| q28 | Environments | **A — Local Compose + ONE always-on staging on BSC testnet. Production decided later.** *(rec)* | — |
| q29 | Backup and reconciliation | **A — Managed Postgres + PITR + restore drill, plus automated ledger-vs-on-chain reconciliation with drift alerts.** *(rec)* | — |
| q30 | Observability | **A — Structured logs with request id + idempotency key, error tracking, money metrics, five named alerts.** *(rec)* | — |
| q31 | Testing | **A — Decimal unit tests, real-Postgres integration tests, N-way concurrency test, invariant test. Thin E2E.** *(rec)* | — |
| q32 | Milestones and DoD | **A — M0–M7, with a thin end-to-end spine proven on testnet after M4 before surfaces are polished.** *(rec)* | — |

**Summary.** Everything around the code is now decided. Capabilities are a
registry with per-user overrides where DENY wins and holds can expire. A
defaulting merchant refunds the customer in full and pays a proportionate
penalty from the bond — never full forfeiture, because merchant supply is the
scarce resource. One always-on staging environment on BSC testnet, managed
Postgres with PITR, and a reconciliation job comparing the ledger against
on-chain custody — the only check whose two sides come from independent systems.
Alerts focus on the silent failures: gas wallet floor and deposit watcher lag.
Tests run against real Postgres, never a mock, with an invariant test over
random operation sequences. **v1 is done when the SOW acceptance tests pass on
testnet and reconciliation is clean for seven consecutive days.**

**Launch gates identified (not engineering tasks):** FIU-IND registration and
KYC/AML before mainnet money moves; TRAI DLT registration before transactional
SMS works at all.

---

## Round 5 — The buy-side revenue hole, money representation, order denomination

Working through q26 exposed a gap that q9 had papered over. Sell-side revenue is
clean because the platform cuts from an asset it custodies. Buy-side has no such
asset: the customer pays INR straight into the merchant's bank and the merchant
releases USDT, so **the platform earns nothing**. The SOW's "3.75% direct merchant
reward" is not a platform payment at all — it is the merchant's own spread,
realised in INR, outside the system. That is also why open-register item D-01
cannot settle on a calculation basis: there is no platform-visible money to
compute a basis from.

| # | Question | Your answer | Your comment |
|---|----------|-------------|--------------|
| q33 | Buy-side platform revenue | **A — Charge the MERCHANT a platform fee in USDT, debited from available balance on completion.** *(rec)* | — |
| q34 | Money storage and rounding | **A — NUMERIC(38,18) USDT / NUMERIC(20,2) INR, decimal strings, conservative rounding, residue to a ROUNDING ledger account.** *(rec)* | — |
| q35 | Order denomination | **A — Both directions, snapshot both figures plus an authoritative-side flag.** *(rec)* | — |
| q36 | Buy-order abandonment | **A — Concurrent-order cap, abandonment rate, escalating cooldown. Merchant never penalised.** *(rec)* | — |

**Summary.** The buy-side hole is closed: the platform earns in the asset it
custodies, by debiting the merchant a configurable USDT fee inside the same
settlement journal. The customer's quote stays honest — they ask for 97 USDT and
receive exactly 97. Money is fixed-point throughout, never a float, and every
rounding residue lands in a dedicated `ROUNDING` account so journals balance to
the last unit. Orders may be denominated in either USDT or INR, which is what
phase-2 UPI QR pay will require. Customer abandonment is controlled by limits
rather than bonds, because a first-time buyer has an empty wallet by definition.

---

## Round 6 — M4: two clocks over one order (`engine-r1`)

| # | Question | Your answer | Your comment |
|---|----------|-------------|--------------|
| q37 | Which clock binds at accept — the quote's 90s TTL or the order's 120s search window | **A — The search window binds at accept; the TTL only bounds the customer's decision to confirm.** *(rec)* | Accepted the recommendation — this is what is built. |

**Summary.** A code review flagged that PRD §6.7's "accept asserts the quote
has not expired" is unimplementable against a 90s TTL under a 120s search
window — literally read, every order dies at 90s. Resolved: the two clocks
guard different risks. The TTL stops a customer sitting on a favourable price
and confirming only when the market moves their way — that risk ends at
confirmation, when their USDT locks. The merchant-side risk is bounded by the
search window. The settings registry already refuses a window shorter than the
TTL, so the gap cannot be configured open.

---

## Round 7 — Email-only identity: what replaces one-phone-one-account (`identity-r1`)

| # | Question | Your answer | Your comment |
|---|----------|-------------|--------------|
| q38 | With phone verification gone, what stops one person running many accounts and self-trading | **B — Manual review of merchants only; self-dealing needs both sides, so gating the bonded side breaks it.** *(rec, with C as honest fallback)* | Gate the bonded side; self-dealing needs both sides. |

**Summary.** Identity moved to email + authenticator on 2026-11-21, which takes
TRAI DLT registration off the critical path — a real win — but email is near-free
to create, so PRD §9.1's "one verified phone = one account" anti-self-dealing
property is gone. Resolution: self-dealing needs a merchant on one side, and
merchants already bond USDT and already need approval, so gating the merchant
side breaks the loop at its narrowest point for no new cost. v1 has no incentive
programme, so the honest fallback (C) — accept it, since self-trading only burns
fees — holds until any referral/rewards scheme lands.

**Supersedes:** q7 and q18 (phone OTP as the financial gate, one-phone-one-account)
— both marked **Changed** above.

---

## Round 8 — UI rebuild: porting main's design onto the real v1 API (`ui-r1`)

| # | Question | Your answer | Your comment |
|---|----------|-------------|--------------|
| ui-r1-q1 | What does "use exact main UI" cover | **main's visual design/layout/components, but only the v1-legal screens.** *(rec)* | Banned scope dropped. |
| ui-r1-q2 | What do we build on | **CHANGED from rec — drop current UI, port main's screens, rip out the prototype API, rewire to v1.** | Chose option 1 over the reskin recommendation. |
| ui-r1-q3 | First slice | **Auth + wallet (deposit/withdraw) + buy + sell + payment-methods + order detail.** *(rec)* | The smallest set where money round-trips. |
| ui-r1-q4 | Out-of-scope screens — delete or hide | **CHANGED from rec — keep components in the tree but unreachable (no route/nav).** | Chose hide over delete. |
| ui-r1-q5 | main's BTC/ETH wallet vs v1 USDT+INR | **Drop multi-asset; wallet shows USDT + INR estimate only.** *(rec)* | Matches the ledger. |

**Summary.** The UI is rebuilt from main's visual language but scoped to v1-legal
screens only. Two answers departed from the recommendation: you chose to port
main's screens and rewire from scratch rather than reskin the already-tested
v1-wired spine (q2), and to keep out-of-scope components parked-but-unreachable
rather than delete them (q4). The q4 choice sits in tension with CLAUDE.md §3
("do not leave routes or tables lying around") — tolerable only while the parked
components carry no route and no nav; revisit if any become reachable.

---

## Round 9 — UI rebuild: gaps the builder check surfaced (`ui-r2`)

| # | Question | Your answer | Your comment |
|---|----------|-------------|--------------|
| ui-r2-q1 | Who accepts a buy/sell order so it completes on testnet this slice | **Seed/operator merchant stands in as counterparty; no merchant UI this slice.** *(rec)* | — |
| ui-r2-q2 | MFA enrollment screen main never designed | **Design a new MFA-enrollment screen in main's visual language.** *(rec)* | Documented deviation. |
| ui-r2-q3 | main's four wallet tiles vs v1's two operations | **Send = inert ParkedAction; Withdraw = real external send; Deposit/Receive = address screen.** *(rec)* | — |
| ui-r2-q4 | Where the INR estimate comes from | **USDT only this slice; raise a backend finding for a server-computed INR estimate.** *(rec)* | — |

**Summary.** The first UI slice is made buildable on testnet: a seed/operator
merchant stands in as the order counterparty so buy/sell complete without a
merchant UI; a new MFA-enrollment screen is drawn in main's visual language
(logged as a deliberate deviation since main never designed one); the four
main wallet tiles collapse onto v1's two real operations with Send parked; and
the INR estimate is deferred to a server-computed value (§5 forbids a
client-side figure) with a backend finding raised, USDT-only until it lands.

---

# Grilling complete

**47 decisions across 9 rounds (36 in the scope rounds R1–R5, 11 in the build
rounds R6–R9). Frontier empty.** Specification written to `PRD.md`. The four
build rounds moved from scope to construction: the order-clock ambiguity (R6),
the loss of the phone anti-self-dealing property under email identity (R7), and
the UI rebuild onto the real v1 API (R8–R9).

## How the answers shaped the idea

The idea arrived as a four-subsystem platform and leaves as **one spine built
properly**. Gift cards, game top-ups, the Rooter Playwright worker, utilities,
UPI QR pay, verification tiers, native apps and the weekly merchant bonus pool
are all out of v1 — not abandoned, but sequenced behind a ledger that has to be
correct first.

Three answers did most of the reshaping:

1. **q2 — the platform never touches INR.** This kept the project out of RBI
   payment-aggregator territory, and it broke the SOW's merchant eligibility
   rule in the same move, since a self-declared INR balance is unenforceable.
   The replacement is a **USDT bond**: the merchant's own custodied crypto is
   the guarantee behind their INR promise.

2. **q10 — quote-and-broadcast, not an ad board.** The platform owns the price,
   and therefore the spread risk. That made the rate engine, the quote TTL and
   the immutable snapshot load-bearing rather than incidental.

3. **q33 — the buy-side revenue hole.** Following the bond mechanics through
   showed the platform earned nothing on buy-side orders, and that the SOW's
   "3.75% merchant reward" was never a platform payment at all. Revenue now
   arrives as a merchant-side USDT fee, in the asset the platform controls,
   inside the settlement journal.

The recurring principle underneath all three: **the platform can only enforce
what it custodies.** Every control in this design reduces to that sentence.
