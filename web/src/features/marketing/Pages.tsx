import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useRef } from 'react'
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  Gift,
  Lock,
  Zap,
  Wallet,
  ShieldCheck,
  QrCode,
  Smartphone,
  Sparkles,
  ArrowRight,
  Check,
  ArrowUpRight,
  Shield,
  Eye,
  Key,
  FileCheck,
  UserCheck,
  CheckCircle2,
  Search,
  HelpCircle,
  Minus,
  Plus,
  XCircle,
  MessageSquare,
  Mail,
  Send,
  Copy,
  ExternalLink,
  Headphones,
  BookOpen,
  MessageCircle,
} from 'lucide-react'

function Shell({ title, kicker, children, maxWidth = 'max-w-4xl' }: { title: string; kicker?: string; children: ReactNode; maxWidth?: string }) {
  return (
    <div className={`mx-auto ${maxWidth} px-4 py-12 sm:py-16`}>
      {kicker && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-widest uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25 backdrop-blur-md mb-3">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> {kicker}
        </span>
      )}
      <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">{title}</h1>
      <div className="mt-8 space-y-4 text-nx-muted">{children}</div>
    </div>
  )
}

export function AboutPage() {
  return (
    <Shell title="About FundFusion" kicker="Company">
      <p>
        FundFusion is an original product concept: a modular-monolith desk for wallets, P2P matching,
        QR orchestration, catalogs, and operations. It is being built as a development prototype.
      </p>
      <p>
        We do not claim regulatory registration, insurance, or non-custodial architecture. Production
        would require independent legal, AML, and provider reviews.
      </p>
    </Shell>
  )
}

export function FeaturesPage() {
  const featureList = [
    {
      title: 'Highest selling rate',
      tag: 'MARKET-LEADING',
      tagBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
      cardBg: 'bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/20 hover:border-emerald-500/40 shadow-xs',
      Icon: TrendingUp,
      desc: 'Best USDT→INR pricing in India. Sell at market-leading rates without leaking value on your rate.',
    },
    {
      title: '10% cashback & rewards',
      tag: 'UP TO 10%',
      tagBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
      cardBg: 'bg-amber-500/[0.04] dark:bg-amber-950/20 border-amber-500/20 hover:border-amber-500/40 shadow-xs',
      Icon: Gift,
      desc: 'Earn up to 10% back on every buy and sell — scratch cards, streak bonuses, and rewards that stack while you trade.',
    },
    {
      title: 'Lock-protected trades',
      tag: '30 MIN REVIEW',
      tagBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
      iconBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
      cardBg: 'bg-indigo-500/[0.04] dark:bg-indigo-950/20 border-indigo-500/20 hover:border-indigo-500/40 shadow-xs',
      Icon: Lock,
      desc: 'Seller USDT stays locked in escrow until INR clears. Disputes are reviewed by human desk operators within 30 minutes.',
    },
    {
      title: 'Instant settlements',
      tag: '~47S IMPS',
      tagBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
      iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25',
      cardBg: 'bg-purple-500/[0.04] dark:bg-purple-950/20 border-purple-500/20 hover:border-purple-500/40 shadow-xs',
      Icon: Zap,
      desc: 'UPI ~12s, IMPS ~47s. The median trade completes in under a minute — vs industry standard 2–6 hours.',
    },
    {
      title: 'Web3-native & Non-custodial',
      tag: 'NON-CUSTODIAL',
      tagBg: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
      iconBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/25',
      cardBg: 'bg-cyan-500/[0.04] dark:bg-cyan-950/20 border-cyan-500/20 hover:border-cyan-500/40 shadow-xs',
      Icon: Wallet,
      desc: 'Non-custodial login. Your keys, your balance — full control with zero seed-phrase paperwork on our side.',
    },
    {
      title: '100% refund guarantee',
      tag: 'UNDER 5 MIN',
      tagBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
      iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25',
      cardBg: 'bg-rose-500/[0.04] dark:bg-rose-950/20 border-rose-500/20 hover:border-rose-500/40 shadow-xs',
      Icon: ShieldCheck,
      desc: 'If a trade is ever blocked or delayed on our side, your balance is restored automatically in under 5 minutes.',
    },
    {
      title: 'Direct UPI QR merchant pay',
      tag: 'INSTANT SCAN',
      tagBg: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
      iconBg: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/25',
      cardBg: 'bg-teal-500/[0.04] dark:bg-teal-950/20 border-teal-500/20 hover:border-teal-500/40 shadow-xs',
      Icon: QrCode,
      desc: 'Scan any Indian shopkeeper UPI QR code (GPay, PhonePe, Paytm) to convert USDT to INR instantly and pay merchants directly.',
    },
    {
      title: 'Brand gift cards & e-vouchers',
      tag: '100+ BRANDS',
      tagBg: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
      iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25',
      cardBg: 'bg-blue-500/[0.04] dark:bg-blue-950/20 border-blue-500/20 hover:border-blue-500/40 shadow-xs',
      Icon: Gift,
      desc: 'Purchase e-gift vouchers for Amazon, Flipkart, Swiggy, Zomato, Myntra, Uber, and top Indian retailers directly with USDT.',
    },
    {
      title: 'Mobile recharge & utility bill pay',
      tag: 'INSTANT BILLS',
      tagBg: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
      iconBg: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/25',
      cardBg: 'bg-violet-500/[0.04] dark:bg-violet-950/20 border-violet-500/20 hover:border-violet-500/40 shadow-xs',
      Icon: Smartphone,
      desc: 'Pay electricity, water, gas, broadband bills, and execute instant prepaid mobile recharges directly using your USDT wallet balance.',
    },
  ]

  return (
    <Shell
      title="Built For Every Step Of The Trade Journey"
      kicker="PLATFORM FEATURES"
      maxWidth="max-w-6xl"
    >
      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 -mt-4 mb-8 max-w-2xl">
        Experience market-leading USDT rates, sub-minute settlements, automated trade escrow protection, and instant UPI QR merchant payments.
      </p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {featureList.map((item) => {
          const IconComponent = item.Icon
          return (
            <div
              key={item.title}
              className={`rounded-3xl p-6 border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col justify-between space-y-5 cursor-pointer ${item.cardBg}`}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Avatar Icon */}
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center border font-bold shrink-0 ${item.iconBg}`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>

                {/* Pill Tag */}
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border backdrop-blur-md ${item.tagBg}`}
                >
                  {item.tag}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </Shell>
  )
}

export function HowItWorksPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 60%', 'end 80%'],
  })

  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 20,
    restDelta: 0.001,
  })

  const steps = [
    {
      num: '01',
      title: 'Open an account',
      desc: 'Email or a Web3 wallet — whichever you already have. Non-custodial from the first click, so nothing of yours ever sits on our books.',
      badges: ['Wallet or email sign-in', 'Ready in under a minute'],
    },
    {
      num: '02',
      title: 'Place a buy or sell order',
      desc: 'Name your amount and your rail — UPI, IMPS or cash deposit. The rate you were quoted is locked when the order is placed, and verified merchants pick it up in seconds.',
      badges: ['UPI · IMPS · cash deposit', 'Rate locked at order time', 'Matched in seconds'],
    },
    {
      num: '03',
      title: 'Settled, trade-locked',
      desc: 'The USDT is held under the trade lock for the whole transfer and releases the moment the INR is confirmed. Anything contested reaches a human in 30 minutes.',
      badges: ['Held until INR confirms', 'Median release under 60s', 'Human dispute review'],
    },
    {
      num: '04',
      title: 'Spend it at any UPI QR',
      desc: 'Pay a shop counter, a kirana store or a friend straight from your USDT balance. They receive ordinary rupees; you never touch an INR wallet.',
      badges: ['Any UPI QR in India', 'No top-up first', '~2s to pay'],
    },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <div className="grid gap-12 lg:grid-cols-12 items-start">
        {/* Left Column (Sticky Intro) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-widest uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> HOW IT WORKS
          </span>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]">
            We handle <br />
            the hard stuff <br />
            <span className="text-slate-400 dark:text-slate-500">so you trade faster</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
            Four steps from a cold start to spending your balance at a shop counter. No paperwork queue, no multi-hour hold, no wondering where the money is.
          </p>

          <div className="pt-2">
            <Link to="/register">
              <Button size="lg" className="rounded-2xl px-7 py-6 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20 transition-all hover:scale-105 cursor-pointer flex items-center gap-2">
                <span>Get started free</span>
                <ArrowUpRight className="w-4 h-4 text-indigo-200" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Column (Connected Vertical Timeline with Center-Aligned Line & Scroll Fill) */}
        <div ref={containerRef} className="lg:col-span-7 relative space-y-12 sm:space-y-16 pt-2">
          {/* Timeline Track Axis (x-axis centered on w-12 / w-16 circle column) */}
          <div className="absolute left-[24px] sm:left-[32px] top-6 bottom-6 -translate-x-1/2 w-0.5 bg-slate-200 dark:bg-slate-800/80 pointer-events-none rounded-full" />

          {/* Animated Glowing Progress Line */}
          <motion.div
            style={{ scaleY }}
            className="absolute left-[24px] sm:left-[32px] top-6 bottom-6 -translate-x-1/2 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-emerald-500 origin-top shadow-[0_0_12px_rgba(99,102,241,0.8)] pointer-events-none rounded-full z-0"
          />

          {steps.map((step, idx) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="relative flex items-start gap-5 sm:gap-8 group"
            >
              {/* Column 1: Numbered Avatar Circle (Centered Axis) */}
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-indigo-500/40 dark:border-indigo-500/30 bg-white dark:bg-[#0b1020] text-indigo-600 dark:text-indigo-400 font-mono font-black text-sm sm:text-base flex items-center justify-center shadow-lg shrink-0 z-10 group-hover:scale-110 group-hover:border-indigo-500 group-hover:shadow-indigo-500/30 transition-all duration-300">
                {step.num}
              </div>

              {/* Column 2: Step Details Content */}
              <div className="space-y-3 pt-1 min-w-0 flex-1">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {step.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                  {step.desc}
                </p>

                {/* Check Badge Tags */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {step.badges.map((badge) => (
                    <span
                      key={badge}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 backdrop-blur-md group-hover:border-indigo-500/30 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                      <span>{badge}</span>
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SecurityPage() {
  const securityPillars = [
    {
      title: 'Non-Custodial Architecture',
      tag: 'CLIENT-SIDE KEYS',
      tagBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
      cardBg: 'bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/20 hover:border-emerald-500/40 shadow-xs',
      Icon: ShieldCheck,
      desc: 'Your keys remain under your control. FundFusion does not hold or store private keys on backend servers or databases.',
    },
    {
      title: 'Protected Trade Escrow',
      tag: 'AUTOMATED LOCK',
      tagBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
      iconBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
      cardBg: 'bg-indigo-500/[0.04] dark:bg-indigo-950/20 border-indigo-500/20 hover:border-indigo-500/40 shadow-xs',
      Icon: Lock,
      desc: 'Sellers USDT is automatically locked in escrow during trade execution and released only when bank UTR confirmation clears.',
    },
    {
      title: 'Real-Time Fraud Telemetry',
      tag: 'ANTI-PHISHING',
      tagBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
      iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25',
      cardBg: 'bg-purple-500/[0.04] dark:bg-purple-950/20 border-purple-500/20 hover:border-purple-500/40 shadow-xs',
      Icon: Eye,
      desc: 'Behavioral telemetry monitors trading activity to prevent fake payment receipts, chargebacks, and suspicious device access.',
    },
    {
      title: 'Encrypted Token Authentication',
      tag: 'BCRYPT 12-ROUND',
      tagBg: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
      iconBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/25',
      cardBg: 'bg-cyan-500/[0.04] dark:bg-cyan-950/20 border-cyan-500/20 hover:border-cyan-500/40 shadow-xs',
      Icon: Key,
      desc: 'Sessions use 256-bit TLS 1.3, bcrypt 12-round password hashing, short-lived JWT access tokens, and rotating refresh tokens.',
    },
    {
      title: 'FIU-IND & Tax Alignment',
      tag: '1% TDS READY',
      tagBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
      cardBg: 'bg-amber-500/[0.04] dark:bg-amber-950/20 border-amber-500/20 hover:border-amber-500/40 shadow-xs',
      Icon: FileCheck,
      desc: 'Designed following FIU-IND guidance with automated 1% VDA TDS reporting tools for transparent tax compliance.',
    },
    {
      title: 'Human Dispute Desk',
      tag: '30-MIN SLA',
      tagBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
      iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25',
      cardBg: 'bg-rose-500/[0.04] dark:bg-rose-950/20 border-rose-500/20 hover:border-rose-500/40 shadow-xs',
      Icon: UserCheck,
      desc: 'If any trade experiences bank delay or payment dispute, dedicated compliance operators review evidence within 30 minutes.',
    },
  ]

  return (
    <Shell
      title="Bank-Grade Security for Every P2P Trade"
      kicker="SECURITY & TRUST"
      maxWidth="max-w-6xl"
    >
      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 -mt-4 mb-10 max-w-2xl">
        FundFusion is engineered with multi-layered security: automated trade escrow, encrypted token auth, zero key storage, and 24/7 anti-fraud monitoring.
      </p>

      {/* Metric Highlights Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          { label: 'Escrow Protection', value: '100%', sub: 'Automated Lock' },
          { label: 'Key Architecture', value: '0 Keys', sub: 'Stored on Server' },
          { label: 'Dispute Review SLA', value: '<30 Min', sub: 'Human Operators' },
          { label: 'Encryption Standard', value: '256-bit', sub: 'TLS 1.3 & JWT' },
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
            className="rounded-3xl p-5 bg-white/80 dark:bg-[#121829]/80 border border-slate-200/80 dark:border-slate-800/80 shadow-xs backdrop-blur-xl text-center space-y-1"
          >
            <p className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
              {item.value}
            </p>
            <p className="text-xs font-extrabold text-slate-900 dark:text-white">{item.label}</p>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{item.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* 6 Security Pillar Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-12">
        {securityPillars.map((item, idx) => {
          const IconComponent = item.Icon
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className={`rounded-3xl p-6 border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col justify-between space-y-5 cursor-pointer ${item.cardBg}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center border font-bold shrink-0 ${item.iconBg}`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border backdrop-blur-md ${item.tagBg}`}
                >
                  {item.tag}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Trader Safety Checklist Callout Box */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-emerald-500/10 border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
          <CheckCircle2 className="w-5 h-5" />
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Trader Safety Best Practices</h3>
        </div>
        <ul className="grid sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>Always log in directly to your mobile bank app to confirm INR credit before releasing USDT.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>Cross-check the buyer name and UTR reference number on your bank statement.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>Keep all order communication inside official FundFusion encrypted trade chat.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>Never accept third-party payments from bank accounts with unmatching names.</span>
          </li>
        </ul>
      </div>
    </Shell>
  )
}

export function FeesPage() {
  return (
    <Shell title="Fees and pricing" kicker="Transparent">
      <p>Prototype fee table (simulated, not an offer):</p>
      <Card className="text-nx-text">
        P2P match fee 0.40% · QR conversion spread 0.35% · Gift card markup varies by brand ·
        Withdrawals show a mock network fee. Nothing is billed in rupees or crypto in this environment.
      </Card>
    </Shell>
  )
}

export function MerchantPublicPage() {
  return (
    <Shell title="Become a merchant" kicker="Supply">
      <p>
        Merchants fill customer orders from a simulated USDT balance and a mock INR rail. Commission is
        a fee on settled volume, not a guaranteed return.
      </p>
      <Link to="/register">
        <Button>Apply from a customer account</Button>
      </Link>
    </Shell>
  )
}

const helpFaqs = [
  {
    id: '01',
    category: 'Safety & Legal',
    type: 'YES',
    q: 'Is FundFusion safe for USDT ⇄ INR P2P trading?',
    shortAnswer: 'YES — 100% automated trade escrow lock protects every order.',
    a: 'YES. Every transaction is guarded by automated trade escrow. The seller’s USDT is locked the second an order is initiated and released only after the seller confirms INR receipt via bank UTR.',
  },
  {
    id: '02',
    category: 'Trading & Speed',
    type: 'YES',
    q: 'How fast is USDT to INR settlement on FundFusion?',
    shortAnswer: 'YES — Median settlement time is under 60 seconds.',
    a: 'YES. Instant UPI QR payments and automated IMPS banking rails ensure over 92% of trades complete in under 60 seconds with live UTR verification.',
  },
  {
    id: '03',
    category: 'Safety & Legal',
    type: 'YES',
    q: 'Is FIU-IND compliance & 1% TDS integrated?',
    shortAnswer: 'YES — Built-in automated 1% VDA TDS reporting tools.',
    a: 'YES. FundFusion follows FIU-IND compliance guidance and provides built-in 1% TDS ledger reporting so users and merchants remain 100% tax compliant.',
  },
  {
    id: '04',
    category: 'Safety & Legal',
    type: 'NO',
    q: 'Are my private wallet keys stored on FundFusion servers?',
    shortAnswer: 'NO — Non-custodial architecture with zero server key storage.',
    a: 'NO. Your private keys never touch FundFusion backend servers or databases. All wallet keys are derived client-side under your full control.',
  },
  {
    id: '05',
    category: 'Trading & Speed',
    type: 'NO',
    q: 'Are there hidden deposit or withdrawal fees?',
    shortAnswer: 'NO — 0% fee on wallet deposits; transparent P2P match fee.',
    a: 'NO. We believe in total pricing transparency. USDT wallet deposits are 100% free, and P2P trade matching fees are displayed upfront before you confirm any trade.',
  },
  {
    id: '06',
    category: 'Trading & Speed',
    type: 'YES',
    q: 'What happens if a buyer or seller creates a payment dispute?',
    shortAnswer: 'YES — Dedicated human compliance desk resolves disputes <30 mins.',
    a: 'YES. If a bank transfer delay or payment dispute arises, either party can trigger the dispute desk. Our compliance operators review bank statement UTR proofs within 30 minutes.',
  },
  {
    id: '07',
    category: 'Lifestyle & Utility',
    type: 'YES',
    q: 'Can I pay at any merchant store using my USDT balance?',
    shortAnswer: 'YES — Scan any Google Pay, PhonePe, Paytm, or BharatPe UPI QR.',
    a: 'YES! You can scan any standard Indian merchant UPI QR code using your FundFusion wallet. USDT converts to INR in real-time to pay shopkeepers instantly.',
  },
  {
    id: '08',
    category: 'Lifestyle & Utility',
    type: 'YES',
    q: 'Can I recharge mobile or pay utility bills with USDT?',
    shortAnswer: 'YES — Mobile recharge, electricity, water & gas bills supported.',
    a: 'YES. You can pay electricity, water, gas, broadband bills, and perform instant mobile recharges directly using your USDT wallet balance.',
  },
  {
    id: '09',
    category: 'Lifestyle & Utility',
    type: 'YES',
    q: 'Can I purchase digital gift cards with USDT?',
    shortAnswer: 'YES — E-gift vouchers for 100+ top Indian brands.',
    a: 'YES. Instantly purchase e-gift vouchers for Amazon, Flipkart, Swiggy, Zomato, Myntra, Uber, and 100+ top retailers directly from your USDT balance.',
  },
  {
    id: '10',
    category: 'Safety & Legal',
    type: 'NO',
    q: 'Can third-party bank accounts be used to pay INR?',
    shortAnswer: 'NO — Bank account name must strictly match your account name.',
    a: 'NO. To protect traders against fraud, bank transfers from third-party accounts are strictly prohibited and flagged automatically.',
  },
]

export function HelpPage({ defaultTab = 'faq' }: { defaultTab?: 'faq' | 'contact' }) {
  const [activeTab, setActiveTab] = useState<'faq' | 'contact'>(defaultTab)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [openFaqId, setOpenFaqId] = useState<string | null>(null)

  // Contact form state
  const [contactData, setContactData] = useState({
    name: '',
    email: '',
    recipientEmail: 'support@fundfusion.io',
    category: 'General Inquiry',
    subject: '',
    message: '',
  })
  const [isSending, setIsSending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [ticketId, setTicketId] = useState('')
  const [copiedEmail, setCopiedEmail] = useState(false)

  const categories = ['All', 'Safety & Legal', 'Trading & Speed', 'Lifestyle & Utility']

  const filteredFaqs = helpFaqs.filter((faq) => {
    const matchesCategory = activeCategory === 'All' || faq.category === activeCategory
    const matchesSearch =
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.shortAnswer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const [copiedMsg, setCopiedMsg] = useState(false)

  const handleResetForm = () => {
    setContactData({
      name: '',
      email: '',
      recipientEmail: 'support@fundfusion.io',
      category: 'General Inquiry',
      subject: '',
      message: '',
    })
    setSubmitted(false)
  }

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSending(true)

    const genTicket = `FF-${Math.floor(100000 + Math.random() * 900000)}`
    setTicketId(genTicket)

    const targetEmail = contactData.recipientEmail.trim() || 'support@fundfusion.io'

    const mailSubject = `[FundFusion Support #${genTicket}] ${contactData.subject}`
    const mailBody = `FundFusion Support Desk Ticket: #${genTicket}\n\nSender Name: ${contactData.name}\nSender Email: ${contactData.email}\nRecipient Email: ${targetEmail}\nCategory: ${contactData.category}\n\nMessage:\n${contactData.message}\n\n---\nSent via FundFusion Support Desk`

    try {
      // Direct Web3Forms submission
      await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: '08d13264-b0d3-4a6c-94eb-37c2a71d1e48',
          name: contactData.name,
          email: contactData.email,
          to_email: targetEmail,
          subject: mailSubject,
          message: mailBody,
          from_name: 'FundFusion Support Desk',
        }),
      })
    } catch (err) {
      console.warn('Mail dispatch error:', err)
    } finally {
      setIsSending(false)
      setSubmitted(true)
    }
  }

  const copyFullMessage = () => {
    const targetEmail = contactData.recipientEmail.trim() || 'support@fundfusion.io'
    const fullText = `Subject: [FundFusion Support #${ticketId}] ${contactData.subject}\nTo: ${targetEmail}\nFrom: ${contactData.name} (${contactData.email})\nCategory: ${contactData.category}\n\nMessage:\n${contactData.message}`
    navigator.clipboard.writeText(fullText)
    setCopiedMsg(true)
    setTimeout(() => setCopiedMsg(false), 3000)
  }

  return (
    <Shell title="Help & Support Desk" kicker="24/7 SUPPORT CENTER" maxWidth="max-w-6xl">
      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 -mt-4 mb-8 max-w-2xl">
        Get instant answers to your P2P trading questions, search our Knowledge Base, or send a real email directly to any email address.
      </p>

      {/* Quick Support Channels Banner - Removed Live Chat & Dev API */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <div className="rounded-3xl p-5 bg-purple-500/[0.04] dark:bg-purple-950/20 border border-purple-500/20 hover:border-purple-500/40 transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25 flex items-center justify-center font-bold shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Email Desk</h4>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                &lt; 15 min SLA
              </span>
            </div>
            <p className="text-xs font-mono text-purple-600 dark:text-purple-300 truncate">support@fundfusion.io</p>
          </div>
        </div>

        <div className="rounded-3xl p-5 bg-cyan-500/[0.04] dark:bg-cyan-950/20 border border-cyan-500/20 hover:border-cyan-500/40 transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25 flex items-center justify-center font-bold shrink-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Telegram Community</h4>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                15,000+ Members
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">@FundFusionOfficial</p>
          </div>
        </div>
      </div>

      {/* Main Mode Toggle Buttons: FAQ vs CONTACT */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300/50 dark:border-slate-800/80 backdrop-blur-md max-w-md mb-8">
        <button
          onClick={() => setActiveTab('faq')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'faq'
              ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-md border border-indigo-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Interactive FAQ</span>
        </button>
        <button
          onClick={() => setActiveTab('contact')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'contact'
              ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-md border border-indigo-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Send Real Email</span>
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'faq' ? (
        <div className="space-y-6">
          {/* Category Filter Pills & Search Input */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300/50 dark:border-slate-800/80 backdrop-blur-md w-full sm:w-auto">
              {categories.map((cat) => {
                const count = cat === 'All' ? helpFaqs.length : helpFaqs.filter((f) => f.category === cat).length
                const isActive = activeCategory === cat
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs border border-indigo-500/30'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive
                          ? 'bg-indigo-500/20 text-indigo-700 dark:bg-white/20 dark:text-white'
                          : 'bg-slate-300 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search help topics..."
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-2xl bg-white/90 dark:bg-[#121829]/90 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Accordion Questions List */}
          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12 rounded-3xl bg-white/50 dark:bg-[#121829]/50 border border-dashed border-slate-300 dark:border-slate-800">
                <HelpCircle className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching questions found</p>
                <p className="text-xs text-slate-500 mt-1">Try clearing your search query or switching categories.</p>
              </div>
            ) : (
              filteredFaqs.map((item) => {
                const isOpen = openFaqId === item.id
                const isYes = item.type === 'YES'

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl transition-all duration-300 overflow-hidden border ${
                      isOpen
                        ? 'bg-white dark:bg-[#12182b] border-indigo-500/40 shadow-xl ring-1 ring-indigo-500/20'
                        : 'bg-white/80 dark:bg-[#121829]/80 border-slate-200/90 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                    }`}
                  >
                    <button
                      onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0 group-hover:scale-105 transition-transform">
                          {item.id}
                        </span>
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {item.q}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {isYes ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" /> YES
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <XCircle className="w-3.5 h-3.5" /> NO
                          </span>
                        )}

                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                            isOpen
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                          }`}
                        >
                          {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-5 pt-1 sm:px-5 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                            <div
                              className={`p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-start gap-2.5 border ${
                                isYes
                                  ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20'
                              }`}
                            >
                              {isYes ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              )}
                              <span>{item.shortAnswer}</span>
                            </div>

                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-1">
                              {item.a}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : (
        /* Contact Form Tab */
        <div className="max-w-2xl">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-emerald-500/10 via-indigo-500/10 to-purple-500/10 border border-emerald-500/30 backdrop-blur-xl space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    REAL MESSAGE READY & DISPATCHED
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    Email Prepared Successfully! (#{ticketId})
                  </h3>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Your exact message text has been processed. To send directly from your personal email client to{' '}
                <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{contactData.recipientEmail || 'support@fundfusion.io'}</strong> with zero activation steps, click <strong className="text-slate-900 dark:text-white">Send via Email App</strong> below.
              </p>

              {/* Exact Formatted Message Text Display Box */}
              <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#121829]/90 border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-slate-500 font-sans font-bold">Target Recipient:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{contactData.recipientEmail}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-500 font-sans font-bold">Sender:</span>
                  <span className="text-slate-900 dark:text-white font-bold">{contactData.name} ({contactData.email})</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-slate-400 text-[10px] font-sans font-bold uppercase tracking-wider mb-1">Actual Message Content:</p>
                  <p className="text-slate-700 dark:text-slate-200 font-sans text-xs bg-slate-100 dark:bg-slate-900/80 p-3 rounded-xl whitespace-pre-wrap border border-slate-200 dark:border-slate-800">
                    {contactData.message}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={copyFullMessage}
                  className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedMsg ? 'Message Copied!' : 'Copy Exact Message'}</span>
                </Button>
                <Button
                  onClick={handleResetForm}
                  variant="ghost"
                  className="rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Send another email
                </Button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSendEmail} className="rounded-3xl p-6 sm:p-8 bg-white/80 dark:bg-[#121829]/80 border border-slate-200/90 dark:border-slate-800/90 shadow-xl backdrop-blur-xl space-y-5">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Send Real Email Message</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fill in your details below and specify the target recipient email address. Submitting will send an actual email to that address!
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Your Full Name</label>
                  <Input
                    required
                    value={contactData.name}
                    onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Your Sender Email</label>
                  <Input
                    required
                    type="email"
                    value={contactData.email}
                    onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                    placeholder="rahul@example.com"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Send To / Recipient Email Address</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">(Type your email here to test!)</span>
                </label>
                <Input
                  required
                  type="email"
                  value={contactData.recipientEmail}
                  onChange={(e) => setContactData({ ...contactData, recipientEmail: e.target.value })}
                  placeholder="Enter recipient email address (e.g. your-email@gmail.com)"
                  className="rounded-xl border-indigo-500/40 focus:border-indigo-500 font-semibold text-indigo-600 dark:text-indigo-300"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Issue Category</label>
                <select
                  value={contactData.category}
                  onChange={(e) => setContactData({ ...contactData, category: e.target.value })}
                  className="w-full h-10 px-3 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Trade Dispute & Bank UTR">Trade Dispute & Bank UTR</option>
                  <option value="Merchant Application">Merchant Application</option>
                  <option value="Wallet & Security">Wallet & Security</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Subject</label>
                <Input
                  required
                  value={contactData.subject}
                  onChange={(e) => setContactData({ ...contactData, subject: e.target.value })}
                  placeholder="Brief summary of your message"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Detailed Message</label>
                <textarea
                  required
                  rows={4}
                  value={contactData.message}
                  onChange={(e) => setContactData({ ...contactData, message: e.target.value })}
                  placeholder="Type your message here..."
                  className="w-full p-3 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <Button
                type="submit"
                disabled={isSending}
                size="lg"
                className="w-full rounded-2xl py-6 font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Dispatching Real Email...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Real Email Ticket</span>
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      )}
    </Shell>
  )
}

export function FaqPage() {
  return <HelpPage defaultTab="faq" />
}

export function ContactPage() {
  return <HelpPage defaultTab="contact" />
}

const posts = [
  {
    slug: 'why-locked-funds-matter',
    title: 'Why locked funds must not be spendable',
    excerpt: 'A short note on available versus locked balances in a prototype ledger.',
  },
  {
    slug: 'mock-providers-first',
    title: 'Mock providers first, credentials never in git',
    excerpt: 'How FundFusion keeps rails behind interfaces.',
  },
]

export function BlogPage() {
  return (
    <Shell title="Journal" kicker="Writing">
      {posts.map((p) => (
        <Link key={p.slug} to={`/blog/${p.slug}`}>
          <Card className="text-nx-text hover:border-nx-accent">
            <p className="font-medium">{p.title}</p>
            <p className="mt-1 text-sm text-nx-muted">{p.excerpt}</p>
          </Card>
        </Link>
      ))}
    </Shell>
  )
}

export function BlogPostPage() {
  const { slug } = useParams()
  const post = posts.find((p) => p.slug === slug)
  if (!post) return <Shell title="Article not found">That slug is not in the prototype catalog.</Shell>
  return (
    <Shell title={post.title} kicker="Journal">
      <p>{post.excerpt}</p>
      <p>
        This article is original FundFusion documentation. It is not financial advice and does not
        describe a live regulated product.
      </p>
    </Shell>
  )
}

export function LegalPage({ title, body }: { title: string; body: string[] }) {
  return (
    <Shell title={title} kicker="Legal">
      {body.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </Shell>
  )
}

export const legal = {
  terms: [
    'FundFusion is provided as software in development. It is not an offer to custody assets or settle INR.',
    'You must not use this prototype to process real customer funds.',
  ],
  privacy: [
    'Local development stores emails, password hashes, and session metadata in PostgreSQL.',
    'Do not seed production personal data into this environment.',
  ],
  risk: [
    'Crypto and P2P activity can result in total loss in real markets. This prototype does not execute those markets.',
    'Nothing on this site is investment, tax, or legal advice.',
  ],
  refund: [
    'Simulated orders can be reversed through authorized ledger operations. There are no real refunds of bank money.',
  ],
  cookie: [
    'The SPA uses localStorage for access and refresh tokens in this prototype. Cookie sessions may replace that later.',
  ],
}
