import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, animate, AnimatePresence } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  Landmark,
  Lock,
  QrCode,
  Shield,
  Sparkles,
  Wallet,
  Zap,
  Star,
  ShieldCheck,
  CheckCircle2,
  Check,
  Copy,
  CreditCard,
  RefreshCw,
  Smartphone,
  Receipt,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Clock,
  ArrowUpRight,
  Gift,
  UserPlus,
  ChevronDown,
  Search,
  HelpCircle,
  XCircle,
  Plus,
  Minus,
} from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { activity, prices, sampleTestimonials } from '@/lib/demo-data'

function AnimatedCounter({
  target,
  prefix = '',
  suffix = '',
  duration = 1.8,
}: {
  target: number
  prefix?: string
  suffix?: string
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-30px' })
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, target, {
        duration,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (latest) => setCurrent(Math.floor(latest)),
      })
      return () => controls.stop()
    }
  }, [isInView, target, duration])

  return (
    <span ref={ref}>
      {prefix}
      {current}
      {suffix}
    </span>
  )
}

interface FAQItem {
  id: string
  category: 'Safety & Legal' | 'Trading & Speed' | 'Lifestyle & Utility'
  type: 'YES' | 'NO'
  q: string
  shortAnswer: string
  a: string
}

const faqs: FAQItem[] = [
  {
    id: '01',
    category: 'Safety & Legal',
    type: 'YES',
    q: 'Is FundFusion safe for P2P USDT trading in India?',
    shortAnswer: 'YES — 100% Safe with automated trade escrow & anti-fraud telemetry.',
    a: 'YES. FundFusion uses non-custodial automated trade matching, real-time anti-fraud telemetry, and protected trade escrow verification. Seller funds are locked in escrow and only released after bank UTR verification, protecting both buyers and sellers completely.',
  },
  {
    id: '02',
    category: 'Trading & Speed',
    type: 'NO',
    q: 'Do I need KYC to use FundFusion?',
    shortAnswer: 'NO — Instant access for prototype exploration.',
    a: 'NO for basic exploration! You can explore live price quotes, simulate wallet transfers, and test P2P order matching instantly without mandatory upfront KYC. For high-volume merchant desk trading, a quick 1-minute automated identity check is available.',
  },
  {
    id: '03',
    category: 'Trading & Speed',
    type: 'NO',
    q: 'What is the minimum amount I can trade?',
    shortAnswer: 'NO High Barrier — Start micro-trading from as low as ₹100 (~1 USDT).',
    a: 'NO high minimum limit! FundFusion allows micro-trading starting from as low as ₹100 (approx. 1 USDT) with zero micro-order penalties, making it accessible to beginners as well as high-volume merchants.',
  },
  {
    id: '04',
    category: 'Trading & Speed',
    type: 'YES',
    q: 'What payment methods are supported?',
    shortAnswer: 'YES — Instant UPI, IMPS 24/7, NEFT, RTGS & QR Payments.',
    a: 'YES. We support all major Indian payment rails including UPI (Google Pay, PhonePe, Paytm, BHIM), IMPS 24/7 instant bank transfers, NEFT/RTGS, and direct merchant QR scanning.',
  },
  {
    id: '05',
    category: 'Trading & Speed',
    type: 'YES',
    q: 'How long does a P2P trade take?',
    shortAnswer: 'YES — Ultra-fast completion in under 60 seconds (Sub-minute).',
    a: 'YES, trades complete in under 60 seconds! Our intelligent algorithmic matching engine pairs buyers and sellers instantly, while automated UTR parsing eliminates waiting time.',
  },
  {
    id: '06',
    category: 'Safety & Legal',
    type: 'YES',
    q: 'Is P2P USDT trading legal in India?',
    shortAnswer: 'YES — Fully legal under Indian tax & FIU guidelines.',
    a: 'YES. Buying and selling USDT via peer-to-peer bank transfers is completely legal in India. FundFusion operates strictly within compliance frameworks adhering to FIU-IND guidance and standard 1% VDA TDS guidelines.',
  },
  {
    id: '07',
    category: 'Safety & Legal',
    type: 'NO',
    q: 'Does FundFusion deduct TDS or report my taxes?',
    shortAnswer: 'NO Direct Bank Deduction — Automated TDS summaries provided for easy filing.',
    a: 'NO direct bank account deduction! FundFusion never debits your bank account directly for taxes. Instead, we generate downloadable 1% VDA TDS tax summaries so you can report your crypto transactions accurately.',
  },
  {
    id: '08',
    category: 'Lifestyle & Utility',
    type: 'YES',
    q: 'Can I spend USDT directly at UPI shops in India?',
    shortAnswer: 'YES — Instant USDT-to-INR UPI QR scanning at any merchant.',
    a: 'YES! You can scan any standard Indian merchant UPI QR code (Google Pay, BharatPe, Paytm, PhonePe) using your FundFusion wallet. Your USDT is converted to INR in real time to pay shopkeepers instantly.',
  },
  {
    id: '09',
    category: 'Lifestyle & Utility',
    type: 'YES',
    q: 'Can I recharge my mobile or pay utility bills with USDT?',
    shortAnswer: 'YES — Mobile recharge, electricity, water & gas bill pay supported.',
    a: 'YES. You can pay electricity, water, gas, broadband bills, and perform instant mobile recharges directly using your USDT wallet balance with real-time conversion and instant receipts.',
  },
  {
    id: '10',
    category: 'Lifestyle & Utility',
    type: 'YES',
    q: 'Can I buy gift cards with USDT on FundFusion?',
    shortAnswer: 'YES — Instant e-gift vouchers for 100+ top Indian brands.',
    a: 'YES. FundFusion allows you to purchase digital e-gift vouchers for Amazon, Flipkart, Swiggy, Zomato, Myntra, Uber, and 100+ top Indian retailers directly with your USDT balance.',
  },
]

function InteractiveFAQSection() {
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [openFaqId, setOpenFaqId] = useState<string | null>(null)

  const categories = ['All', 'Safety & Legal', 'Trading & Speed', 'Lifestyle & Utility']

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = activeCategory === 'All' || faq.category === activeCategory
    const matchesSearch =
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.shortAnswer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <section className="mx-auto max-w-5xl px-4 pb-24">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold tracking-widest uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25 backdrop-blur-md mb-3">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> QUESTIONS & ANSWERS
        </span>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
          Everything Else, <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 bg-clip-text text-transparent">Clear & Answered</span>
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Direct YES & NO answers for P2P trading, legal compliance, UPI shop payments, and utility features.
        </p>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300/50 dark:border-slate-800/80 backdrop-blur-md w-full sm:w-auto">
          {categories.map((cat) => {
            const count = cat === 'All' ? faqs.length : faqs.filter((f) => f.category === cat).length
            const isActive = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-md border border-indigo-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/40 dark:hover:bg-slate-800/50'
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
            placeholder="Search questions..."
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
                    {/* Number Badge */}
                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0 group-hover:scale-105 transition-transform">
                      {item.id}
                    </span>

                    {/* Question Text */}
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {item.q}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Direct YES / NO Badge Tag */}
                    {isYes ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" /> YES
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        <XCircle className="w-3.5 h-3.5" /> NO
                      </span>
                    )}

                    {/* Toggle Button */}
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
                        {/* Summary Lead Box */}
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

                        {/* Detailed Answer Paragraph */}
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
    </section>
  )
}

export function LandingPage() {
  const features: { Icon: LucideIcon; t: string; d: string }[] = [
    { Icon: Wallet, t: 'Digital wallet', d: 'Available, locked, and total balances with address books.' },
    { Icon: Zap, t: 'Buy & sell', d: 'Quoted pairs, fee breakdowns, and merchant matching.' },
    { Icon: QrCode, t: 'Pay by QR', d: 'Mock UPI parse, conversion quote, and confirmation.' },
    { Icon: Sparkles, t: 'Lifestyle rails', d: 'Gift cards, recharge, and bills through mock providers.' },
  ]

  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-emerald-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 animate-pulse" />
            <span>NEXT-GEN P2P ENGINE · SIMULATED RAILS</span>
          </span>

          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]">
            India's Smartest P2P Rails for{' '}
            <span className="inline-block mt-2 sm:mt-0 font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 bg-clip-text text-transparent">
              USDT <span className="inline-block text-indigo-500 dark:text-indigo-400 mx-1 animate-pulse">⇄</span> INR
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Buy, sell, and settle USDT instantly over UPI and IMPS. Every order is trade-locked in automated escrow, settles in ~60 seconds, and remains server-verified from order to release.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/register">
              <Button size="lg" className="rounded-2xl px-7 py-6 text-base font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                Start trading free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/features">
              <Button size="lg" variant="ghost" className="rounded-2xl px-6 py-6 text-base font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all">
                Explore platform
              </Button>
            </Link>
          </div>

          {/* Social Proof Trust Bar - Fully Visible Single Line */}
          <div className="mt-8 pt-5 border-t border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-3 sm:gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
              {/* Rating */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold text-slate-900 dark:text-white">4.9</span>
                <span className="text-slate-500 dark:text-slate-400 text-xs">(12k+ reviews)</span>
              </div>

              <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>

              {/* Escrow */}
              <div className="flex items-center gap-1.5 shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Trade-Locked</span>
              </div>

              <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>

              {/* Live Traders */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">10k+ Traders Live</span>
              </div>
            </div>
          </div>
        </div>
        <HeroDesk />
      </section>

      {/* High-Impact Performance Metrics & Guarantee Banner */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl bg-white/80 dark:bg-[#121829]/80 border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-8 backdrop-blur-2xl shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-200/80 dark:divide-slate-800/80">
            {/* Metric 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col items-center md:items-start text-center md:text-left pt-4 md:pt-0 md:pl-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                  <AnimatedCounter target={60} prefix="<" suffix="s" />
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  FAST
                </span>
              </div>
              <p className="mt-2 text-xs font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
                Avg. Settlement
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Direct UPI & IMPS Rails
              </p>
            </motion.div>

            {/* Metric 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col items-center md:items-start text-center md:text-left pt-4 md:pt-0 md:pl-6"
            >
              <div className="flex items-center gap-2">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                  <AnimatedCounter target={100} suffix="%" />
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">
                  LOCKED
                </span>
              </div>
              <p className="mt-2 text-xs font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
                Trade Escrow
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Server-Verified Ledger
              </p>
            </motion.div>

            {/* Metric 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col items-center md:items-start text-center md:text-left pt-4 md:pt-0 md:pl-6"
            >
              <div className="flex items-center gap-2">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                  <AnimatedCounter target={10} prefix="₹" suffix="M+" />
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25">
                  RAILS
                </span>
              </div>
              <p className="mt-2 text-xs font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
                Simulated Volume
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Continuous Liquidity
              </p>
            </motion.div>

            {/* Metric 4 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col items-center md:items-start text-center md:text-left pt-4 md:pt-0 md:pl-6"
            >
              <div className="flex items-center gap-2">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                  <AnimatedCounter target={15} suffix="K+" />
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                  LIVE
                </span>
              </div>
              <p className="mt-2 text-xs font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
                Active Traders
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Verified Merchants & Users
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Interactive Feature Desk Showcase */}
      <OneDeskShowcase />

      <Split
        title="Buy and sell with a quote you can actually expire"
        body="Customers pick an asset and an INR or USDT amount. The API returns a timed quote, fee lines, and a merchant-ready order. Nothing completes because a button looks green."
        points={['Asset selector', 'Fee breakdown on the server', 'Order status from the state machine']}
        cta={['/customer/buy', 'Open buy desk']}
      >
        <QuoteExpirePreview />
      </Split>

      <Split
        reverse
        title="Scan a QR. Preview the beneficiary. Confirm once."
        body="Upload or camera-scan a mock QR, or type a UPI ID. Conversion is quoted before funds lock. The prototype parser is labelled so it is never mistaken for a live PSP."
        points={['Mock QR parser', 'Escrow lock simulation', 'Seller matching']}
        cta={['/customer/pay', 'Try pay flow']}
      >
        <QRScanPreview />
      </Split>

      <Split
        title="A wallet that shows what you can spend"
        body="Available, locked, and total sit side by side. Deposits mint a mock address and confirmation counter. Withdrawals and sends require confirmation screens."
        points={['Network selection', 'Address management', 'Ledger-backed history']}
        cta={['/customer/wallet', 'View wallet']}
      >
        <WalletSpendPreview />
      </Split>

      <Split
        reverse
        title="Merchants fill the other side of the book"
        body="Verified desks accept eligible orders, submit UTR and mock proof, and see commission on settled volume — never as guaranteed profit."
        points={['Available / active / completed', 'Settlement history', 'Performance, not promises']}
        cta={['/merchant', 'Become a merchant']}
      >
        <MerchantBookPreview />
      </Split>

      {/* Feature Spotlight Grid: Gift Cards & Utilities */}
      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl bg-white/90 dark:bg-[#121829]/90 border border-slate-200/90 dark:border-slate-800/90 p-7 backdrop-blur-xl shadow-lg dark:shadow-2xl relative overflow-hidden group space-y-4"
        >
          <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-amber-500/10 via-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 group-hover:scale-110 transition-transform duration-300">
              <Gift className="h-6 w-6" />
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              INSTANT VOUCHERS
            </span>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Gift Cards & Digital Vouchers
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Explore catalog search, custom denominations, and instant delivery. Redeem top brand gift codes seamlessly using your USDT ledger.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-3xl bg-white/90 dark:bg-[#121829]/90 border border-slate-200/90 dark:border-slate-800/90 p-7 backdrop-blur-xl shadow-lg dark:shadow-2xl relative overflow-hidden group space-y-4"
        >
          <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 group-hover:scale-110 transition-transform duration-300">
              <Receipt className="h-6 w-6" />
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              UTILITY BILLS & RECHARGE
            </span>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Telecom, DTH & Electricity Rails
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Fetch consumer details, verify monthly bill quotes, and confirm receipt generation for fast mock utility settlement.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Interactive Unified Step Wizard: How It Works */}
      <InteractiveHowItWorks />


      {/* Why FundFusion Showcase Banner */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="rounded-[32px] bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 text-white p-8 sm:p-12 shadow-2xl relative overflow-hidden space-y-8"
        >
          {/* Subtle background glow graphics */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/15 pb-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-white/15 text-white border border-white/20 backdrop-blur-md mb-3">
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" /> BENCHMARK PERFORMANCE
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                Why FundFusion is the Right Choice
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-indigo-100 max-w-md leading-relaxed">
              Designed with automated escrow, server-verified rate locks, and zero-float decimal ledger integrity across all simulated money moves.
            </p>
          </div>

          {/* 3 Metrics Column Grid with Vertical Dividers */}
          <div className="relative z-10 grid gap-8 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/15">
            {/* Metric 1 */}
            <div className="pt-4 md:pt-0 md:pr-6 space-y-2">
              <p className="text-3xl sm:text-4xl font-black tracking-tight font-mono text-white">
                ₹10M+
              </p>
              <p className="text-xs font-black uppercase tracking-wider text-indigo-200">
                PROCESSED SIMULATED DAILY
              </p>
              <p className="text-xs text-indigo-100/90 leading-relaxed pt-1">
                Real settlement volume across UPI, IMPS, and mock deposit rails — matched with verified merchants in seconds.
              </p>
            </div>

            {/* Metric 2 */}
            <div className="pt-4 md:pt-0 md:px-6 space-y-2">
              <p className="text-3xl sm:text-4xl font-black tracking-tight font-mono text-white">
                &lt;60s
              </p>
              <p className="text-xs font-black uppercase tracking-wider text-indigo-200">
                MEDIAN LOCK & SETTLEMENT
              </p>
              <p className="text-xs text-indigo-100/90 leading-relaxed pt-1">
                From order creation to USDT escrow release. Fast UPI matching ensures rapid trade execution.
              </p>
            </div>

            {/* Metric 3 */}
            <div className="pt-4 md:pt-0 md:pl-6 space-y-2">
              <p className="text-3xl sm:text-4xl font-black tracking-tight font-mono text-white">
                10K+
              </p>
              <p className="text-xs font-black uppercase tracking-wider text-indigo-200">
                ACTIVE SIMULATED TRADERS
              </p>
              <p className="text-xs text-indigo-100/90 leading-relaxed pt-1">
                A protected marketplace of verified merchants and traders active across major hubs in India.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Community Testimonials: Infinite Dual-Row Smooth Marquee */}
      <section className="mx-auto max-w-7xl px-4 pb-20 overflow-hidden relative">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold tracking-widest uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25 backdrop-blur-md mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> COMMUNITY FEEDBACK
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Trusted By Traders <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent">Across India</span>
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Real-time live scrolling feedback from verified merchants and traders. 
          </p>
        </div>



        {/* Marquee Row 1 (Left to Right Loop) */}
        <div className="flex overflow-hidden py-2 mb-4 pause-row">
          <div className="flex gap-4 shrink-0 animate-marquee-left">
            {[
              { name: 'Amit Verma', initials: 'AV', role: 'Verified Trader', time: '3 DAYS AGO', quote: 'Speed is the game changer. My last three USDT sells were done inside a minute while other apps kept me waiting.' },
              { name: 'Rahul Sharma', initials: 'RS', role: 'Merchant Desk', time: '2 DAYS AGO', quote: 'Best P2P platform prototype in India. Settlements are super fast and I got the best rates for my USDT.' },
              { name: 'Priya Patel', initials: 'PP', role: 'Verified Trader', time: '1 WEEK AGO', quote: 'Finally a safe place to sell crypto. The protected trade escrow flow gives me total peace of mind.' },
              { name: 'Dev Rathee', initials: 'DR', role: 'Merchant Desk', time: '4 HOURS AGO', quote: 'Order matching and UTR verification worked seamlessly in minutes. Very responsive and helpful flow.' },
              // Duplicate set for seamless loop
              { name: 'Amit Verma', initials: 'AV', role: 'Verified Trader', time: '3 DAYS AGO', quote: 'Speed is the game changer. My last three USDT sells were done inside a minute while other apps kept me waiting.' },
              { name: 'Rahul Sharma', initials: 'RS', role: 'Merchant Desk', time: '2 DAYS AGO', quote: 'Best P2P platform prototype in India. Settlements are super fast and I got the best rates for my USDT.' },
              { name: 'Priya Patel', initials: 'PP', role: 'Verified Trader', time: '1 WEEK AGO', quote: 'Finally a safe place to sell crypto. The protected trade escrow flow gives me total peace of mind.' },
              { name: 'Dev Rathee', initials: 'DR', role: 'Merchant Desk', time: '4 HOURS AGO', quote: 'Order matching and UTR verification worked seamlessly in minutes. Very responsive and helpful flow.' },
            ].map((item, idx) => (
              <div
                key={`r1-${idx}`}
                className="w-[340px] sm:w-[380px] rounded-3xl bg-white/90 dark:bg-[#121829]/90 border border-slate-200/90 dark:border-slate-800/90 p-6 backdrop-blur-xl shadow-lg space-y-4 flex flex-col justify-between shrink-0 group hover:border-indigo-500/50 hover:scale-[1.02] transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 text-indigo-500 dark:text-indigo-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-indigo-500 dark:fill-indigo-400 text-indigo-500 dark:text-indigo-400" />
                    ))}
                  </div>
                  <span className="text-[9px] font-mono font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {item.time}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  “{item.quote}”
                </p>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-110 transition-transform">
                    {item.initials}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Marquee Row 2 (Right to Left Loop) */}
        <div className="flex overflow-hidden py-2 pause-row">
          <div className="flex gap-4 shrink-0 animate-marquee-right">
            {[
              { name: 'Vikram Singh', initials: 'VS', role: 'Verified Trader', time: '5 HOURS AGO', quote: 'The UI is so smooth and easy to use. Dark mode looks amazing. Sold 500 USDT instantly via IMPS.' },
              { name: 'Anjali Das', initials: 'AD', role: 'Verified Trader', time: '1 DAY AGO', quote: 'Great experience! No hidden charges and the instant rate locking is super transparent. Will trade here again.' },
              { name: 'Sneha Reddy', initials: 'SR', role: 'Merchant Desk', time: 'JUST NOW', quote: 'Available orders, UTR submission, and settlement history sat in one desk. Seamless experience.' },
              { name: 'Karan Malhotra', initials: 'KM', role: 'Verified Trader', time: '12 HOURS AGO', quote: 'QR pay and recharge flows felt like one product instead of five apps. Simulated experience is brilliant.' },
              // Duplicate set for seamless loop
              { name: 'Vikram Singh', initials: 'VS', role: 'Verified Trader', time: '5 HOURS AGO', quote: 'The UI is so smooth and easy to use. Dark mode looks amazing. Sold 500 USDT instantly via IMPS.' },
              { name: 'Anjali Das', initials: 'AD', role: 'Verified Trader', time: '1 DAY AGO', quote: 'Great experience! No hidden charges and the instant rate locking is super transparent. Will trade here again.' },
              { name: 'Sneha Reddy', initials: 'SR', role: 'Merchant Desk', time: 'JUST NOW', quote: 'Available orders, UTR submission, and settlement history sat in one desk. Seamless experience.' },
              { name: 'Karan Malhotra', initials: 'KM', role: 'Verified Trader', time: '12 HOURS AGO', quote: 'QR pay and recharge flows felt like one product instead of five apps. Simulated experience is brilliant.' },
            ].map((item, idx) => (
              <div
                key={`r2-${idx}`}
                className="w-[340px] sm:w-[380px] rounded-3xl bg-white/90 dark:bg-[#121829]/90 border border-slate-200/90 dark:border-slate-800/90 p-6 backdrop-blur-xl shadow-lg space-y-4 flex flex-col justify-between shrink-0 group hover:border-indigo-500/50 hover:scale-[1.02] transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 text-indigo-500 dark:text-indigo-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-indigo-500 dark:fill-indigo-400 text-indigo-500 dark:text-indigo-400" />
                    ))}
                  </div>
                  <span className="text-[9px] font-mono font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {item.time}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  “{item.quote}”
                </p>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-110 transition-transform">
                    {item.initials}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive FAQ Section with Category Filters, Search & Direct YES/NO Badges */}
      <InteractiveFAQSection />

      {/* Premium Large Call-To-Action Banner */}
      <section className="mx-auto max-w-7xl px-4 pb-28">
        <div className="rounded-[2.5rem] bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-800 text-white p-10 sm:p-14 lg:p-16 shadow-2xl shadow-indigo-500/25 border border-white/20 relative overflow-hidden backdrop-blur-2xl">
          {/* Animated Background Radial Glow Ambient Orbs */}
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            {/* Left Content */}
            <div className="space-y-4 text-center lg:text-left max-w-2xl">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase bg-white/15 text-white border border-white/25 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" /> READY TO TRADE?
              </span>

              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15]">
                Open Your Trading <span className="bg-gradient-to-r from-white via-indigo-100 to-amber-200 bg-clip-text text-transparent">Desk Today.</span>
              </h2>

              <p className="text-sm sm:text-base lg:text-lg text-indigo-100 leading-relaxed font-medium">
                Join thousands of verified traders & merchants across India. Experience sub-minute P2P matching, zero hidden charges, and instant UPI QR payments.
              </p>

              {/* Feature Highlights Pills */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2 text-xs sm:text-sm font-bold text-indigo-100">
                <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>100% Escrow Protected</span>
                </div>
                <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md">
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Sub-Minute Settlements</span>
                </div>
                <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md">
                  <QrCode className="w-4 h-4 text-cyan-300" />
                  <span>Direct UPI QR Scan</span>
                </div>
              </div>
            </div>

            {/* Right Action Buttons & Live Metric */}
            <div className="flex flex-col items-center gap-3 shrink-0 w-full sm:w-auto">
              <Link to="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto rounded-2xl px-10 py-7 text-base font-black bg-white text-indigo-700 hover:bg-slate-50 shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:scale-105 cursor-pointer group flex items-center justify-center gap-2">
                  <span>Create free account</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </Button>
              </Link>

              <p className="text-xs font-bold text-indigo-100 text-center pt-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 inline" />
                <span>Instant Access • 100% Free Setup & Zero Deposit Fees</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function Split({
  title,
  body,
  points,
  cta,
  reverse,
  children,
}: {
  title: string
  body: string
  points: string[]
  cta: [string, string]
  reverse?: boolean
  children?: React.ReactNode
}) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-20 md:grid-cols-2">
      <div className={reverse ? 'md:order-2 space-y-4' : 'space-y-4'}>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">{title}</h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">{body}</p>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <Link to={cta[0]} className="inline-block pt-2">
          <Button className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md">
            {cta[1]} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </Link>
      </div>
      <div className={reverse ? 'md:order-1' : undefined}>
        {children}
      </div>
    </section>
  )
}

function QuoteExpirePreview() {
  const [timeLeft, setTimeLeft] = useState(48)
  const [usdtAmount, setUsdtAmount] = useState('100')
  const [orderState, setOrderState] = useState<'QUOTED' | 'LOCKED' | 'MATCHED'>('QUOTED')

  useEffect(() => {
    if (orderState !== 'QUOTED') return
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 1 ? prev - 1 : 60))
    }, 1000)
    return () => clearInterval(timer)
  }, [orderState])

  const rate = 84.25
  const netInr = (Number(usdtAmount || 0) * rate * 0.998).toFixed(2)
  const feeInr = (Number(usdtAmount || 0) * rate * 0.002).toFixed(2)

  const handleNextState = () => {
    if (orderState === 'QUOTED') setOrderState('LOCKED')
    else if (orderState === 'LOCKED') setOrderState('MATCHED')
    else setOrderState('QUOTED')
  }

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl relative overflow-hidden space-y-4">
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-purple-500/15 blur-2xl pointer-events-none" />

      {/* Header with Timed Expire Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Server Quoted Order</span>
        </div>
        <div className="flex items-center gap-2">
          {orderState === 'QUOTED' && (
            <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 font-bold bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 animate-pulse flex items-center gap-1">
              Expires in 00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}s
            </span>
          )}
          <button
            onClick={() => setTimeLeft(60)}
            className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] cursor-pointer"
            title="Refresh Quote"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* State Machine Status Bar */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-center">
        <div className={`py-1 rounded-lg transition-colors ${orderState === 'QUOTED' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40' : 'text-slate-400 dark:text-slate-500'}`}>
          1. QUOTED
        </div>
        <div className={`py-1 rounded-lg transition-colors ${orderState === 'LOCKED' ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-500/40' : 'text-slate-400 dark:text-slate-500'}`}>
          2. ESCROW LOCKED
        </div>
        <div className={`py-1 rounded-lg transition-colors ${orderState === 'MATCHED' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40' : 'text-slate-400 dark:text-slate-500'}`}>
          3. MATCHED
        </div>
      </div>

      {/* Inputs & Quote Calculation */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">USDT Amount</span>
          <div className="flex gap-1">
            {['100', '250', '500'].map((val) => (
              <button
                key={val}
                onClick={() => setUsdtAmount(val)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${usdtAmount === val ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                ${val}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800">
          <input
            type="number"
            value={usdtAmount}
            onChange={(e) => setUsdtAmount(e.target.value)}
            className="bg-transparent text-base font-black text-slate-900 dark:text-white w-full outline-none font-mono"
          />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">USDT</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
          <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
            <span>Locked Rate</span>
            <span className="text-slate-900 dark:text-white font-mono font-medium">₹84.25 / USDT</span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
            <span>P2P Fee (0.2%)</span>
            <span className="text-purple-600 dark:text-purple-400 font-mono font-medium">₹{feeInr}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1.5 border-t border-slate-200 dark:border-slate-800">
            <span>Guaranteed Net INR</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm font-mono">₹{netInr}</span>
          </div>
        </div>
      </div>

      {/* State Transition Simulation Button */}
      <button
        onClick={handleNextState}
        className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white cursor-pointer transition-all shadow-md flex items-center justify-center gap-1.5"
      >
        {orderState === 'QUOTED' && 'Lock Quote & Assign Merchant →'}
        {orderState === 'LOCKED' && 'Simulate Merchant Acceptance →'}
        {orderState === 'MATCHED' && 'Reset State Machine ↺'}
      </button>
    </div>
  )
}

function QRScanPreview() {
  const [payConfirmed, setPayConfirmed] = useState(false)

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl relative overflow-hidden space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Mock UPI QR Camera Viewfinder</span>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          Parser Active
        </span>
      </div>

      {/* Camera Viewfinder Frame */}
      <div className="relative h-36 rounded-2xl bg-slate-900 dark:bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
        {/* Animated Green Scanning Laser */}
        <motion.div
          animate={{ top: ['10%', '80%', '10%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399]"
        />

        {/* Viewfinder Corners */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

        <div className="text-center p-3">
          <QrCode className="w-12 h-12 text-slate-500 mx-auto mb-1 opacity-60" />
          <p className="text-[10px] font-mono text-emerald-400 font-bold">Scanning UPI QR Payload...</p>
        </div>
      </div>

      {/* Beneficiary Resolution Card */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px]">
              ✓
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-xs">Swiggy India Pvt Ltd</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">swiggy@hdfcbank</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Verified</span>
        </div>

        <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-slate-200 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Payment Quote: ₹350.00</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">4.15 USDT</span>
        </div>
      </div>

      {!payConfirmed ? (
        <button
          onClick={() => setPayConfirmed(true)}
          className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-all shadow-md flex items-center justify-center gap-1.5"
        >
          Confirm Escrow Lock & Pay →
        </button>
      ) : (
        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Settled (#TX-99218)
          </span>
          <button onClick={() => setPayConfirmed(false)} className="text-[9px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline cursor-pointer">Reset</button>
        </div>
      )}
    </div>
  )
}

function WalletSpendPreview() {
  const [netTab, setNetTab] = useState<'TRC20' | 'ERC20' | 'POLYGON'>('TRC20')

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl relative overflow-hidden space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Ledger Balance Explorer</span>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
          Decimal Safe
        </span>
      </div>

      {/* 3 Balances Side by Side */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-emerald-500/30">
          <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">Available</p>
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">1,284.50</p>
          <p className="text-[8px] text-slate-400 dark:text-slate-500">USDT</p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-amber-500/30">
          <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">Escrow Locked</p>
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5 font-mono">75.00</p>
          <p className="text-[8px] text-slate-400 dark:text-slate-500">USDT</p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-indigo-500/30">
          <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total Portfolio</p>
          <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 font-mono">1,359.50</p>
          <p className="text-[8px] text-slate-400 dark:text-slate-500">USDT</p>
        </div>
      </div>

      {/* Network Selector & Confirmation Counter */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-500 dark:text-slate-400">Select Network:</span>
          <div className="flex gap-1">
            {(['TRC20', 'ERC20', 'POLYGON'] as const).map((net) => (
              <button
                key={net}
                onClick={() => setNetTab(net)}
                className={`text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer ${netTab === net ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
              >
                {net}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[10px]">
          <span className="text-slate-700 dark:text-slate-300 truncate">Address: TRX92f8k...4a12</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">12/12 Confirms ✓</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Link to="/customer/wallet" className="w-full">
          <Button size="sm" className="w-full rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md">
            View Full Ledger →
          </Button>
        </Link>
      </div>
    </div>
  )
}

function MerchantBookPreview() {
  const [accepted, setAccepted] = useState(false)
  const [utrVerified, setUtrVerified] = useState(false)

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl relative overflow-hidden space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Merchant P2P Order Desk</span>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
          0.15% Commission
        </span>
      </div>

      {/* Active Order Card */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-bold text-slate-900 dark:text-white text-xs">Order #ORD-9982</span>
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
            utrVerified ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : accepted ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400' : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
          }`}>
            {utrVerified ? 'Settled ✓' : accepted ? 'Awaiting Buyer Proof' : 'Open Matching'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
          <div>
            <p>Sell Volume</p>
            <p className="font-bold text-slate-900 dark:text-white font-mono">250.00 USDT</p>
          </div>
          <div>
            <p>INR Value</p>
            <p className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">₹21,062.50</p>
          </div>
        </div>

        {accepted && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] space-y-1">
            <p className="text-slate-500 dark:text-slate-400">Buyer Submitted UTR: <span className="font-mono text-slate-900 dark:text-white font-bold">4291049281</span></p>
          </div>
        )}
      </div>

      {/* Interactive Action Steps */}
      {!accepted ? (
        <button
          onClick={() => setAccepted(true)}
          className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white cursor-pointer transition-all shadow-md"
        >
          Accept Order & Lock Escrow →
        </button>
      ) : !utrVerified ? (
        <button
          onClick={() => setUtrVerified(true)}
          className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-all shadow-md"
        >
          Verify UTR & Release USDT →
        </button>
      ) : (
        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-between">
          <span>Earned Commission: +₹31.50</span>
          <button onClick={() => { setAccepted(false); setUtrVerified(false) }} className="text-[9px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline cursor-pointer">Reset Demo</button>
        </div>
      )}
    </div>
  )
}

function HeroDesk() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-white/90 dark:bg-[#121829]/90 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xl dark:shadow-[0_40px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Interactive preview · simulated</p>
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">Live mock</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="sm:col-span-1 p-4 bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Wallet</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white font-mono">1,284.50</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">USDT available</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Locked 75.00 · est. ₹1,08,219</p>
        </Card>
        {prices.map((p) => (
          <Card key={p.symbol} className="p-4 bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{p.name}</p>
            <p className="mt-1 font-bold text-slate-900 dark:text-white">{p.symbol}</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">₹ {p.inr}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">{p.change}</p>
          </Card>
        ))}
      </div>
      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activity}>
            <defs>
              <linearGradient id="fillA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B7CFF" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#8B7CFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" hide />
            <Tooltip
              contentStyle={{
                background: 'var(--nx-surface)',
                color: 'var(--nx-text)',
                border: '1px solid var(--nx-line)',
                borderRadius: '12px',
                fontSize: '12px'
              }}
            />
            <Area type="monotone" dataKey="v" stroke="#43E6B2" fill="url(#fillA)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
        {['Buy', 'Sell', 'Send', 'QR pay'].map((a) => (
          <div key={a} className="rounded-xl bg-slate-100 dark:bg-slate-800/60 py-2 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-800">
            {a}
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {[
          ['Mock deposit', '+250 USDT', 'Completed'],
          ['P2P sell lock', '75 USDT', 'Funds locked'],
        ].map(([t, a, s]) => (
          <div key={t} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-xs border border-slate-200 dark:border-slate-800">
            <span className="font-semibold text-slate-800 dark:text-slate-200">{t}</span>
            <span className="text-slate-600 dark:text-slate-400 font-mono">{a}</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{s}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function OneDeskShowcase() {
  const [activeTab, setActiveTab] = useState(0)

  // Interactive Live Mock States for Tab 0: Wallet
  const [activeAsset, setActiveAsset] = useState<'USDT' | 'BTC' | 'ETH' | 'INR'>('USDT')
  const [activeNetwork, setActiveNetwork] = useState<'TRC-20' | 'ERC-20' | 'Polygon'>('TRC-20')
  const [copiedAddr, setCopiedAddr] = useState(false)
  const [txFilter, setTxFilter] = useState<'All' | 'Deposits' | 'Locks'>('All')

  // Interactive Live Mock States for Tab 1: Buy & Sell
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('SELL')
  const [calcAmount, setCalcAmount] = useState('100')

  // Interactive Live Mock States for Tab 2: Pay by QR
  const [qrId, setQrId] = useState('zomato@icici')
  const [payAmountInr, setPayAmountInr] = useState('450')
  const [isPaying, setIsPaying] = useState(false)
  const [paymentReceipt, setPaymentReceipt] = useState<{
    txId: string
    vpa: string
    inr: string
    usdt: string
    timestamp: string
  } | null>(null)

  // Interactive Live Mock States for Tab 3: Lifestyle & Utility
  const [lifestyleCat, setLifestyleCat] = useState<'GIFT' | 'RECHARGE' | 'BILLS'>('GIFT')
  const [selectedBrand, setSelectedBrand] = useState('Amazon Pay')
  const [selectedDenom, setSelectedDenom] = useState(1000)
  const [generatedVoucher, setGeneratedVoucher] = useState<string | null>(null)

  const handleCopyAddress = () => {
    setCopiedAddr(true)
    setTimeout(() => setCopiedAddr(false), 2000)
  }

  const handleSimulatePayment = () => {
    setIsPaying(true)
    setPaymentReceipt(null)
    setTimeout(() => {
      setIsPaying(false)
      const usdt = (Number(payAmountInr) / 84.25).toFixed(2)
      setPaymentReceipt({
        txId: `TX-QR${Math.floor(100000 + Math.random() * 900000)}`,
        vpa: qrId,
        inr: payAmountInr,
        usdt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      })
    }, 800)
  }

  const handleBuyVoucher = () => {
    const randomCode = `${selectedBrand.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}-FUSION-${Math.floor(10 + Math.random() * 90)}`
    setGeneratedVoucher(randomCode)
  }

  const tabs = [
    {
      id: 'wallet',
      icon: Wallet,
      title: 'Digital Wallet',
      desc: 'Available, locked, and total balances with address books & ledger audit.',
      badge: 'Multi-Currency',
      color: 'from-indigo-500 via-purple-500 to-pink-500',
      badgeBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
    },
    {
      id: 'buysell',
      icon: Zap,
      title: 'Buy & Sell P2P',
      desc: 'Server-quoted pairs, fee breakdowns, and automated merchant matching.',
      badge: '< 60s Escrow',
      color: 'from-purple-500 via-indigo-500 to-emerald-500',
      badgeBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25',
    },
    {
      id: 'qrpay',
      icon: QrCode,
      title: 'Pay by QR',
      desc: 'Mock UPI parser, instant rate quote, and double-confirmation checkout.',
      badge: 'UPI & IMPS',
      color: 'from-emerald-500 via-teal-500 to-cyan-500',
      badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    },
    {
      id: 'lifestyle',
      icon: Sparkles,
      title: 'Lifestyle Rails',
      desc: 'Gift cards, recharge, and utility bills through mock PSP providers.',
      badge: 'Catalog Ready',
      color: 'from-amber-500 via-orange-500 to-rose-500',
      badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
    },
  ]

  // Asset mock data mapping
  const assetData = {
    USDT: { total: '₹ 1,08,219.50', available: '1,284.50 USDT', locked: '75.00 USDT', eq: '₹ 1,08,219 eq.', addr: 'TRX92f8kL1m3n9Qp042a12Xz' },
    BTC: { total: '₹ 2,84,500.00', available: '0.0450 BTC', locked: '0.0050 BTC', eq: '₹ 2,84,500 eq.', addr: 'bc1q92f8kl1m3n9qp042a12xz' },
    ETH: { total: '₹ 2,12,000.00', available: '0.8500 ETH', locked: '0.0000 ETH', eq: '₹ 2,12,000 eq.', addr: '0x92f8kL1m3n9Qp042a12Xz' },
    INR: { total: '₹ 1,50,000.00', available: '₹ 1,35,000.00', locked: '₹ 15,000.00', eq: 'Bank Account', addr: 'VPA: fundfusion@yesbank' },
  }

  const walletTxs = [
    { type: 'Deposit', title: 'USDT Deposit (TRC20)', hash: '0x92f...4a12', amount: '+250.00 USDT', status: 'Completed', isLock: false },
    { type: 'Lock', title: 'P2P Sell Lock', hash: 'ORD #8921', amount: '-75.00 USDT', status: 'Escrow Locked', isLock: true },
    { type: 'QR', title: 'QR Payment (Zomato)', hash: 'TX #9982', amount: '-5.34 USDT', status: 'Settled', isLock: false },
  ]

  const filteredWalletTxs = walletTxs.filter((tx) => {
    if (txFilter === 'Deposits') return !tx.isLock
    if (txFilter === 'Locks') return tx.isLock
    return true
  })

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold tracking-widest uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25 backdrop-blur-md shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> ALL-IN-ONE FINTECH SUITE
        </span>
        <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
          One desk for every money move
        </h2>
        <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
          Explore interactive live preview modules: wallet management, P2P order matching, QR pay, and lifestyle catalog.
        </p>
      </div>

      {/* 4 Feature Desk Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon
          const isActive = activeTab === idx
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(idx)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative text-left p-5 rounded-3xl transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-xl ${
                isActive
                  ? 'bg-white dark:bg-[#151c30] border-2 border-indigo-500 shadow-xl dark:shadow-[0_15px_35px_rgba(99,102,241,0.25)] ring-2 ring-indigo-500/20'
                  : 'bg-white/70 dark:bg-[#121829]/70 border border-slate-200/80 dark:border-slate-800/80 hover:bg-white dark:hover:bg-[#151c30]/90 shadow-xs'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeDeskGlow"
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tab.color}`}
                />
              )}

              <div className="flex items-center justify-between mb-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 ${
                    isActive
                      ? `bg-gradient-to-br ${tab.color} text-white shadow-md`
                      : 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tab.badgeBg}`}>
                  {tab.badge}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white">{tab.title}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {tab.desc}
              </p>
            </motion.button>
          )
        })}
      </div>

      {/* Interactive Mock Data Showcase Container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl bg-white/90 dark:bg-[#121829]/90 border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-8 backdrop-blur-2xl shadow-xl dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)] relative overflow-hidden"
        >
          {/* TAB 0: Digital Wallet Interactive Showcase */}
          {activeTab === 0 && (
            <div className="grid gap-6 lg:grid-cols-12 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  <Wallet className="w-3 h-3" /> Digital Ledger Wallet
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  Available vs. Escrow Locked Balances
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Real-time multi-currency ledger displaying exact available funds, escrow locked P2P trades, and address book deposits with zero-float decimal precision.
                </p>

                {/* Asset Selector Pills */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Wallet Asset:</p>
                  <div className="flex gap-2">
                    {(['USDT', 'BTC', 'ETH', 'INR'] as const).map((ast) => (
                      <button
                        key={ast}
                        onClick={() => setActiveAsset(ast)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          activeAsset === ast
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {ast}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Link to="/customer/wallet">
                    <Button size="sm" className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md">
                      Open Wallet Desk <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Mock Interactive Wallet Screen */}
              <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-5 sm:p-6 shadow-xl dark:shadow-2xl relative overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4 mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Portfolio Value</p>
                    <motion.p
                      key={activeAsset}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-0.5 font-mono"
                    >
                      {assetData[activeAsset].total}
                    </motion.p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" /> Live Ledger Sync
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Available Balance</p>
                    <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 font-mono">{assetData[activeAsset].available}</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">{assetData[activeAsset].eq}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Escrow Locked</p>
                    <p className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5 font-mono">{assetData[activeAsset].locked}</p>
                    <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-semibold mt-0.5">P2P Lock #ORD-8921</p>
                  </div>
                </div>

                {/* Address Generator Preview */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Deposit Address ({activeAsset})</span>
                    <div className="flex gap-1.5">
                      {(['TRC-20', 'ERC-20', 'Polygon'] as const).map((net) => (
                        <button
                          key={net}
                          onClick={() => setActiveNetwork(net)}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${
                            activeNetwork === net ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {net}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs">
                    <span className="text-slate-800 dark:text-slate-300 truncate text-[11px]">{assetData[activeAsset].addr}</span>
                    <button
                      onClick={handleCopyAddress}
                      className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedAddr ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedAddr ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Recent Ledger Audit Trail */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recent Ledger Activity</p>
                    <div className="flex gap-1">
                      {(['All', 'Deposits', 'Locks'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setTxFilter(f)}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full cursor-pointer ${
                            txFilter === f ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {filteredWalletTxs.map((tx) => (
                      <div key={tx.title} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] ${
                            tx.isLock ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {tx.isLock ? '🔒' : '↓'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-[11px]">{tx.title}</p>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400">{tx.hash}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono font-bold text-[11px] ${tx.isLock ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{tx.amount}</p>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400">{tx.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: Buy & Sell P2P Interactive Calculator */}
          {activeTab === 1 && (
            <div className="grid gap-6 lg:grid-cols-12 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25">
                  <Zap className="w-3 h-3" /> P2P Quote & Matching Engine
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  Server Quoted P2P Matching Desk
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Real-time USDT ⇄ INR exchange rates, transparent 0.2% P2P escrow fee breakdown, and instant matching with verified online merchants.
                </p>

                {/* Trade Mode Toggle */}
                <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 w-fit">
                  <button
                    onClick={() => setTradeType('SELL')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      tradeType === 'SELL' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Sell USDT for INR
                  </button>
                  <button
                    onClick={() => setTradeType('BUY')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      tradeType === 'BUY' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Buy USDT with INR
                  </button>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Link to="/customer/buy">
                    <Button size="sm" className="rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md">
                      Open Trade Desk <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Interactive Mock Rate Calculator & Merchant Card */}
              <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-5 sm:p-6 shadow-xl dark:shadow-2xl relative overflow-hidden border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Live Server Rate Quote</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30">
                    1 USDT = ₹84.25 INR
                  </span>
                </div>

                {/* Amount Input with Quick Presets */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {tradeType === 'SELL' ? 'You Sell (USDT)' : 'You Pay (INR)'}
                    </label>
                    <div className="flex gap-1">
                      {['50', '100', '500', '1000'].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setCalcAmount(amt)}
                          className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          +${amt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 focus-within:border-purple-500 transition-colors">
                    <input
                      type="number"
                      value={calcAmount}
                      onChange={(e) => setCalcAmount(e.target.value)}
                      className="bg-transparent text-xl font-black text-slate-900 dark:text-white w-full outline-none font-mono"
                      placeholder="Enter Amount"
                    />
                    <span className="px-3 py-1 rounded-lg bg-purple-600 text-white font-black text-xs">
                      {tradeType === 'SELL' ? 'USDT' : 'INR'}
                    </span>
                  </div>
                </div>

                {/* Live Breakdown Line Items */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                    <span>Spot Conversion Rate</span>
                    <span className="text-slate-900 dark:text-white font-mono font-semibold">₹84.25 / USDT</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                    <span>P2P Escrow Fee (0.2%)</span>
                    <span className="text-purple-600 dark:text-purple-400 font-mono font-semibold">
                      ₹{(Number(calcAmount || 0) * 84.25 * 0.002).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <span>{tradeType === 'SELL' ? 'Net INR You Receive' : 'Total USDT You Receive'}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black text-base font-mono">
                      {tradeType === 'SELL'
                        ? `₹${(Number(calcAmount || 0) * 84.25 * 0.998).toFixed(2)}`
                        : `${(Number(calcAmount || 0) / 84.25).toFixed(2)} USDT`}
                    </span>
                  </div>
                </div>

                {/* Matched Merchant Preview Card */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                      KT
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-900 dark:text-white text-xs">Karan_Traders99</p>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">99.8% Completed · ~45s avg release</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      14 Merchants Online
                    </span>
                  </div>
                </div>

                <Link to="/customer/buy" className="block">
                  <Button className="w-full rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-5 shadow-lg shadow-purple-600/25">
                    Match Merchant & Execute Trade →
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* TAB 2: Pay by QR Interactive Simulator */}
          {activeTab === 2 && (
            <div className="grid gap-6 lg:grid-cols-12 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  <QrCode className="w-3 h-3" /> Mock UPI QR Parser
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  Pay Any UPI QR with Crypto Balance
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Type or scan any merchant UPI VPA. Instant crypto-to-INR conversion quotes, double-confirmation checkout, and verified receipt generation.
                </p>

                {/* Sample VPA Presets */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sample Merchant QR Presets:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Zomato', vpa: 'zomato@icici' },
                      { label: 'Swiggy', vpa: 'swiggy@hdfcbank' },
                      { label: 'Paytm', vpa: 'paytm-merchant@upi' },
                      { label: 'Starbucks', vpa: 'starbucks@axisbank' },
                    ].map((p) => (
                      <button
                        key={p.vpa}
                        onClick={() => {
                          setQrId(p.vpa)
                          setPaymentReceipt(null)
                        }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer transition-all ${
                          qrId === p.vpa
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Link to="/customer/pay">
                    <Button size="sm" className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md">
                      Try QR Pay Desk <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Interactive Mock QR Simulator Box */}
              <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-5 sm:p-6 shadow-xl dark:shadow-2xl relative overflow-hidden border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-300">Mock UPI QR Parser</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Beneficiary Verified
                  </span>
                </div>

                {/* VPA Input */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Target UPI VPA</label>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                    <input
                      type="text"
                      value={qrId}
                      onChange={(e) => {
                        setQrId(e.target.value)
                        setPaymentReceipt(null)
                      }}
                      className="bg-transparent text-sm font-bold text-slate-900 dark:text-white w-full outline-none font-mono"
                      placeholder="Enter UPI VPA"
                    />
                    <span className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">UPI</span>
                  </div>
                </div>

                {/* INR Pay Input & USDT Quote */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">Amount (INR)</label>
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        value={payAmountInr}
                        onChange={(e) => {
                          setPayAmountInr(e.target.value)
                          setPaymentReceipt(null)
                        }}
                        className="bg-transparent text-base font-black text-slate-900 dark:text-white w-full outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">Est. USDT Deducted</label>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800 text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      ~{(Number(payAmountInr || 0) / 84.25).toFixed(2)} USDT
                    </div>
                  </div>
                </div>

                {/* Payment Simulation Action & Receipt Card */}
                {!paymentReceipt ? (
                  <Button
                    onClick={handleSimulatePayment}
                    disabled={isPaying}
                    className="w-full rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-5 shadow-lg shadow-emerald-600/25 cursor-pointer"
                  >
                    {isPaying ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Verifying & Locking Escrow...
                      </span>
                    ) : (
                      `Simulate Instant Payment of ₹${payAmountInr} →`
                    )}
                  </Button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                        <CheckCircle2 className="w-4 h-4" /> Payment Successful
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{paymentReceipt.timestamp}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Transaction ID</p>
                        <p className="font-mono font-bold text-slate-900 dark:text-white">{paymentReceipt.txId}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Beneficiary VPA</p>
                        <p className="font-mono font-bold text-slate-900 dark:text-white truncate">{paymentReceipt.vpa}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">INR Paid</p>
                        <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{paymentReceipt.inr}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">USDT Debited</p>
                        <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{paymentReceipt.usdt} USDT</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setPaymentReceipt(null)}
                      className="w-full mt-2 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-500/30 cursor-pointer text-center"
                    >
                      Simulate Another QR Payment
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Lifestyle & Utility Rails Interactive Showcase */}
          {activeTab === 3 && (
            <div className="grid gap-6 lg:grid-cols-12 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                  <Sparkles className="w-3 h-3" /> Lifestyle & Utility PSP
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  Gift Cards, Mobile Recharge & Utility Bills
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Purchase instant digital gift vouchers or pay electricity and telecom bills directly using your USDT balance with zero markup.
                </p>

                {/* Sub-category Pills */}
                <div className="flex gap-2">
                  {[
                    { id: 'GIFT', label: 'Gift Cards' },
                    { id: 'RECHARGE', label: 'Recharge' },
                    { id: 'BILLS', label: 'Utility Bills' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setLifestyleCat(cat.id as any)
                        setGeneratedVoucher(null)
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        lifestyleCat === cat.id
                          ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Link to="/customer/gift-cards">
                    <Button size="sm" className="rounded-xl font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md">
                      Browse Full Catalog <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Interactive Gift Card / PSP Catalog Box */}
              <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-5 sm:p-6 shadow-xl dark:shadow-2xl relative overflow-hidden border border-slate-200 dark:border-slate-800 space-y-4">
                {lifestyleCat === 'GIFT' && (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-300">Instant Gift Voucher Catalog</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                        Instant Delivery
                      </span>
                    </div>

                    {/* Brand Selector Grid */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Select Brand:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {['Amazon Pay', 'Flipkart', 'Zomato', 'Swiggy', 'BookMyShow', 'MakeMyTrip'].map((brand) => (
                          <button
                            key={brand}
                            onClick={() => {
                              setSelectedBrand(brand)
                              setGeneratedVoucher(null)
                            }}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                              selectedBrand === brand
                                ? 'bg-amber-500/20 border-amber-500 text-slate-900 dark:text-white font-bold shadow-md'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <p className="text-xs font-bold truncate">{brand}</p>
                            <p className="text-[9px] text-amber-600 dark:text-amber-400/80 mt-0.5">Voucher</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Denomination Buttons */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Select Denomination:</p>
                      <div className="flex gap-2">
                        {[250, 500, 1000, 2500, 5000].map((denom) => (
                          <button
                            key={denom}
                            onClick={() => {
                              setSelectedDenom(denom)
                              setGeneratedVoucher(null)
                            }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                              selectedDenom === denom
                                ? 'bg-amber-600 text-white border-amber-500'
                                : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            ₹{denom}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quote display */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{selectedBrand} Voucher</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Value: ₹{selectedDenom.toLocaleString('en-IN')}</p>
                      </div>
                      <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                        ~{(selectedDenom / 84.25).toFixed(2)} USDT
                      </span>
                    </div>

                    {!generatedVoucher ? (
                      <Button
                        onClick={handleBuyVoucher}
                        className="w-full rounded-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white py-5 shadow-lg shadow-amber-600/25 cursor-pointer"
                      >
                        Generate Mock {selectedBrand} Code →
                      </Button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs space-y-2 text-center"
                      >
                        <p className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Your Digital Voucher Code</p>
                        <p className="font-mono font-black text-lg text-slate-900 dark:text-white tracking-wider select-all">{generatedVoucher}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Valid for 12 Months · Instant Mock Delivery</p>
                      </motion.div>
                    )}
                  </>
                )}

                {lifestyleCat === 'RECHARGE' && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-300">Mobile 5G Recharge</span>
                    <div className="grid grid-cols-3 gap-2">
                      {['Airtel 5G', 'Jio 5G', 'Vi Max'].map((op) => (
                        <div key={op} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{op}</p>
                          <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Prepaid / Postpaid</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                        <span>Popular Plan: Unlimited 5G</span>
                        <span className="text-amber-600 dark:text-amber-400">₹666 (7.90 USDT)</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">84 Days Validity · 2GB/day Data + Unlimited Calls</p>
                    </div>
                    <Link to="/customer/gift-cards">
                      <Button className="w-full rounded-xl font-bold bg-amber-600 hover:bg-amber-500 text-white py-4 mt-2">
                        Execute Mobile Recharge →
                      </Button>
                    </Link>
                  </div>
                )}

                {lifestyleCat === 'BILLS' && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-300">Utility Bill Payments</span>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">BESCOM Electricity Bill</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Consumer ID: 99482710492</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400">
                          Due: 15 Oct
                        </span>
                      </div>
                      <div className="flex justify-between font-mono font-bold border-t border-slate-200 dark:border-slate-800 pt-2 text-sm">
                        <span>Bill Amount</span>
                        <span className="text-amber-600 dark:text-amber-400">₹1,240.00 (~14.71 USDT)</span>
                      </div>
                    </div>
                    <Link to="/customer/gift-cards">
                      <Button className="w-full rounded-xl font-bold bg-amber-600 hover:bg-amber-500 text-white py-4">
                        Pay Utility Bill Now →
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

function InteractiveHowItWorks() {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      number: '01',
      title: 'Create an Account',
      subtitle: 'Instant onboarding with role-based access control',
      desc: 'Sign up with your email and password. Choose your desk role — Customer for trading & spending, Merchant for fulfilling P2P orders, or Admin for platform governance.',
      Icon: UserPlus,
      color: 'from-indigo-500 to-purple-600',
      badgeBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      preview: (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Account Role Desk Selection</span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">Email Verified ✓</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-bold">
              Customer Desk
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              Merchant Desk
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              Admin Desk
            </div>
          </div>
        </div>
      ),
    },
    {
      number: '02',
      title: 'Fund a Simulated Wallet',
      subtitle: 'Zero-float ledger with multi-network address generation',
      desc: 'Generate a mock TRC20, ERC20, or Polygon deposit address, or receive internal zero-fee ledger transfers with continuous real-time balance sync.',
      Icon: Wallet,
      color: 'from-purple-500 to-pink-600',
      badgeBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
      preview: (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Mock Deposit Address</span>
            <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/30">TRC-20 Network</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-mono">
            <span className="text-slate-700 dark:text-slate-300 truncate">TRX92f8kL1m3n9Qp042a12Xz</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] shrink-0">12 Confirms ✓</span>
          </div>
        </div>
      ),
    },
    {
      number: '03',
      title: 'Lock, Match & Confirm',
      subtitle: 'Automated escrow state machine & merchant order desk',
      desc: 'Creating an order automatically freezes required available funds in trade escrow. Verified merchants accept orders and buyer payment proof is reviewed.',
      Icon: Lock,
      color: 'from-pink-500 to-emerald-600',
      badgeBg: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',
      preview: (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Escrow State Machine</span>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">Order #ORD-9982</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-center">
            <div className="py-1 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">1. QUOTED</div>
            <div className="py-1 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">2. LOCKED</div>
            <div className="py-1 rounded text-slate-400">3. MATCHED</div>
          </div>
        </div>
      ),
    },
    {
      number: '04',
      title: 'Spend or Settle',
      subtitle: 'Instant QR payments, gift vouchers & ledger release',
      desc: 'Use your USDT balance to pay any UPI QR code, generate digital gift vouchers for top brands, or complete merchant bank settlements.',
      Icon: CheckCircle2,
      color: 'from-emerald-500 to-teal-600',
      badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      preview: (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200">Instant Settlement Complete</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded text-[10px]">TX #99218</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Zomato UPI QR Pay</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">4.15 USDT (₹350.00)</span>
          </div>
        </div>
      ),
    },
  ]

  const nextStep = () => {
    setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : 0))
  }

  const prevStep = () => {
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : steps.length - 1))
  }

  const current = steps[currentStep]
  const IconComp = current.Icon

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20">
      <div className="text-center max-w-xl mx-auto mb-10">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold tracking-widest uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> STREAMLINED WORKFLOW
        </span>
        <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
          How FundFusion Works
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          From registration to instant ledger settlement in 4 transparent steps.
        </p>
      </div>

      {/* Unified Step Wizard Box Container */}
      <div className="rounded-3xl bg-white/90 dark:bg-[#121829]/90 border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-8 backdrop-blur-2xl shadow-xl dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)] relative overflow-hidden space-y-6">
        
        {/* Step Navigation Pills Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-6">
          {steps.map((s, idx) => (
            <button
              key={s.number}
              onClick={() => setCurrentStep(idx)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                currentStep === idx
                  ? 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500 text-slate-900 dark:text-white shadow-md'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                  currentStep === idx ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {s.number}
                </span>
                {currentStep === idx && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                )}
              </div>
              <p className="text-xs font-bold truncate">{s.title}</p>
            </button>
          ))}
        </div>

        {/* Animated Step Card Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="grid gap-6 lg:grid-cols-12 items-center min-h-[200px]"
          >
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${current.color} text-white flex items-center justify-center shadow-md shrink-0`}>
                  <IconComp className="w-6 h-6" />
                </div>
                <div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black border ${current.badgeBg}`}>
                    STEP {current.number} OF 04
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {current.title}
                  </h3>
                </div>
              </div>

              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {current.subtitle}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {current.desc}
              </p>
            </div>

            <div className="lg:col-span-5">
              {current.preview}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Bottom Interactive Navigation Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800/80">
          <button
            onClick={prevStep}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <ChevronRight className="w-4 h-4 rotate-180" /> Previous
          </button>

          {/* Dots Indicator */}
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentStep === i ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={nextStep}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all hover:scale-105"
          >
            <span>Next Step</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
