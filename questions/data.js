// FundFusion / PandaPay — grilling session data. Append-only.

round({
  id: "scope-r1",
  title: "Round 1 — Scope lock: what is in v1, what is out",
  settled: false,
  qs: [
    {
      id: "q1",
      t: "What is the v1 spine — the thing that must work end to end before anything else is built?",
      ctx: "PandaPay SOW V2.0 bundles four separable subsystems: (1) hybrid wallet with USDT deposit/send/withdraw on a double-entry ledger, (2) P2P USDT buy/sell marketplace with merchant liquidity providers and escrow, (3) UPI QR scan-and-pay (customer scans a shop's UPI QR, a merchant pays that shop in INR, customer's USDT is released), (4) a digital store for gift cards and game top-ups fulfilled by a Python Playwright worker driving shop.rooter.gg, plus utilities (recharge/DTH/bills). Your stated scope names only (1) and (2).",
      o: [
        "A — Wallet (USDT BEP-20 deposit/send/withdraw) + P2P buy/sell with merchant escrow. Nothing else in v1.",
        "B — A, plus UPI QR scan-and-pay.",
        "C — B, plus the gift card / game top-up store.",
        "D — Everything in SOW V2.0 including utilities, verification tiers and social linking."
      ],
      r: 0,
      why: "A is exactly what you stated, and it is the only part that must be correct before anything else can be trusted. UPI QR pay is sell-side P2P with a different payee — it reuses the same escrow engine and can be layered on in phase 2 with no rework. The gift card store is a different business (supplier automation, stock, refunds) that shares nothing with the ledger except the debit. Building A alone is roughly a third of the SOW and still the hardest third."
    },
    {
      id: "q2",
      t: "Does the platform ever hold, move or custody INR?",
      ctx: "This is the single largest regulatory and architectural fork in the whole project. SOW V2.0 shows merchants with an INR balance split into Available / Locked / Pending buckets, which reads like the platform keeps an INR float. But the sell-side flow has the merchant paying the customer directly by UPI, bank-to-bank, with the platform only verifying a UTR.",
      o: [
        "A — Never. INR moves merchant↔customer bank-to-bank by UPI. The platform only records the UTR as proof and moves USDT. Merchant 'INR balance' is a declared/monitored figure used for eligibility, not custodied money.",
        "B — Platform mirrors an INR ledger internally for eligibility and reporting, still never touching real INR.",
        "C — Platform holds a real INR float through a PSP / payment aggregator and settles from it."
      ],
      r: 0,
      why: "A keeps you out of payment-aggregator territory. The moment the platform holds customer INR you need an RBI PA/PPI licence or a sponsor bank, and the build becomes a regulated-entity project rather than a software project. A is also what the SOW's own settlement flow actually describes. B is a reporting layer on top of A and is fine; C is a different company."
    },
    {
      id: "q3",
      t: "Which chains and assets does v1 support?",
      ctx: "You named USDT on BEP-20. The SOW mentions USDT generally. The existing Prisma schema already has a BlockchainNetwork table, so multi-chain is cheap to model and expensive to operate (separate node access, separate confirmation rules, separate withdrawal signing, separate reorg handling).",
      o: [
        "A — USDT on BEP-20 (BSC) only.",
        "B — USDT on BEP-20 and TRC20 (Tron).",
        "C — Multi-asset: USDT plus BTC/ETH."
      ],
      r: 0,
      why: "A. One chain, one asset, one set of confirmation and gas rules. Model the network as a row from day one (the schema already does) so TRC20 is a config addition later, but do not operate two chains before the first one is proven. TRC20 matters commercially in India, so expect it in phase 2 — not phase 1."
    },
    {
      id: "q4",
      t: "What is the crypto custody model?",
      ctx: "Everything else follows from this: key storage, withdrawal signing, deposit sweeping, insurance, and what happens if the server is compromised.",
      o: [
        "A — Fully custodial, self-managed: platform HD wallet, one derived deposit address per user, internal ledger is the source of truth, deposits swept to a hot/cold split, withdrawals signed server-side behind an isolated signer interface.",
        "B — Custodial via a third-party wallet provider (Fireblocks / BitGo / Cobo / Circle).",
        "C — Non-custodial: users hold their own keys, platform only orchestrates."
      ],
      r: 0,
      why: "A for the build, with the signer behind a narrow interface so B can replace it without touching the ledger. C is incompatible with escrow — you cannot lock funds you do not control. B is the right end state for real money at volume but costs money and onboarding time you do not need while proving the product."
    },
    {
      id: "q5",
      t: "Does v1 talk to a real blockchain, or stay on mocks?",
      ctx: "IDEA.md mandates 'mock everything, connect real providers later'. That path has already run once in this repo and produced a UI with an in-memory store that resets on restart. Real chain behaviour (confirmations, reorgs, gas, stuck transactions, dust, failed sends) is precisely what mocks never teach you.",
      o: [
        "A — Real BEP-20 from day one, on BSC testnet, with mainnet behind a config flag. Real provider code, zero money at risk.",
        "B — Mock provider only; real chain integration as a later phase (the current IDEA.md plan).",
        "C — BSC mainnet from day one with small amounts."
      ],
      r: 0,
      why: "A. Testnet gives you genuine confirmations, genuine reorg handling and genuine failure modes at zero financial risk, and the provider interface stays identical when you flip to mainnet. Mocks defer every hard problem to the moment real money arrives, which is the worst possible time to meet them."
    },
    {
      id: "q6",
      t: "Which client surfaces ship in v1?",
      ctx: "SOW V2.0 lists Flutter iOS + Android AND a Next.js web app. The existing repo is a single Vite React web app with a mobile-simulator layout. A camera QR scanner works in mobile browsers, so native apps are not required for the UPI flow.",
      o: [
        "A — Responsive web only: one React app serving customer, merchant and admin behind role routing.",
        "B — Responsive web, installable as a PWA (adds home-screen install and push, no app stores).",
        "C — Web plus native Flutter apps for iOS and Android."
      ],
      r: 1,
      why: "B. It is A plus a manifest and a service worker — days, not months — and it gets you an icon on the home screen and push notifications, which is most of what people actually want from 'an app'. C doubles the surface area, adds app-store review (which is hostile to crypto-to-fiat apps) and should wait until the web product has users."
    },
    {
      id: "q7",
      t: "What identity verification does v1 build?",
      ctx: "SOW FR1.8 defines three tiers (phone / social-linked / KYC) with configurable limits, and FR3.9 the admin limit configuration. Both were on the IDEA.md removal list. Separately: in India, VDA service providers must register with FIU-IND and run KYC/AML — so this answer is about what you build now, not what you can legally launch with.",
      o: [
        "A — Phone OTP only, flat per-user limits, no tiers and no KYC vendor. Build the limit engine so tiers slot in later.",
        "B — The SOW's three tiers including social account linking.",
        "C — Full KYC (PAN / Aadhaar / liveness) through a vendor from day one."
      ],
      r: 0,
      why: "A to build. Social linking (tier 2) is security theatre — a linked Twitter account proves nothing about identity — so that tier should probably never exist. Flag clearly: before real money moves on mainnet you will need C plus FIU-IND registration, so treat KYC as a launch gate, not a feature you can skip. Building the limit engine now makes adding it a configuration change rather than a migration."
    },
    {
      id: "q8",
      t: "What happens to the existing code?",
      ctx: "web/ is ~21,900 LOC of React covering far more than your scope (Launchpad, Copy Trade, Earn, Virtual Card, Leaderboard, Rewards, Referral, Cardless Cash, markets tables). api/ is ~2,500 LOC backed by an in-memory store that resets on restart. The Prisma schema is 536 lines, structurally sound, and completely unused. The repo also carries four different product names.",
      o: [
        "A — Keep the repo and the design system. Delete every out-of-scope screen. Rebuild the backend properly on PostgreSQL using the existing Prisma schema as the starting point. Pick one brand name.",
        "B — Keep both web and api as they are and extend them.",
        "C — Start a fresh repo; salvage only visual components by copy-paste."
      ],
      r: 0,
      why: "A. The UI work and the Prisma schema are real assets worth keeping. The in-memory store is not an asset — it is a placeholder that actively prevents the atomic, row-locked, double-entry behaviour the whole product depends on, and every hour spent extending it is wasted. Deleting the out-of-scope screens is a one-day job that removes months of implied obligation."
    },
    {
      id: "q9",
      t: "Do we build the full commercial engine (3% / 3.75% / 0.25% weekly bonus pool) in v1?",
      ctx: "SOW V2.0 section 5 specifies: sell-side 3% platform cut in USDT; buy-side 3.75% direct merchant reward plus 0.25% accrued to a conditional weekly target bonus pool that reverts to platform revenue if the merchant misses target. Open register D-01 and D-02 leave the calculation basis and the weekly target criteria undecided. The bonus pool is a whole subsystem: accrual ledger bucket, weekly cutoff job, clawback on reversal, anti-self-trade detection.",
      o: [
        "A — Build a configurable fee engine (rates, basis, versioned rules) and the 3% / 3.75% postings. Defer the 0.25% weekly bonus pool, its cutoff job and clawback logic to phase 2.",
        "B — Build the whole engine including the weekly bonus pool now, exactly as specified.",
        "C — Hardcode a single flat fee for v1 and make it configurable later."
      ],
      r: 0,
      why: "A. The fee engine must be configurable and versioned from day one because historical orders have to keep their original rates forever. But the weekly bonus pool depends on D-01 and D-02, which are still undecided commercial questions — building it now means building it twice. C is wrong: retrofitting configurability into ledger postings is a migration you do not want."
    }
  ]
});

answer("scope-r1", {
  q1: [0, ""],
  q2: [0, ""],
  q3: [0, ""],
  q4: [0, ""],
  q5: [0, ""],
  q6: [1, "Right now this will be only Web Application. No contract for App for android and ios."],
  q7: [0, "User can onboard via oauth, email & phone but verification only be phone otp."],
  q8: [0, "Re-evaluate the tech stack on both sides — what we use now vs what could be used. Also cut a branch off main, then make the changes there."],
  q9: [0, ""]
});

round({
  id: "scope-r2",
  title: "Round 2 — The P2P engine, the INR problem, and the stack",
  settled: false,
  qs: [
    {
      id: "q10",
      t: "What shape is the P2P marketplace — an ad board, or a quote-and-broadcast engine?",
      ctx: "These are two different products that both get called 'P2P'. (a) Ad/orderbook marketplace, Binance-P2P style: merchants publish ads with their own rate, limits and payment methods; the customer browses, picks a merchant, and opens a trade. (b) Quote-and-broadcast, which is what SOW V2.0 section 6.2 actually specifies: the platform issues a quote at a platform-set rate, broadcasts the order to every eligible merchant at once, and the first merchant to tap Accept wins it atomically via SELECT ... FOR UPDATE. The customer never chooses, never sees a merchant list, and never negotiates.",
      o: [
        "B — Quote-and-broadcast, first-accept-wins. Platform sets the rate. Customer sees a price and a countdown, not a merchant list. (SOW V2.0 spec.)",
        "A — Ad marketplace. Merchants post their own rates and limits; customer picks who to trade with.",
        "Hybrid — Broadcast by default, with an optional 'choose your merchant' view later."
      ],
      r: 0,
      why: "B. It is what the SOW specifies, it is far simpler to build correctly, and it is the only one of the two that gives you a payments product rather than an exchange. An ad board means merchant-set pricing, ad management, rate competition, merchant reputation browsing and per-merchant limits — a much larger build — and it makes the UPI-QR-pay phase 2 flow impossible, because a person scanning a shop's QR will not stop to browse merchants. The cost of B is that you own the price, and therefore you own the spread risk."
    },
    {
      id: "q11",
      t: "If the platform never touches INR, how do we know a merchant can actually pay the INR?",
      ctx: "This is the hole that Round 1 q2 opened, and SOW V2.0 does not close it. Section 6.1 CASE B gates sell-side eligibility on Merchant_Available_INR >= Payout × (1 + buffer). But if the platform never custodies INR, that figure is self-declared and unenforceable. Concretely: a merchant accepts a 100 USDT sell order, the customer's 100 USDT sits locked, the merchant never sends the ₹9,700, and the platform has nothing to seize. The customer is stuck until timeout; the merchant pays no price for griefing.",
      o: [
        "A — USDT collateral. On sell-side accept, lock USDT from the merchant's own platform balance equal to the INR obligation at the quoted rate. If they fail to pay within the window, that collateral settles the customer and the merchant eats the loss. The merchant's USDT bond IS the INR guarantee.",
        "B — Self-declared INR balance plus reputation: track completion rate, auto-pause merchants who miss, no money at stake.",
        "C — Merchant posts a fixed upfront security deposit in USDT that caps their concurrent order exposure."
      ],
      r: 0,
      why: "A. It is the only option where the guarantee is enforceable by code rather than by trust, and it needs nothing the platform does not already control. It also replaces the SOW's unenforceable INR eligibility check with a USDT one, which the platform can actually verify. C is a weaker version of A (a cap rather than per-order cover). B puts the entire sell-side risk on the customer. Note the consequence: merchants must hold roughly 2× working capital — USDT to earn with and USDT bonded against INR obligations — so model this in the merchant economics before you promise anyone 3.75%."
    },
    {
      id: "q12",
      t: "Who is authoritative that the INR actually arrived?",
      ctx: "With no PSP and no payment callback (Round 1 q2 = A), nothing automated can observe the INR leg. SOW V2.0 says 'System verifies payment callback/UTR or merchant confirms receipt' and that 'Customer screenshot alone is never sufficient proof' — but with no callback, only humans remain. Sell-side: merchant pays customer. Buy-side: customer pays merchant.",
      o: [
        "A — Whoever RECEIVES the INR confirms it. Sell-side the customer confirms receipt and escrow releases; buy-side the merchant confirms receipt and escrow releases. The payer uploads a UTR as evidence. If the receiver does not confirm within the window, the UTR goes to admin dispute review.",
        "B — The payer's UTR submission alone releases escrow, with a challenge window afterwards.",
        "C — Admin reviews and releases every single order manually."
      ],
      r: 0,
      why: "A. The party receiving money is the only one who can actually see their own bank account, so they are the only honest oracle available. It also puts the incentive in the right place on both sides: the receiver wants to confirm (sell-side customer wants their USDT released to the merchant so the trade closes; buy-side merchant wants to close out). B lets a payer release escrow with a fabricated UTR. C does not scale past a handful of orders a day. Build the dispute queue as a first-class feature, not an afterthought — with manual verification it is a core operational surface, not an edge case."
    },
    {
      id: "q13",
      t: "Where does the USDT/INR rate come from, and who owns the spread?",
      ctx: "SOW V2.0's worked example prices sell at ₹97 and buy at ₹104 — a ₹7 spread, roughly 7%. Under q10=B the platform sets the price and therefore carries the risk of setting it wrong. There is no clean global oracle for USDT/INR: it is a local premium market, so the number has to come from Indian venues or from a human.",
      o: [
        "A — Pluggable rate provider behind an interface. Start with an Indian exchange ticker as the reference feed, apply an admin-configured markup per side, and let the admin override with a manual rate bounded by a maximum deviation from the feed. Store an immutable snapshot on every quote. Quote TTL 90s.",
        "B — Admin sets both rates manually; the feed is display-only.",
        "C — Take the rate straight from an external feed plus a fixed markup, no manual override."
      ],
      r: 0,
      why: "A. It covers both the normal case (feed plus markup) and the real case (the feed is stale, wrong, or the market gapped and a human must intervene), while the deviation bound stops a fat-fingered manual rate from draining the platform. Whatever you choose, two rules are absolute: every order stores the exact rate it was quoted at, forever; and no historical order is ever recomputed at the current rate. Decide the TTL deliberately — too long and merchants arbitrage you on a moving market, too short and customers watch quotes expire mid-payment."
    },
    {
      id: "q14",
      t: "Frontend stack: keep Vite + React, or move to Next.js as the SOW recommends?",
      ctx: "What exists: Vite 8 + React 19 + TypeScript + Tailwind 4 + react-router 7 + TanStack Query + react-hook-form/Zod, ~21,900 LOC. SOW V2.0 recommends Next.js. The product is now settled as web-only, PWA-installable, three role surfaces behind auth, needing a camera QR scanner in phase 2 and heavy dashboard tables.",
      o: [
        "A — Keep Vite + React SPA. Add vite-plugin-pwa for install and push. Prerender or statically host the marketing landing page separately.",
        "B — Migrate to Next.js App Router, as SOW V2.0 recommends.",
        "C — Move to TanStack Start or Remix for typed routing with SSR."
      ],
      r: 0,
      why: "A. This app is ~95% authenticated dashboard, where server rendering earns almost nothing — the data is per-user, private, and uncacheable. Next.js would buy you SEO for one marketing page, and cost you a migration of ~22,000 LOC of react-router code plus a new mental model for the team, none of which makes the ledger one line more correct. The SOW's Next.js line was written for a greenfield build that no longer describes this repo. Keep the stack, delete the out-of-scope screens, and spend the saved weeks on the backend."
    },
    {
      id: "q15",
      t: "Backend stack: keep NestJS + Prisma, or change the data layer?",
      ctx: "What exists: NestJS 11 + Prisma 6 + PostgreSQL + JWT + decimal.js, with a 536-line Prisma schema that is structurally sound and currently unused. The crux of this product is a single operation done perfectly: lock a row with SELECT ... FOR UPDATE, re-check liquidity inside the lock, and write a balanced double-entry journal — all in one transaction. Prisma has no first-class row-locking API; you reach that through $queryRaw inside an interactive transaction. Drizzle expresses .for('update') natively and is SQL-first.",
      o: [
        "A — Keep NestJS, replace Prisma with Drizzle. Translate the existing 536-line schema (mechanical). PostgreSQL + Redis/BullMQ for queues and broadcast.",
        "B — Keep NestJS + Prisma exactly as is; use $queryRaw for the locking paths.",
        "C — Keep NestJS + Prisma for ordinary CRUD, and write the ledger and matching engine in raw SQL."
      ],
      r: 0,
      why: "A, with B as a perfectly defensible alternative. NestJS is unquestionably right here — modular monolith, DI, guards for RBAC, and it matches both the SOW and the existing code. The argument against Prisma is narrow but lands exactly on this product's crux: the hardest and most important code paths are the ones where Prisma makes you drop to raw SQL anyway, so you end up maintaining two query styles. Drizzle keeps one. The schema translation is mechanical and the schema is small. If the team already knows Prisma well, B is fine — just never let a balance change happen outside an explicit FOR UPDATE transaction."
    },
    {
      id: "q16",
      t: "What is the product actually called, and what branch do we work on?",
      ctx: "Four names are live in the material: FundFusion (the directory), NEXORA PAY (PROJECT_STATE.md and the existing UI), PandaPay (SOW V2.0, the client-facing document), FASTXP2P (IDEA.md). The name goes in the schema, the JWT issuer, the email templates, the domain and every screen, so it is cheap now and expensive in three weeks.",
      o: [
        "A — PandaPay. It is the name on the current client-facing SOW V2.0, which supersedes everything else.",
        "B — NEXORA PAY, matching the UI and docs already built.",
        "C — FundFusion, matching the repository.",
        "D — A new name entirely."
      ],
      r: 0,
      why: "A, unless there is a commercial reason not to — V2.0 is the newest and most authoritative document and it is what any client or stakeholder has in hand. Whatever you pick, put the display name in config rather than hardcoding it across 22,000 lines, so a later rebrand is an environment change. For the branch: cut feat/v1-rebuild off main and keep main as the last known state of the prototype until v1 is working."
    },
    {
      id: "q17",
      t: "Who is building this, and against what deadline?",
      ctx: "SOW V2.0 budgets 45 days across 8 milestones, and SOW V1.0's resource list assumes backend developers, frontend developers, QA engineers and a DevOps engineer — a full agency team. The previous collaborator who wrote the existing UI is no longer on the project. This answer changes the plan more than any technical question in this round: a 45-day team plan and a solo-plus-AI plan are not the same project.",
      o: [
        "A — You plus me, no fixed external deadline. Sequence for correctness: ledger first, then P2P engine, then surfaces.",
        "B — You plus me, against the SOW's 45-day commitment to a client or investor.",
        "C — A team will be hired or is already engaged.",
        "D — You plus me now, with more people joining once the foundation is laid."
      ],
      r: 0,
      why: "A if it is true, because it is the only honest basis for a plan. If the real answer is B, say so now and we will cut scope rather than quality — the 45-day figure assumes four to six people in parallel, so a two-of-us version of that scope is not a schedule, it is a wish. Tell me which it is and the plan changes shape accordingly, but either way the ledger and the matching engine get built first and get built properly; everything else can be staged."
    }
  ]
});

answer("scope-r2", {
  q10: [0, ""],
  q11: [0, "How do Binance and other platforms handle this issue? — answered: Binance never touches fiat either and relies on structure (crypto escrowed first, fiat payer never pays out of locked funds) plus cancellation-rate bans, appeals, and a standing security deposit for merchant-tier accounts. Re-confirm in R3 q11b."],
  q12: [0, ""],
  q13: [0, "PENDING — explain with an example first, then answer. Re-asked as R3 q13b."],
  q14: [0, ""],
  q15: [0, ""],
  q16: [2, "Name not yet confirmed. Use what the UI says for now. Resolution: PLATFORM_NAME config key, default to the UI's current string; package/repo stays fundfusion."],
  q17: [0, ""]
});

round({
  id: "scope-r3",
  title: "Round 3 — Rate engine re-ask, money movement, and operational policy",
  settled: false,
  qs: [
    {
      id: "q13b",
      t: "RE-ASK with the worked example: where does the rate come from, and who owns the spread?",
      ctx: "Worked example at reference R = Rs 100.00, sell markup 3%, buy markup 4%, deviation bound 2%, TTL 90s. 10:00:00 customer requests a quote; system writes an immutable snapshot {reference 100.00, customer_rate 97.00, qty 100, fee 3%, expires 10:01:30}; customer sees 'You receive Rs 9,700.00, expires in 90s'; confirms at 10:00:20; 100 USDT moves to Locked. At 10:05 the market is Rs 103 and the order STILL settles at Rs 97 because the snapshot is law. TTL too long writes a free option for merchants (market drops to 95, everyone rushes to confirm their 97 quote, you get picked off only when it hurts). TTL too short kills conversion. The 2% deviation bound is what stops a bad feed tick of Rs 1,000 from promising Rs 97,000 on a 100 USDT sell order; it fails closed to 'pricing unavailable' instead, and it also bounds the admin's manual input so a typo of 1,080 for 108 is rejected.",
      o: [
        "A — Pluggable rate provider: exchange ticker as reference feed, admin markup per side, manual override bounded by max deviation, immutable snapshot per quote, TTL 90s. All values admin-configurable.",
        "B — Admin sets both rates manually; the feed is display-only and advisory.",
        "C — Pure feed plus fixed markup, no manual override, fail closed on a bad tick."
      ],
      r: 0,
      why: "A still. It is the only option that handles both the normal case and the three failure cases that actually occur: feed outage, bad tick, and a genuine market gap the feed has not caught up with. B makes a human the single point of failure on pricing, every hour of every day. C has no answer when the feed is correct but lagging a real move. Pick the TTL deliberately rather than inheriting 90s from me — it is the dial that trades conversion against adverse selection, and it is the one number merchants will try to exploit."
    },
    {
      id: "q11b",
      t: "RE-CONFIRM: USDT collateral, or Binance-style reputation only?",
      ctx: "Binance never touches fiat either. Their protection is structural, not collateral: the crypto is escrowed first, so the fiat payer is never paying out of someone else's locked funds. If the fiat buyer ghosts, the trade times out and the crypto returns to the seller — nothing was at risk. They police it with cancellation-rate metrics, temporary bans, an appeal desk working from bank statements, and a standing security deposit for merchant-tier accounts only. Mapped onto us: merchant ghosts, customer's USDT unlocks, customer loses only time. So option B genuinely loses no money. The case for A is that your customer is a payer rather than a trader (their quote dies and the rate may have moved), that phase-2 UPI QR pay puts someone at a shop counter where 'timeout, try again' is a product failure, and that broadcast-to-eligible means YOU chose the merchant rather than the customer choosing.",
      o: [
        "A — Keep USDT collateral per order (your Round 2 answer). Strongest guarantee, enforced in code.",
        "B — Binance model: no money at stake. Completion-rate metrics, auto-pause, bans, admin appeal desk.",
        "Hybrid — Collateral required only above an order-size threshold; reputation alone below it."
      ],
      r: 0,
      why: "A, and the capital objection I raised last round was overstated: per-order locking and a standing deposit are economically near-identical, since both only require covered >= open obligations and both recycle as orders complete. The real cost of A is not capital, it is merchant supply — a merchant can earn on Binance with zero bond and will ask why they should bond here. Be ready to answer that with rate, volume, or settlement speed. If merchant recruitment turns out to be the binding constraint, the Hybrid is the retreat position."
    },
    {
      id: "q18",
      t: "What can an account do before phone OTP verification?",
      ctx: "Round 1 q7 settled that onboarding accepts OAuth, email and phone, but verification is phone OTP only. That leaves the actual security question open: is phone the gate on money, or just one of three equal doors? Phone numbers cost money to acquire in bulk and can be rate-limited by number and by device; OAuth and email are free and infinitely farmable.",
      o: [
        "A — Phone OTP is the financial gate. Sign in by Google, email or phone, but no deposit address, no balance, no orders until a phone is verified. One verified phone equals exactly one account, enforced by unique constraint.",
        "B — Any verified method unlocks everything; phone is just one option.",
        "C — Phone-only onboarding. Drop OAuth and email sign-in entirely."
      ],
      r: 0,
      why: "A. It gives you the convenience of social sign-in while keeping the one identifier that actually costs an attacker something as the gate on anything financial. The unique-phone constraint is what stops one person farming a hundred accounts to self-trade, which matters the moment you add any volume-based incentive. For v1 use Google as the only OAuth provider — Apple sign-in is a requirement driven by iOS app review, and native apps are out of scope. Verified email should be allowed for recovery only after it is confirmed."
    },
    {
      id: "q19",
      t: "How many confirmations before a BEP-20 deposit is credited?",
      ctx: "BSC produces a block roughly every 3 seconds. Fewer confirmations means a faster, better deposit experience and more reorg exposure; more means the opposite. Binance itself uses 15 confirmations for BEP-20 deposits, about 45 seconds. Whatever you choose, a credited deposit that is later reorged out must be reversible by a compensating journal entry — the ledger can never simply delete the credit.",
      o: [
        "A — 15 confirmations (about 45s) for every deposit, with a live confirmation counter shown as Pending in the UI.",
        "B — Amount-tiered: 6 confirmations below a threshold for fast small deposits, 30 above it.",
        "C — 1 to 3 confirmations for a near-instant experience, accepting reorg risk."
      ],
      r: 0,
      why: "A. It matches the number the largest venue on this exact chain uses, 45 seconds is a perfectly acceptable wait when the UI counts up honestly, and one rule is far easier to reason about and to reconcile than a tiered one. B optimises the wrong thing: small deposits are exactly where a reorg loss is cheap to absorb and large ones are where the extra wait is least noticed anyway, so the tiering buys little. Build the reorg-reversal journal path in v1 even though you will almost never fire it — retrofitting it after the first incident means doing it under pressure."
    },
    {
      id: "q20",
      t: "Where do deposited funds actually sit, and who pays the gas to move them?",
      ctx: "A per-user deposit address is not a vault — it is an inbox. Funds must be swept somewhere. The gotcha specific to BEP-20: moving a USDT balance out of a deposit address requires BNB for gas IN that address, and a freshly derived deposit address has none. So every sweep is two transactions — fund the address with BNB, then sweep the USDT — and the BNB dust left behind is a real, recurring cost that must be budgeted and monitored.",
      o: [
        "A — Sweep to a hot wallet when a deposit address crosses a threshold. The hot wallet holds only a few days of expected withdrawals; the remainder goes to cold storage (hardware or multisig) topped up manually on a schedule. A funded gas wallet dispenses BNB per sweep, with a low-balance alert.",
        "B — Sweep everything into a single hot wallet. Simpler, and the whole float is online.",
        "C — Do not sweep. Leave funds in deposit addresses and pay withdrawals from a separately funded wallet."
      ],
      r: 0,
      why: "A. The hot/cold split is the single control that bounds what a server compromise can cost you, and it is much cheaper to build now than to introduce once real balances exist. B means one leaked key loses everything. C sounds simpler but is worse: your float is scattered across thousands of addresses, every one needs gas to ever be moved, and reconciliation becomes a nightmare. Decide the hot-wallet ceiling as a policy number up front, alert when it is breached, and treat the gas wallet as production infrastructure with its own monitoring — running it dry silently halts all sweeps."
    },
    {
      id: "q21",
      t: "Which withdrawals need a human to approve them?",
      ctx: "SOW FR3.6 puts every withdrawal in an admin approval queue. That is safe and it does not scale — it makes you slower than every competitor and it means withdrawals stop when nobody is awake. The opposite, automatic approval with no controls, is how hot wallets get emptied in one request after a session is stolen.",
      o: [
        "A — Auto-approve below a configurable amount with per-user daily and weekly velocity caps; queue anything above it, or anything tripping a risk rule, for manual review.",
        "B — Manual approval for every withdrawal, as SOW FR3.6 specifies.",
        "C — Fully automatic with velocity caps only."
      ],
      r: 0,
      why: "A. Pair it with the three controls that actually stop account-takeover losses, independent of the threshold: a withdrawal address allowlist, a cooldown of 24 hours before a newly added address can be used, and a fresh OTP on the withdrawal itself rather than relying on the session. Those three matter more than where you set the threshold, because they defeat the attack that the threshold alone does not — an attacker who is patient and withdraws just under the line."
    },
    {
      id: "q22",
      t: "What are the order timeout windows, and what happens when one expires?",
      ctx: "An order has four clocks after the quote TTL: how long it waits for any merchant to accept, how long the payer has to send the INR and submit a UTR, how long the receiver has to confirm the money arrived, and how long a dispute may sit before escalation. The dangerous one is the third. If receiver silence auto-releases escrow in the payer's favour, you have built a machine that can be farmed: submit a plausible UTR, never actually pay, wait out a silent receiver, collect.",
      o: [
        "A — Defaults: 120s to find a merchant, 15 min for the payer to pay and submit the UTR, 15 min for the receiver to confirm. On receiver timeout the order escalates to a DISPUTE for admin review — it never auto-releases. All four values admin-configurable.",
        "B — The same windows, but receiver timeout auto-releases to the payer with a post-release challenge window.",
        "C — Leave all windows undecided and configure them after watching real orders."
      ],
      r: 0,
      why: "A. The rule to hold onto is that a timeout may always return funds to where they started, and may never advance them to someone's benefit — escrow that pays out on silence will be farmed within weeks of launch. C is tempting but you cannot observe real orders without shipping numbers first, so ship these, instrument them, and tune. Expect the 15-minute payer window to be the one that needs widening: bank transfers and UPI limits do not always cooperate inside 15 minutes."
    },
    {
      id: "q23",
      t: "How do merchants learn about an order in time to race for it?",
      ctx: "Under first-accept-wins, the broadcast mechanism is not just plumbing — it decides who wins. If merchant A learns of an order 400ms before merchant B, A wins essentially every contested order, and B eventually stops showing up. Fairness of delivery is a product property here, not an implementation detail. Merchants will keep this screen open for hours at a time.",
      o: [
        "A — WebSocket gateway (NestJS supports this natively) fanned out over Redis pub/sub, with a single server-side publish instant for all eligible merchants. Customers poll or subscribe for their own order status.",
        "B — Server-Sent Events: simpler to operate, one-way, reconnects natively. Accept remains an ordinary POST.",
        "C — Short polling every 2 seconds for everyone."
      ],
      r: 0,
      why: "A, with B a genuinely reasonable lighter choice given the only client-to-server action is an ordinary POST to accept. Either way, publish to all eligible merchants from one place at one instant rather than looping per merchant, or you build in a systematic advantage for whoever sits earliest in the loop. C is defensible only to get moving: a 2-second poll makes the race almost random, which is arguably fairer but wastes the responsiveness merchants need. Whatever you pick, log the broadcast timestamp and each accept timestamp from day one — the first merchant complaint about fairness will be unanswerable without them."
    },
    {
      id: "q24",
      t: "How many admin roles exist in v1?",
      ctx: "SOW FR3.1 specifies a four-way split: Support, Operations, Finance, and Super-Admin, with mandatory MFA, reason codes on every privileged action and immutable audit logs. Building four roles now is premature when there may be two people. Building one is how a support account ends up able to release escrow, which is the most common insider-fraud path in platforms like this.",
      o: [
        "A — Two roles. SUPPORT: read everything, answer tickets, add dispute notes, and nothing that moves money. SUPER_ADMIN: everything, with MFA and a mandatory reason code. Split into the SOW's four later.",
        "B — One ADMIN role with full powers, MFA and complete audit logging.",
        "C — The full four-way split now, as specified."
      ],
      r: 0,
      why: "A. The cheap and essential separation is between people who look at things and people who move money; the further split between Operations and Finance only starts to matter when you have separate operations and finance people. Three rules apply regardless of the answer: MFA is mandatory on every admin account, every privileged action demands a typed reason code that is stored, and no admin may ever edit a balance directly — corrections happen only as a compensating double-entry journal with an author and a reason, exactly like every other ledger movement."
    }
  ]
});

answer("scope-r3", {
  q13b: [0, ""],
  q11b: [0, ""],
  q18: [0, ""],
  q19: [0, ""],
  q20: [0, ""],
  q21: [0, ""],
  q22: [0, ""],
  q23: [0, ""],
  q24: [0, "Super admin must control permissions at ROLE level AND at individual USER level, expressed as service/feature capabilities — e.g. block gift cards for one user, block self-withdrawal for another. Shapes R4 q25."]
});

round({
  id: "scope-r4",
  title: "Round 4 — Entitlements, disputes, and everything around the code",
  settled: false,
  qs: [
    {
      id: "q25",
      t: "How should per-user capability control actually work?",
      ctx: "From your q24 comment: the super admin must control permissions at role level AND at individual user level, expressed as services or features — block gift cards for one user, block self-withdrawal for another. That is an entitlement layer sitting on top of RBAC, and it is a genuinely useful risk tool: you can freeze one capability on one suspicious account without blocking the entire user and generating a support ticket.",
      o: [
        "A — Capability registry. Every feature declares named capabilities (DEPOSIT, WITHDRAW, P2P_BUY, P2P_SELL, and later GIFT_CARD, UTILITY). Roles grant sets of them. Per-user overrides can GRANT or DENY any single capability, and DENY always wins. Effective = (role grants + user grants) minus user denies. Every override carries an actor, a reason and an optional expiry.",
        "B — Role-level permissions only. Per-user control stays as today: block or unblock the whole account.",
        "C — A full policy engine (CASL or OPA) with attribute-based rules."
      ],
      r: 0,
      why: "A. It is exactly what you described, it is one table plus one guard, and new features extend it by registering a capability rather than by a migration — which is what makes gift cards and utilities drop in cleanly later even though they are out of v1. The optional expiry matters more than it looks: most denies are temporary risk holds, and without an expiry they silently become permanent and nobody remembers why. C is a real engine for a team that needs attribute rules; with two people it is a dependency and a mental model you will not use."
    },
    {
      id: "q26",
      t: "When a merchant defaults on the INR payment, what actually happens to their bond?",
      ctx: "This follows straight from q11b and the SOW does not address it. Walk the sell-side default: customer locked 100 USDT, merchant bonded the INR obligation, merchant never paid. Returning the customer's 100 USDT already makes the customer materially whole — so the bond is NOT restitution. What the bond really buys you is (1) a pot to resolve from when payment is disputed rather than simply absent, (2) protection for the MERCHANT when a customer receives the money and refuses to confirm, and (3) a penalty that makes defaulting cost something. Decide which of those you are buying.",
      o: [
        "A — Proportionate penalty. On verified default: customer's USDT returns in full, plus a configurable compensation (flat fee or small percentage) taken from the merchant's bond; the rest of the bond releases. Repeated defaults auto-pause the merchant.",
        "B — Bond always releases in full on cancellation. It proves capacity only; consequences are reputational (completion rate, auto-pause, ban).",
        "C — Full bond forfeited on default, split between the customer and the platform."
      ],
      r: 0,
      why: "A. C is disproportionate — a merchant whose bank had a genuine outage loses 100 USDT, word spreads, and merchant supply dries up, which is already your scarcest resource. B makes the bond theatre: if nothing is ever taken from it, it is just a liquidity check. A sizes the consequence to the harm and keeps the pot available for the cases where it does real work. Specify the admin dispute outcomes explicitly as a closed list — release to merchant, refund to customer, partial split, penalise bond — because an open-ended admin action on escrow is the exact power you separated out in q24."
    },
    {
      id: "q27",
      t: "Which notification channels exist in v1, and how does the OTP get delivered?",
      ctx: "Phone OTP is the financial gate (q18), so SMS is not optional — it is on the critical path to anyone holding a balance. In India, transactional SMS requires DLT registration with TRAI: sender IDs and templates must be pre-registered, which takes real calendar time and is a launch gate in the same way FIU-IND registration is. Providers that handle Indian DLT well (MSG91, Gupshup) differ from the usual global default (Twilio). Separately, native push is unavailable since apps are out of scope, but PWA web push is.",
      o: [
        "A — In-app notification centre as the durable record for everything, web push for order events, email for receipts and security alerts, SMS for OTP only (it is the expensive channel). All behind one provider interface; an India-capable SMS vendor chosen for DLT.",
        "B — In-app notification centre only for v1; add other channels later.",
        "C — Every event on every channel."
      ],
      r: 0,
      why: "A. The in-app centre must be the durable record regardless, because it is the only channel you control and can replay; the others are best-effort delivery on top of it. Keeping SMS to OTP alone keeps the bill predictable and keeps your DLT template set small, which matters because every template needs separate approval. Start the DLT registration early — it is paperwork with a waiting period, and discovering it the week you want to launch is a self-inflicted delay."
    },
    {
      id: "q28",
      t: "What environments exist, and where do they run?",
      ctx: "docker-compose.yml already provisions PostgreSQL 16 and Redis 7 locally, and .env.example already has access/refresh JWT settings — so local development is close to ready. What does not exist is anywhere to deploy. With two people and no external deadline, infrastructure sophistication is a cost, not a virtue.",
      o: [
        "A — Local Docker Compose for development, plus ONE always-on staging environment running against BSC testnet on a managed host (Railway, Render or Fly). Production is a later decision, made when there is something to launch.",
        "B — Local only until v1 works end to end, then decide everything about deployment.",
        "C — Infrastructure as code with Kubernetes from the start, so staging and production are identical."
      ],
      r: 0,
      why: "A. A permanently running staging environment earns its cost quickly here, because the things most likely to break are the things that only appear over time: deposit watchers missing blocks, sweep jobs running dry on gas, websocket reconnects, cron timing. None of those show up in a local session you start and stop. Choose managed PostgreSQL with point-in-time recovery over self-hosting the database — that single choice matters more for your risk profile than which platform runs the app container. C is a trap at this size."
    },
    {
      id: "q29",
      t: "How do we know the books are right, and that we could recover them?",
      ctx: "Two different guarantees that get conflated. Backup answers 'can we get the data back'. Reconciliation answers 'is the data correct right now'. For a custodial platform the second is the one that catches real incidents — a missed deposit credit, a double credit, an unauthorised withdrawal, a sweep that moved coins the ledger never recorded. The check that matters is whether the sum of all ledger balances equals the custody total actually observable on chain across hot, cold and unswept deposit addresses.",
      o: [
        "A — Managed PostgreSQL with point-in-time recovery, plus a scheduled restore drill. Plus an automated reconciliation job: every journal balances to zero, and total ledger USDT equals on-chain custody, alerting on any drift beyond a dust tolerance.",
        "B — Automated backups only; reconcile by hand when something looks wrong.",
        "C — Backups plus journal-balance checks, but no on-chain comparison."
      ],
      r: 0,
      why: "A. The internal balance check in C is nearly free and catches almost nothing — double-entry code that is written correctly balances by construction, so that assertion mostly proves your own arithmetic back to you. The on-chain comparison is the one that catches the incidents that actually cost money, because it is the only check whose two sides are produced by independent systems. Run it continuously and alert on drift. And do the restore drill: an untested backup is a belief, not a capability."
    },
    {
      id: "q30",
      t: "What gets instrumented, and what wakes someone up?",
      ctx: "Generic application monitoring (response times, CPU, error rates) is worth far less here than money-shaped monitoring. The questions that matter at 3am are: is escrow locked equal to the sum of open orders, is the gas wallet about to run dry and silently stop every sweep, is the deposit watcher still keeping up with the chain head, is the dispute queue growing faster than it is being worked.",
      o: [
        "A — Structured JSON logs carrying request id and idempotency key end to end, error tracking (Sentry or equivalent), and money metrics: orders by state, total escrow locked, broadcast-to-accept latency, deposit watcher lag behind chain head, hot wallet balance, gas wallet balance, dispute queue depth. Alerts on hot wallet ceiling, gas wallet floor, reconciliation drift, watcher lag, and stuck orders.",
        "B — Structured logs and error tracking only; add metrics when something hurts.",
        "C — A full APM and dashboard stack from day one."
      ],
      r: 0,
      why: "A. The specific alerts are the deliverable here, not the tooling — any competent stack can emit them. Gas wallet floor and deposit watcher lag deserve special attention because both fail silently: nothing errors, nothing 500s, deposits simply stop being credited and sweeps simply stop happening while every dashboard stays green. Carrying the idempotency key through the logs is what makes a duplicate-request investigation take minutes instead of an afternoon."
    },
    {
      id: "q31",
      t: "What does the test suite have to prove?",
      ctx: "SOW V2.0 section 11.2 names the acceptance tests: sell-side math exact to the paisa, buy-side math, the buffer eligibility rule, and crucially five merchants tapping Accept simultaneously where exactly one wins and four receive ORDER_ALREADY_ASSIGNED. That last one cannot be tested against a mocked database, because the behaviour under test IS PostgreSQL's row locking. Mocking the database in a ledger test proves only that your mock agrees with itself.",
      o: [
        "A — Four layers: unit tests on decimal money math; integration tests against a real PostgreSQL (testcontainers) for every ledger, escrow and settlement path; a concurrency test firing N simultaneous accepts asserting exactly one winner; and an invariant test asserting every journal sums to zero and no balance ever goes negative after arbitrary operation sequences. Thin end-to-end coverage of the happy path only.",
        "B — Unit tests plus manual QA against staging.",
        "C — A, plus a full Playwright end-to-end suite across all three surfaces."
      ],
      r: 0,
      why: "A. The invariant test is the highest-value item and the one most often skipped: generate random sequences of deposits, locks, releases, settlements and refunds, then assert the books still balance and nothing went negative. It finds the ordering bugs that example-based tests miss entirely, and it keeps finding them as the code changes. Rule with no exceptions: never mock PostgreSQL in a ledger or matching test. C is the right end state but broad UI automation before the surfaces have settled mostly generates maintenance."
    },
    {
      id: "q32",
      t: "What is the milestone sequence, and what does 'v1 done' mean?",
      ctx: "q17 settled the principle: ledger first, then the P2P engine, then surfaces. The proposed sequence is M0 repo hygiene (cut out-of-scope screens, translate the schema to Drizzle, platform name to config, CI); M1 ledger core; M2 auth, RBAC and capabilities; M3 wallet on BSC testnet (deposit watching, sweeps, withdrawals); M4 the P2P engine (quotes, broadcast, atomic accept, collateral, settlement); M5 disputes, admin and reconciliation; M6 surfaces and notifications; M7 hardening and a staging soak.",
      o: [
        "A — That sequence, with one adjustment: after M4, wire a deliberately thin customer and merchant path end to end before building out M6 properly, so the whole spine is proven on testnet before any surface is polished.",
        "B — That sequence exactly as listed, surfaces last.",
        "C — Vertical slices: take one flow at a time all the way through from database to screen."
      ],
      r: 0,
      why: "A. Pure back-to-front (B) risks discovering at M6 that the engine's shape is wrong for the screens, which is the expensive moment to learn it. Pure vertical slicing (C) is usually right, but not when the foundation is a ledger: every slice encodes assumptions about the ledger, so getting it wrong after three slices means rewriting three slices. A takes the useful half of each. Propose for 'v1 done': the SOW acceptance tests all pass on BSC testnet — sell-side and buy-side math exact, collateral eligibility enforced, five-way concurrency yielding exactly one winner, timeout escalating to dispute rather than releasing, a reorged deposit correctly reversed, and reconciliation clean for seven consecutive days on staging."
    }
  ]
});

answer("scope-r4", {
  q25: [0, ""], q26: [0, ""], q27: [0, ""], q28: [0, ""],
  q29: [0, ""], q30: [0, ""], q31: [0, ""], q32: [0, ""]
});

round({
  id: "scope-r5",
  title: "Round 5 — The buy-side revenue hole, money representation, and order denomination",
  settled: false,
  qs: [
    {
      id: "q33",
      t: "How does the platform earn anything on a buy-side order?",
      ctx: "Sell-side revenue is clean because the platform takes its cut from an asset it custodies: 100 USDT escrowed, 97 to the merchant, 3 to platform revenue. Buy-side under q2=A has no such asset. Customer wants 97 USDT, pays Rs 10,088 directly into the merchant's bank, merchant releases 97 USDT. The only USDT that moved was the 97 going from merchant to customer, and the platform touched none of it. The merchant's '3.75% direct reward' in SOW section 5.2 is not a payment the platform makes — it is the merchant's own spread, realised in INR, outside the system entirely. This is also why open-register item D-01 cannot settle on a calculation basis: you cannot compute a platform cut from money the platform never sees.",
      o: [
        "A — Charge the merchant a platform fee in USDT, debited from their available balance on completion. The merchant locks 97 USDT for the customer and is separately debited the fee. Revenue arrives in the asset you custody, enforceable in the same journal as the settlement.",
        "B — Charge the customer in USDT: quote them for 100 USDT worth of INR but deliver 97, keeping 3 as the fee. Symmetrical with sell-side from the ledger's point of view.",
        "C — Buy-side earns the platform nothing by design. It exists to acquire users and fund wallets; sell-side carries the business."
      ],
      r: 0,
      why: "A. It puts revenue in the asset you actually control, it posts inside the same atomic settlement journal as everything else, and it leaves the customer's quote honest — they asked for 97 USDT and they receive exactly 97 USDT. B is cleanest on paper but the customer experience is poor: they pay for 100 and receive 97, which reads as a hidden deduction no matter how you label it, and it is the single most common complaint on platforms that do it. C is a legitimate strategic choice if buy-side is purely an acquisition funnel, but decide it deliberately rather than discovering after launch that half your volume is unmonetised. Whichever you pick, the merchant fee must be configurable and versioned like every other rate, and the merchant must see it in the order preview before they accept."
    },
    {
      id: "q34",
      t: "How is money stored, and where does rounding residue go?",
      ctx: "USDT carries 18 decimals on BEP-20; INR carries 2. Every conversion between them creates a remainder that has to land somewhere, and if it lands nowhere your journals stop summing to zero — which breaks the one invariant the entire system rests on. The decision has three parts: storage type, rounding direction, and what happens to the residue.",
      o: [
        "A — PostgreSQL NUMERIC(38,18) for USDT and NUMERIC(20,2) for INR, carried as strings in JS and computed with a decimal library, never a float or a JS number. Round only at user-facing boundaries, conservatively: customer payouts round DOWN, customer payables round UP. Every rounding residue posts to a dedicated ROUNDING ledger account so journals still balance to the last unit.",
        "B — Same storage, but round half-up everywhere and let the residue fall into platform revenue.",
        "C — Store integer minor units (USDT in wei-equivalent, INR in paise) and avoid decimals entirely."
      ],
      r: 0,
      why: "A. The part people skip is the ROUNDING account, and it is the part that matters: a residue that is silently dropped means a journal that does not balance, which means your reconciliation alert fires forever and you learn to ignore it — and an ignored reconciliation alert is how real losses hide. Conservative rounding means the platform is never short by construction, and the amounts involved are sub-paisa so no customer notices. C is genuinely defensible and some exchanges do exactly that, but it makes every query and every log line unreadable by a human, which matters when you are debugging a disputed settlement at speed."
    },
    {
      id: "q35",
      t: "Does the customer enter a USDT quantity, or an INR amount?",
      ctx: "These produce different quote models. 'I want 100 USDT' solves for INR payable. 'I want to spend Rs 10,000' solves for USDT quantity, which will not be a round number. Phase-2 UPI QR pay is INR-denominated by its nature — the shop wants Rs 500, not 5.1546 USDT — so that direction has to exist eventually regardless.",
      o: [
        "A — Both. The customer enters either side and the system solves for the other, snapshotting both figures plus a flag recording which one was authoritative.",
        "B — USDT-denominated only in v1; add INR denomination with the UPI QR flow in phase 2.",
        "C — INR-denominated only, since that is what the phase-2 flow needs."
      ],
      r: 0,
      why: "A, and it is nearly free now: one extra field and the inverse calculation. Retrofitting it later means changing the quote model, which by then is referenced by orders, receipts, disputes and reports. The authoritative flag is what makes rounding defensible afterwards — the side the customer typed is exact, the derived side absorbs the remainder, and a dispute six months later can show exactly which was which rather than arguing about a paisa."
    },
    {
      id: "q36",
      t: "What stops a customer tying up merchant liquidity by abandoning buy orders?",
      ctx: "The mirror of q11, pointing the other way. A customer opens a buy order, the merchant's USDT locks, the customer never pays, and at timeout the USDT unlocks. The merchant lost time and had capital frozen for 15 minutes for nothing. Repeated across many fake orders this is a cheap denial-of-service against your merchant supply — and merchant supply is already the scarcest resource in this design.",
      o: [
        "A — Limits, not money: cap concurrent open buy orders per customer at one or two, track an abandonment rate, and apply an escalating cooldown after repeated abandonments. A merchant whose customer abandons takes no reputational hit and no penalty.",
        "B — Require the customer to hold a balance as a bond before opening a buy order.",
        "C — Nothing specific; the timeout already returns the merchant's funds."
      ],
      r: 0,
      why: "A. B is structurally impossible for the user you most want: a first-time customer buying USDT has, by definition, an empty wallet, so a bond requirement means nobody can ever make a first purchase. The concurrent-order cap is what actually blunts the attack, since abandonment only ties up liquidity while an order is open. The second half matters as much as the first — make sure a merchant is never penalised for a customer's abandonment, or merchants will learn to avoid accepting buy-side orders at all and you will have broken the side you were protecting."
    }
  ]
});

answer("scope-r5", { q33: [0, ""], q34: [0, ""], q35: [0, ""], q36: [0, ""] });

// Correction appended 2026-11-16 after researching current BSC parameters.
// q19 premise was stale. BSC block time is ~0.45s (Fermi, Jan 2026), not ~3s,
// and BEP-126 provides deterministic fast finality (~1.1s) exposed via
// eth_getBlockByNumber("finalized"). BNB Chain directs exchanges and custodians
// to credit on that signal. Counting 15 confirmations is therefore both slower
// and a weaker guarantee than reading the finalized head.
// DECISION CHANGED: credit deposits on finality (~1-2s), not on a confirmation
// count. Watcher reads logs at the finalized head, never at the chain head —
// which also avoids a known BSC failure mode where eth_getLogs returns
// incomplete results at the head and ERC-20 deposits are silently missed.
// Reorg-reversal journal path is still built in v1.

round({
  id: "engine-r1",
  title: "M4 — two clocks the spec runs over one order",
  settled: false,
  qs: [
    {
      id: "q37",
      t: "When a merchant accepts, which clock decides whether the order is still live — the quote's 90s TTL or the order's 120s search window?",
      ctx: "PRD §6.9 gives a quote a 90s TTL and the merchant search 120s. §6.7 step 2 says accept must assert the order is AWAITING_MERCHANT 'and its quote has not expired'. Those two cannot both hold: between 90s and 120s every broadcast order has an expired quote, so a literal reading of §6.7 kills every order at 90s and makes the 120s window unreachable. M4 was built on the second reading — accept checks the search window, not the TTL — and a code review flagged that §6.7's sentence is therefore unimplemented. The settings registry now refuses a window shorter than the TTL, so the gap cannot be configured open, but the question of which clock binds is yours.",
      o: [
        "A — The search window binds at accept. The TTL bounds the customer's decision to confirm; once funds are escrowed the order's own clock takes over. This is what is built.",
        "B — The TTL binds at accept too, and the default TTL must therefore be raised above the search window (e.g. TTL 180s, window 120s).",
        "C — Collapse them: one clock from broadcast, and drop the separate quote TTL."
      ],
      r: 0,
      why: "A, because the risk each clock guards is different. The TTL exists so a customer cannot sit on a favourable price and confirm only when the market moves their way — that risk ends the moment they confirm and their USDT is locked. The merchant's version of that risk is bounded by the search window. B works but makes the TTL do two jobs with one number, and every future change to one has to be checked against the other. C is tempting and wrong: before confirmation nothing is escrowed, so the two periods have genuinely different stakes."
    }
  ]
});

round({
  id: "identity-r1",
  title: "Email-only identity — what replaces the one-phone-one-account rule?",
  settled: false,
  qs: [
    {
      id: "q38",
      t: "With phone verification gone, what stops one person running many accounts and trading with themselves?",
      ctx: "Identity moved to email on 2026-11-21, with an authenticator as the financial gate. That removes TRAI DLT registration from the critical path, which is a real win. But PRD §9.1's phone rule was not only an auth step: 'one verified phone equals exactly one account, enforced by a unique constraint — this is what stops one person farming accounts to self-trade.' An email is close to free to create and an authenticator is free to enrol, so neither carries that property. Self-dealing on the P2P engine is the one place this platform's incentives can be gamed: a person on both sides of an order moves their own money, collects whatever incentives exist, and generates volume that looks like traction. v1 has no incentive programme, which is why this is a question rather than an emergency.",
      o: [
        "A — KYC above a threshold. Below a small lifetime volume anyone may trade; above it, a KYC vendor verifies a real person. The vendor is needed for FIU-IND registration anyway (DEPENDENCIES §5.2.3), so this is work that was coming regardless.",
        "B — Manual review of merchants only. Customers stay cheap to create; merchants — the side that must bond USDT — are approved by a human. Self-dealing needs both sides, so gating one side breaks it.",
        "C — Accept it for v1. No incentive programme exists, so self-trading costs the farmer fees and gains them nothing. Revisit before any referral or rewards scheme.",
        "D — Device binding. Tie accounts to a device fingerprint and refuse several accounts per device."
      ],
      r: 1,
      why: "B, with C as the honest fallback. Self-dealing needs a merchant on one side, and merchants already post a bond and already need approval — so the control costs nothing new and breaks the loop at its narrowest point. A is the strongest answer and you will need the vendor anyway, but it taxes every customer at exactly the moment you are trying to acquire them. D sounds cheap and is not: fingerprints are defeated by a second browser profile, and they misfire on shared and office machines, so you pay in support tickets for a control that stops nobody determined."
    }
  ]
});
