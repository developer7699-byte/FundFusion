# Dependencies — what I need, where to get it, what it costs

**Date:** 2026-11-16 · **Companion to:** `PRD.md`
**Prices and availability verified by web research on 2026-11-16.** Vendor terms
change; re-check before committing money.

Ordered by when it blocks work. Nothing here blocks M0–M2.

> **Never send me a private key, seed phrase, or production secret in chat.**
> Secrets go into the hosting platform's secret manager or a password manager. I
> work against testnet-only values. A secret pasted into a conversation should be
> treated as compromised and rotated.

---

## ⚠️ Read this first — two findings that change the plan

### 1. BscScan's free API no longer exists

The BscScan API was **deprecated in December 2025** and folded into Etherscan
API V2. Under V2 a single key covers 50+ chains via a `chainid` parameter — but
BNB Smart Chain mainnet (56) and testnet (97) are marked **paid tier only**,
except for source-code and ABI calls which stay free on every chain.

**Consequence:** the "free BscScan key" in the previous draft was wrong. We get
explorer-grade data from **NodeReal / BSCTrace (MegaNode)** instead, which BNB
Chain's own migration guide points to and which keeps a free tier. This is
convenient — the same vendor can supply both the RPC endpoint and the explorer
data, so it is one account rather than two.

### 2. FIU-IND registration is not only paperwork — it has a build dependency

The 2026 FIU-IND guidelines require, as part of registration, a **live demo of
your AML/CFT systems, including KYC, transaction monitoring, and blockchain
analysis**, plus a **cybersecurity audit certificate** and a **mandatory
in-person meeting**.

**Consequence:** you cannot register by filing forms. Working KYC, working
transaction monitoring, and a blockchain-analytics integration must exist and be
demonstrable *before* the meeting. That is engineering work sitting between v1
and mainnet, and it is not currently in the PRD's milestone list. Budget for it
as a phase of its own — see §5.2 for vendors and realistic cost.

---

## 0. Blocks nothing — I start now

M0 (repo hygiene), M1 (ledger core) and M2 (auth, roles, capabilities) need
nothing from you except availability to answer questions. Roughly the first
third of the build.

---

## 1. Blocks M2 — identity

### 1.1 Google OAuth client

| | |
|---|---|
| **Where** | <https://console.cloud.google.com/> → APIs & Services → Credentials → Create OAuth client ID (Web application) |
| **Cost** | Free |
| **Time** | ~15 minutes |
| **You need** | A Google account you control |
| **Give me** | Client ID, client secret. Add redirect URIs for `http://localhost:5173` and the staging domain later. |

### 1.2 SMS provider — for OTP

Verified pricing, November 2026:

| Provider | OTP rate | Notes |
|---|---|---|
| **MSG91** *(recommended)* | ~₹0.15 base, ~₹0.13 at high volume | Cheaper at starting volumes. <https://msg91.com> |
| Gupshup | ~₹0.17 base | Stronger on WhatsApp than pure OTP; enterprise pricing above 1 lakh/month. <https://gupshup.io> |

Both handle DLT. **MSG91 is the better fit** — you are sending OTP, not
conversational messaging, and it is cheaper at the volumes you will start at.

Signup is same-day, but the SMS will not actually deliver until DLT registration
completes — see §5.2.1. For development, OTP prints to the API log via
`OTP_STATIC_DEV`, already in `.env.example`.

### 1.3 Transactional email

| Provider | Free tier | Paid | Verdict |
|---|---|---|---|
| **Resend** *(recommended)* | 3,000/mo, 100/day, 3 domains, no expiry | $20/mo for 50,000 | Best default. <https://resend.com> |
| Postmark | 100/mo, genuine free tier not a trial | $15/mo for 10,000 | Pick if deliverability speed is the whole job |
| AWS SES | No dedicated free quota any more; new accounts get $200 credit for 6 months | $0.10 per 1,000 | Only worth it at high volume with engineers |

**You also need:** a domain, and DNS access to add SPF and DKIM records.

---

## 2. Blocks M3 — the chain. **First hard blocker.**

### 2.1 BSC RPC endpoint — needs HTTPS *and* WebSocket

The deposit watcher needs a WSS subscription. Do not use the public testnet RPC:
it is rate-limited and drops requests, and a watcher that misses blocks is the
one failure that silently loses money.

| Provider | Free tier | Testnet + WSS | Link |
|---|---|---|---|
| **NodeReal** *(recommended)* | Yes | Yes — HTTP and WSS, mainnet and testnet | <https://nodereal.io/api-marketplace/bsc-rpc> |
| **Chainstack** | Yes, mainnet + testnet | Yes | <https://chainstack.com/build-better-with-bnb-smart-chain/> |
| Ankr | Freemium, 200M credits/mo — now requires a free API key | Yes | <https://ankr.com> |
| QuickNode | Free tier lasts **one month only** | Yes | <https://quicknode.com> |

**Recommendation: NodeReal.** It covers the RPC, the WSS subscription, and —
per §0 above — the explorer data that BscScan no longer gives away. One account,
one key, free tier.

### 2.2 Explorer / transaction data

Use **BSCTrace via NodeReal MegaNode** (free tier retained). BNB Chain's own
migration guide directs former BscScan API users here.
<https://www.bnbchain.org/en/blog/migration-guide-bscscan-api-to-bsctrace-api-via-meganode>

Skip Etherscan V2 unless you later need something only it provides, at which
point BSC is a paid plan.

### 2.3 Testnet BNB (gas)

| Faucet | Amount | Requirement |
|---|---|---|
| **Official BNB Chain** <https://www.bnbchain.org/en/testnet-faucet> | 0.3 tBNB / 24h | **Requires ~0.002 BNB on BSC mainnet** — about ₹150 worth. Buy it once. |
| QuickNode <https://faucet.quicknode.com/binance-smart-chain> | — | Once per 12h |
| Chainstack | — | Bundled with the free account |
| GHOST | — | No requirement, no KYC |

The mainnet-balance requirement on the official faucet is the one that catches
people out. Sort it early rather than on the day.

### 2.4 Test USDT

**There is no official Tether token on BSC testnet.** I will deploy a mock
BEP-20 contract with 18 decimals that behaves like USDT. No action from you —
flagged so nobody goes looking for real USDT there.

### 2.5 Custody key policy — **your decision, not mine**

The most important item on this page, and a policy decision before a technical
one.

- **Who generates the HD master seed, and who holds it?** My recommendation: you
  generate it, you hold it, I never see it. I build against a throwaway testnet
  seed for all of v1.
- **Where does cold storage live** — hardware wallet, or multisig with named
  signers?
- **Who has access, and what happens if that person is unavailable?** Write it
  down before mainnet, not after.

I will advise on all three. I should not be a key holder.

---

## 3. Blocks M4 — pricing and commercial parameters

### 3.1 Rate feed — USDT/INR

| Source | Endpoint | Notes |
|---|---|---|
| **CoinDCX** *(recommended primary)* | `https://api.coindcx.com/exchange/ticker` | Public, no key. FIU-registered Indian venue. |
| WazirX | `https://api.wazirx.com/api/v2/tickers` | Public. **Caution:** WazirX suffered a major 2024 security incident and subsequent restructuring — I would not make it the primary price source. |

**Recommendation:** CoinDCX as primary, a second source as a sanity bound. Two
independent sources is also what makes the §7 deviation check meaningful — a bad
tick on one venue is visible when the other disagrees.

### 3.2 The five numbers I do not have

PRD defaults cover markup, buffer and timeouts. These five are blank and are
**business decisions**:

| Parameter | Status |
|---|---|
| Platform buy-side fee (charged to merchant, in USDT) | **not set** |
| Withdrawal auto-approve threshold | **not set** |
| Per-user daily / weekly withdrawal caps | **not set** |
| Merchant default penalty | **not set** |
| Min / max order size | **not set** |

Needed before M4 ends.

---

## 4. Blocks M4.5 — people, not software

| # | Item | Why |
|---|---|---|
| 4.1 | **Two or three pilot merchants** | The spine cannot be validated with one party playing both sides. Real merchants surface partial payments, slow confirmations, disputes. |
| 4.2 | **An answer to "why bond here when Binance needs no bond?"** | PRD §6.5. Merchant supply is the scarcest resource in this design. |
| 4.3 | **Someone to work the dispute queue** | With manual settlement confirmation, disputes are routine operations. |

---

## 5. Staging, then real money

### 5.1 Infrastructure — needed by M6/M7

| Item | Recommendation | Cost (verified Nov 2026) |
|---|---|---|
| **Managed Postgres with PITR** | **Neon** — <https://neon.com> | Free plan includes **6h PITR**; Launch plan up to 7 days at $0.20/GB-month |
| | *Not Supabase* | PITR requires Pro **plus** a $100/mo add-on per 7-day window |
| **App hosting** | **Railway** — <https://railway.app> | Cheapest for low traffic: web + db + worker ≈ $10–15/mo. Hobby $5 |
| | Render | $21–34/mo for the same, flat-rate and predictable |
| | Fly.io | ~$4–6 hobby, cheapest at real scale |
| **Redis** | Upstash, or Railway's own | Free tier sufficient at this stage |
| **Error tracking** | Sentry | Free tier sufficient |
| **Domain** | Any registrar | ~₹1,000/yr |

**Neon is the clear pick** purely on PITR: it is the one feature the PRD calls
non-negotiable, Neon includes a basic form of it free, and Supabase charges
$100/mo on top of Pro for it.

### 5.2 Long-lead compliance — start now

#### 5.2.1 TRAI DLT registration — **blocks OTP, therefore blocks every real user**

| | |
|---|---|
| **What** | Three steps in strict order: **Principal Entity → Header (sender ID) → Template** |
| **Where** | Through a telecom operator's DLT portal (Jio, Airtel, Vi, BSNL). Your SMS provider will usually walk you through it. |
| **Cost** | Principal Entity ≈ **₹5,900** (₹5,000 + 18% GST). Headers and templates typically free. |
| **Timeline** | Entity 1–3 business days · header 1–2 days · templates 2–7 days · **full process ~7–10 business days** with correct documents |
| **You need** | GST, PAN, incorporation documents — i.e. a **registered entity first** |

**Critical detail:** OTP needs a **transactional alpha header**, or codes will
not reach DND-registered numbers — which is the majority of Indian mobile
numbers. Getting this wrong means OTP that works in testing and fails for most
real users.

#### 5.2.2 FIU-IND registration — blocks mainnet

| | |
|---|---|
| **Where** | FINgate portal, <https://fiuindia.gov.in/> |
| **Stages** | 1) Online registration → temporary reference ID · 2) **Mandatory in-person meeting with FIU-IND** · 3) Final Reporting Entity ID (RE-ID) |
| **Documents** | Incorporation documents, financials, GST and IT returns, ownership details, agreements, **cybersecurity audit certificate**, AML/CFT compliance proof |
| **Also required** | A **live demo** of AML/CFT systems — KYC, transaction monitoring, and blockchain analysis |

Every VDA service provider operating in India must register before commencing or
continuing operations, regardless of physical presence. Operating unregistered
is a PMLA violation.

**This is the finding from §0.2.** The live demo means §5.2.3 and §5.2.4 are
engineering prerequisites, not parallel paperwork.

#### 5.2.3 KYC vendor

Per-KYC pricing is generally not published; most require a sales call. Published
reference points:

| Vendor | Indicative pricing | Notes |
|---|---|---|
| **HyperVerge** | Sales call | iBeta-certified passive liveness, ISO 30107. >99.5% accuracy on Indian faces. <https://hyperverge.co> |
| **Signzy** | ~₹35–60 per full KYC | Deepest bank-grade RBI compliance. Aadhaar eKYC, Video KYC (V-CIP), face match. <https://signzy.com> |
| **IDfy** | Sales call | <https://idfy.com> |
| **Cashfree Secure ID** | Sales call | 20+ regional languages |
| Hypersign | ₹6 Aadhaar · ₹15 full journey with face match | Cheapest published |

Component rates where quoted: PAN ₹2–5, face match + liveness ₹3–10.

**Start with:** HyperVerge or Signzy. Both are credible to show FIU-IND.

#### 5.2.4 Blockchain analytics / transaction monitoring

Required for the FIU demo. Four products in this market: transaction monitoring,
wallet screening, investigations, counterparty due diligence.

| Vendor | Annual cost | Notes |
|---|---|---|
| **Merkle Science** *(realistic starting point)* | from ~**$10,000/yr** | APAC-based, accessible to first-time compliance stacks. <https://merklescience.com> |
| TRM Labs | $20,000–100,000+ | Volume-based. <https://trmlabs.com> |
| Chainalysis | €120,000–250,000+ | Most widely deployed among regulated US exchanges. Not realistic at your stage. |

**Budget ~$10k/year minimum** for this line. It is the cost of being allowed to
operate on mainnet in India, and it does not appear anywhere in SOW V2.0.

#### 5.2.5 Legal review

The entire architecture rests on the platform never custodying rupees. **Get
that position confirmed by qualified counsel before building on it for six
months**, not after. Also needed: merchant agreement, customer terms.

### 5.3 Entity — prerequisite for everything in §5.2

| # | Item |
|---|---|
| 5.3.1 | Registered business entity with GST and PAN |
| 5.3.2 | Business bank account |
| 5.3.3 | Confirmed product name — currently a `PLATFORM_NAME` config key, but the domain and the DLT sender header both bake it in permanently |

---

## 6. Cost summary

**To reach v1 on testnet:**

| Item | Cost |
|---|---|
| NodeReal RPC + explorer | Free tier |
| Google OAuth | Free |
| Testnet BNB | ~₹150 of mainnet BNB, once |
| Resend email | Free tier |
| Neon Postgres | Free tier |
| Railway hosting | ~$5–15/mo |
| Sentry | Free tier |
| Domain | ~₹1,000/yr |
| **Total** | **Under $20/month** |

**To reach mainnet, additionally:**

| Item | Cost |
|---|---|
| TRAI DLT registration | ₹5,900 one-time |
| SMS at ₹0.15/OTP | Usage-based |
| KYC vendor | ~₹35–60 per customer |
| Blockchain analytics | **~$10,000/yr minimum** |
| Cybersecurity audit | Quote required |
| Legal review | Quote required |
| Entity + compliance officer | Ongoing |

The gap between those two tables is the real shape of this project. v1 is cheap.
**Operating legally is not**, and the dominant line is blockchain analytics at
roughly $10k/year — a cost absent from every reference document you have.

---

## Summary — the short version

**Now:** nothing. I start M0.

**Soon (M2–M3):** Google OAuth client · **NodeReal account** (RPC + WSS +
explorer, one key) · ~₹150 of mainnet BNB to unlock the faucet · **your custody
key policy**.

**Before M4 ends:** the five unset commercial numbers · CoinDCX as rate feed.

**Before M4.5:** two or three pilot merchants.

**Start today:** registered entity → TRAI DLT (₹5,900, ~7–10 working days,
blocks OTP) → FIU-IND. And read §0.2 — FIU needs a **working** AML stack
demonstrated live, which is a build phase, not a form.
