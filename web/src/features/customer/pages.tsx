import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useState, useEffect } from 'react'
import {
  QrCode,
  Zap,
  TrendingUp,
  Wallet,
  Plus,
  Smartphone,
  Gift,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Send,
  Navigation,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { activity } from '@/lib/demo-data'
import { cn, inr, usdt } from '@/lib/utils'

type Overview = {
  simulated: boolean
  usdtInrRate: string
  wallet: { availableUsdt: string; lockedUsdt: string; totalUsdt: string; inrEstimate: string }
  totals: { transactions: number }
  recent: { id: string; type: string; status: string; amount: string; asset: string; createdAt: string }[]
}

export function CustomerDashboard() {
  const q = useQuery({
    queryKey: ['overview'],
    queryFn: () => api<Overview>('/customer/overview'),
  })

  // 5 Promo Banner Slides matching Reference Images 1-5
  const slides = [
    {
      id: 'slide-1',
      title: '0% Account Freeze',
      subtitle: '100% Refund Guarantee',
      btnText: 'Safe Trade',
      link: '/customer/buy',
      bgClass: 'bg-gradient-to-r from-[#ca233a] via-[#e11d48] to-[#f43f5e]',
      btnTextClass: 'text-[#e11d48]',
    },
    {
      id: 'slide-2',
      title: 'Refer & Earn',
      subtitle: 'Invite friends, earn on their trades',
      btnText: 'Invite Now',
      link: '/customer/referrals',
      bgClass: 'bg-gradient-to-r from-[#3f7c16] via-[#4d971a] to-[#70c72c]',
      btnTextClass: 'text-[#4d971a]',
    },
    {
      id: 'slide-3',
      title: 'Guaranteed Cashback',
      subtitle: 'On each P2P Sell & Buy Order',
      btnText: 'Trade Now',
      link: '/customer/sell',
      bgClass: 'bg-gradient-to-r from-[#2f55e5] via-[#3b61f8] to-[#5b7cf9]',
      btnTextClass: 'text-[#3b61f8]',
    },
    {
      id: 'slide-4',
      title: 'Instant Mobile Recharge',
      subtitle: 'Every operator, done in seconds',
      btnText: 'Recharge Now',
      link: '/customer/utilities',
      bgClass: 'bg-gradient-to-r from-[#1b526b] via-[#246d8e] to-[#3aa1c8]',
      btnTextClass: 'text-[#246d8e]',
    },
    {
      id: 'slide-5',
      title: 'My Wallet',
      subtitle: 'Add money & withdraw easily',
      btnText: 'Open Wallet',
      link: '/customer/wallet',
      bgClass: 'bg-gradient-to-r from-[#a36109] via-[#c4770d] to-[#e69818]',
      btnTextClass: 'text-[#c4770d]',
    },
  ]

  const [activeSlide, setActiveSlide] = useState(0)

  // Auto-slide every 3.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length)
    }, 3500)
    return () => clearInterval(timer)
  }, [slides.length])

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (q.error) {
    return <p className="text-rose-500 p-4 text-xs font-bold bg-rose-500/10 rounded-2xl border border-rose-500/20">{q.error.message}</p>
  }

  const d = q.data!
  const rawAvailable = parseFloat(d.wallet.availableUsdt || '0')
  const availableVal = isNaN(rawAvailable)
    ? '0.00'
    : rawAvailable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const currentBanner = slides[activeSlide]

  return (
    <div className="space-y-3.5 max-w-lg mx-auto pb-4 w-full overflow-x-hidden min-w-0">
      {/* 1. Hero QR Scanner Card (Matching Reference Scanner Image) */}
      <div className="rounded-[32px] bg-gradient-to-b from-[#3b59f8] via-[#2f46e5] to-[#2538b3] text-white p-5 pt-6 relative overflow-hidden shadow-xl shadow-blue-600/30 space-y-4">
        {/* Subtle Decorative Background Icons */}
        <div className="absolute top-3 right-4 text-white/10 font-mono text-4xl font-black select-none pointer-events-none">$</div>
        <div className="absolute top-4 left-3 text-white/10 font-mono text-3xl font-black select-none pointer-events-none">₹</div>
        <div className="absolute bottom-16 left-4 text-white/10 font-mono text-3xl font-black select-none pointer-events-none">$</div>

        {/* Center Scanner Viewfinder Container */}
        <div className="relative py-2 px-4 flex flex-col items-center justify-center min-h-[160px]">
          <Link to="/customer/pay/scan" className="relative group cursor-pointer w-full max-w-[220px] flex flex-col items-center py-4">
            {/* Curved Lime Green Corner Brackets with Pulse Glow */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#bbf225] rounded-tl-2xl shadow-[0_0_12px_rgba(187,242,37,0.7)] animate-pulse" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#bbf225] rounded-tr-2xl shadow-[0_0_12px_rgba(187,242,37,0.7)] animate-pulse" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#bbf225] rounded-bl-2xl shadow-[0_0_12px_rgba(187,242,37,0.7)] animate-pulse" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#bbf225] rounded-br-2xl shadow-[0_0_12px_rgba(187,242,37,0.7)] animate-pulse" />

            {/* Animated Laser Scanning Line */}
            <div className="absolute left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-transparent via-[#bbf225] to-transparent shadow-[0_0_12px_#bbf225] animate-scan-beam pointer-events-none" />

            {/* Stylized QR Code Element matching Reference Image */}
            <div className="relative flex flex-col items-center justify-center space-y-1.5 my-1 group-hover:scale-105 transition-transform duration-300">
              {/* Top Row Rounded Squares */}
              <div className="flex items-center gap-4 text-white/80 font-black tracking-widest text-lg">
                <span className="w-6 h-6 rounded-lg border-2 border-white/90 flex items-center justify-center">
                  <span className="w-2.5 h-2.5 bg-white/90 rounded-sm" />
                </span>
                <span className="w-6 h-6 rounded-lg border-2 border-white/90 flex items-center justify-center">
                  <span className="w-2.5 h-2.5 bg-white/90 rounded-sm" />
                </span>
              </div>

              {/* Floating Dark Glass Pill: Tap to scan with pulse ring */}
              <div className="relative my-0.5">
                <span className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-30 pointer-events-none" />
                <div className="relative bg-[#1c2d82]/90 backdrop-blur-md text-white font-extrabold text-[11px] px-4 py-1 rounded-full border border-white/30 shadow-lg tracking-tight z-10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#bbf225] animate-pulse" />
                  <span>Tap to scan</span>
                </div>
              </div>

              {/* Bottom Row Rounded Squares & Dots */}
              <div className="flex items-center gap-4 text-white/80 font-black tracking-widest text-lg">
                <span className="w-6 h-6 rounded-lg border-2 border-white/90 flex items-center justify-center">
                  <span className="w-2.5 h-2.5 bg-white/90 rounded-sm" />
                </span>
                <span className="w-6 h-6 rounded-lg border-2 border-white/90 flex items-center justify-center relative">
                  <span className="w-1.5 h-1.5 bg-white/90 rounded-full absolute -top-0.5 -right-0.5" />
                  <span className="w-1.5 h-1.5 bg-white/90 rounded-full" />
                </span>
              </div>
            </div>
          </Link>

          {/* Yellow Cashback Subtext */}
          <p className="text-xs sm:text-sm font-black text-white flex items-center justify-center gap-1.5 mt-2">
            <span className="text-[#bbf225] font-black text-sm animate-bounce">⚡</span>
            <span>Get up to 10% cashback!</span>
          </p>
        </div>

        {/* Action Buttons: Buy USDT & Sell USDT */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Link to="/customer/buy" className="w-full">
            <Button className="w-full rounded-full py-5 text-xs font-black bg-white/25 hover:bg-white/35 text-white border border-white/40 backdrop-blur-md shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-95 group">
              <span className="w-6 h-6 rounded-full bg-white/20 group-hover:bg-[#bbf225] group-hover:text-slate-900 border border-white/40 flex items-center justify-center text-white text-[11px] transition-colors">
                <Navigation className="w-3.5 h-3.5 rotate-45" />
              </span>
              <span className="whitespace-nowrap">Buy USDT</span>
            </Button>
          </Link>
          <Link to="/customer/sell" className="w-full">
            <Button className="w-full rounded-full py-5 text-xs font-black bg-white/25 hover:bg-white/35 text-white border border-white/40 backdrop-blur-md shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-95 group">
              <span className="w-6 h-6 rounded-full bg-white/20 group-hover:bg-[#bbf225] group-hover:text-slate-900 border border-white/40 flex items-center justify-center text-white text-[11px] transition-colors">
                <Send className="w-3.5 h-3.5" />
              </span>
              <span className="whitespace-nowrap">Sell USDT</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. High-Tech Animated Crypto Wallet Balance Card */}
      <div className="rounded-[28px] bg-gradient-to-r from-[#eef4ff] via-[#f5f8ff] to-[#e8f0fe] dark:from-[#0d162a] dark:via-[#121c35] dark:to-[#0f1930] border border-blue-200/60 dark:border-blue-800/40 p-3.5 sm:p-4 shadow-md shadow-blue-500/5 hover:shadow-lg hover:shadow-blue-500/10 transition-all flex items-center justify-between gap-2.5 relative overflow-hidden group min-w-0">
        {/* Glowing Ambient Light Spheres */}
        <div className="absolute -top-10 -left-10 w-28 h-28 bg-blue-500/15 dark:bg-blue-500/25 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
        <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-emerald-500/15 dark:bg-emerald-500/20 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />

        {/* Futuristic Interconnected Blockchain Grid Watermark SVG */}
        <svg className="absolute right-0 top-0 h-full w-48 text-blue-500/10 dark:text-blue-400/10 pointer-events-none select-none stroke-current" viewBox="0 0 200 100" fill="none" strokeWidth="1">
          {/* Hexagonal / Blockchain Mesh Grid Lines */}
          <path d="M 30 10 L 70 30 L 70 70 L 30 90 M 70 30 L 110 10 L 150 30 L 150 70 L 110 90 M 110 30 L 110 70" strokeDasharray="3 3" />
          <circle cx="70" cy="30" r="3" fill="currentColor" />
          <circle cx="110" cy="10" r="3" fill="currentColor" />
          <circle cx="150" cy="30" r="3" fill="currentColor" />
          <circle cx="110" cy="70" r="3" fill="currentColor" />
        </svg>

        {/* Floating Crypto Tether / Bitcoin Watermark Badge */}
        <div className="absolute right-20 top-2 text-blue-400/20 dark:text-blue-400/15 font-black text-[9px] pointer-events-none select-none tracking-widest uppercase">
          ₮ USDT ESCROW
        </div>
        <div className="absolute right-8 bottom-1 text-emerald-400/20 dark:text-emerald-400/15 font-mono font-black text-xl pointer-events-none select-none">
          $
        </div>

        {/* Animated Subtle Shimmer Light Ray */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-blue-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

        {/* Left Side: Glowing Squircle Wallet Icon & Un-truncated Balance */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 z-10">
          {/* 3D Glowing Gradient Squircle */}
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-[18px] bg-gradient-to-tr from-[#3b59f8] via-[#4d69f9] to-[#2542e3] text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/35 border border-blue-400/30 group-hover:scale-105 transition-transform duration-300 relative">
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-[#0d162a] animate-pulse" />
            <svg className="w-5.5 h-5.5 stroke-[2.2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
            </svg>
          </div>

          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                {availableVal}
              </span>
              <span className="text-xs font-black text-[#3b59f8] dark:text-blue-400 shrink-0 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/40">
                USDT
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">1 USDT = ₹99.11</span>
            </div>
          </div>
        </div>

        {/* Right Side: Glowing Capsule Action Button */}
        <Link to="/customer/wallet/deposit" className="shrink-0 z-10">
          <button className="rounded-full pl-2 pr-4 sm:pr-4.5 py-2 sm:py-2.5 bg-gradient-to-r from-[#3b59f8] via-[#304ee7] to-[#2542e3] hover:from-[#2d46e5] hover:to-[#1b36cf] text-white shadow-xl shadow-blue-500/35 flex items-center gap-2 cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 whitespace-nowrap group/btn border border-blue-400/30">
            <span className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full bg-white text-[#3b59f8] flex items-center justify-center text-xs font-black shrink-0 shadow-xs group-hover/btn:rotate-90 transition-transform duration-300">
              +
            </span>
            <span className="text-xs font-black tracking-tight whitespace-nowrap">Add Money</span>
          </button>
        </Link>
      </div>

      {/* 3. Three Feature Action Grid (Matching Reference Images) */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Recharges & Bills */}
        <Link
          to="/customer/utilities"
          className="rounded-2xl bg-white dark:bg-[#121829] border border-slate-100 dark:border-slate-800/80 p-3 text-center flex flex-col items-center justify-between space-y-2 hover:shadow-md hover:border-emerald-300/50 dark:hover:border-emerald-800/50 transition-all cursor-pointer shadow-sm group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <Smartphone className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
            Recharges & Bills
          </span>
        </Link>

        {/* Buy Gift Cards */}
        <Link
          to="/customer/gift-cards"
          className="rounded-2xl bg-white dark:bg-[#121829] border border-slate-100 dark:border-slate-800/80 p-3 text-center flex flex-col items-center justify-between space-y-2 hover:shadow-md hover:border-amber-300/50 dark:hover:border-amber-800/50 transition-all cursor-pointer shadow-sm group relative"
        >
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-black bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap shadow-xs">
            Up to 15% Off
          </span>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center font-bold group-hover:scale-110 transition-transform mt-1">
            <Gift className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
            Buy Gift Cards
          </span>
        </Link>

        {/* Refer & Earn */}
        <Link
          to="/customer/referrals"
          className="rounded-2xl bg-white dark:bg-[#121829] border border-slate-100 dark:border-slate-800/80 p-3 text-center flex flex-col items-center justify-between space-y-2 hover:shadow-md hover:border-blue-300/50 dark:hover:border-blue-800/50 transition-all cursor-pointer shadow-sm group relative"
        >
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-black bg-blue-100 text-blue-700 border border-blue-300 shadow-xs">
            Invite
          </span>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center font-bold group-hover:scale-110 transition-transform mt-1">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
            Refer & Earn
          </span>
        </Link>
      </div>

      {/* 4. Interactive Auto-Rotating 5-Slide Promo Banner (Matching Images 1 - 5) */}
      <div
        className={cn(
          'rounded-2xl text-white p-4 flex items-center justify-between shadow-md transition-all duration-500 relative overflow-hidden min-h-[96px]',
          currentBanner.bgClass
        )}
      >
        {/* Slide countdown top progress bar */}
        <div key={activeSlide} className="absolute top-0 left-0 h-1 bg-white/40 w-full animate-shimmer" />

        <div className="space-y-0.5 z-10 transition-opacity duration-300">
          <h4 className="text-sm font-black tracking-tight leading-tight">
            {currentBanner.title}
          </h4>
          <p className="text-[11px] text-white/90 font-medium">
            {currentBanner.subtitle}
          </p>
        </div>

        <Link to={currentBanner.link} className="z-10 shrink-0">
          <Button className="rounded-full px-4 py-2 text-xs font-extrabold bg-white text-slate-900 hover:bg-slate-100 shadow-sm cursor-pointer transition-transform hover:scale-105 active:scale-95">
            {currentBanner.btnText}
          </Button>
        </Link>

        {/* Carousel Pagination Dots matching Reference Images */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSlide(idx)}
              className={cn(
                'transition-all duration-300 cursor-pointer',
                idx === activeSlide
                  ? 'w-6 h-1.5 bg-white rounded-full'
                  : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70 rounded-full'
              )}
              title={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function FilterBar() {
  const [params, setParams] = useSearchParams()
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Input
        placeholder="Search"
        defaultValue={params.get('q') ?? ''}
        onChange={(e) => {
          params.set('q', e.target.value)
          setParams(params)
        }}
        className="max-w-xs"
      />
    </div>
  )
}

export function WalletHome() {
  const q = useQuery({ queryKey: ['overview'], queryFn: () => api<Overview>('/customer/overview') })
  return (
    <div>
      <h1 className="text-2xl font-semibold">Wallet</h1>
      <p className="text-sm text-nx-muted">Simulated accounts. Locked funds cannot be spent in later engine phases.</p>
      {q.data && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Card>Available {q.data.wallet.availableUsdt} USDT</Card>
          <Card>Locked {q.data.wallet.lockedUsdt} USDT</Card>
          <Card>Total {q.data.wallet.totalUsdt} USDT</Card>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ['deposit', 'Deposit'],
          ['withdraw', 'Withdraw'],
          ['send', 'Send'],
          ['receive', 'Receive'],
          ['addresses', 'Addresses'],
        ].map(([p, l]) => (
          <Link key={p} to={`/customer/wallet/${p}`}>
            <Button variant="ghost">{l}</Button>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function FlowPage({
  title,
  fields,
  action,
}: {
  title: string
  fields: { name: string; label: string; type?: string }[]
  action: string
}) {
  const [state, setState] = useState('idle')
  const [receipt, setReceipt] = useState('')
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-nx-muted">Prototype form. Submits a local confirmation, not a chain or bank payment.</p>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          setState('processing')
          window.setTimeout(() => {
            setState('done')
            setReceipt(`SIM-${Date.now()}`)
          }, 600)
        }}
      >
        {fields.map((f) => (
          <label key={f.name} className="block text-sm">
            {f.label}
            <Input name={f.name} type={f.type ?? 'text'} required className="mt-1" />
          </label>
        ))}
        <Button type="submit" disabled={state === 'processing'}>
          {action}
        </Button>
      </form>
      {state === 'done' && (
        <Card className="mt-4">
          Mock receipt {receipt}. No funds left this device. Wallet updates require the ledger APIs in
          later phases.
        </Card>
      )}
    </div>
  )
}

export function ListPage({
  title,
  rows,
  to,
}: {
  title: string
  rows: { id: string; title: string; meta: string }[]
  to: (id: string) => string
}) {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').toLowerCase()
  const filtered = rows.filter((r) => r.title.toLowerCase().includes(q) || r.meta.toLowerCase().includes(q))
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <FilterBar />
      <div className="space-y-2">
        {filtered.map((r) => (
          <Link key={r.id} to={to(r.id)}>
            <Card className="flex justify-between">
              <span>{r.title}</span>
              <span className="text-sm text-nx-muted">{r.meta}</span>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && <p className="text-sm text-nx-muted">Nothing matches that filter.</p>}
      </div>
    </div>
  )
}

export function DetailPage({ label }: { label: string }) {
  const { orderId, transactionId, ticketId, brandId } = useParams()
  const id = orderId ?? transactionId ?? ticketId ?? brandId
  return (
    <div>
      <h1 className="text-2xl font-semibold">{label}</h1>
      <Card className="mt-4">
        <p>Record {id}</p>
        <p className="mt-2 text-sm text-nx-muted">
          Detail views will bind to API entities in later phases. This shell is routable and labelled as
          simulated.
        </p>
      </Card>
    </div>
  )
}

export function CatalogPage() {
  const brands = [
    { id: 'northline-audio', title: 'Northline Audio', meta: 'Entertainment' },
    { id: 'paper-trail', title: 'Paper Trail Books', meta: 'Retail' },
  ]
  return <ListPage title="Gift cards" rows={brands} to={(id) => `/customer/gift-cards/${id}`} />
}

export function UtilitiesHub() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Utilities</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {[
          ['mobile-recharge', 'Mobile recharge'],
          ['dth', 'DTH'],
          ['electricity', 'Electricity'],
          ['bill-payment', 'Bill payment'],
        ].map(([p, l]) => (
          <Link key={p} to={`/customer/utilities/${p}`}>
            <Card>{l}</Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function AccountPage({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card className="mt-4">{body}</Card>
    </div>
  )
}

export function PayHome() {
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Pay</h1>
      <p className="text-sm text-nx-muted">
        Mock UPI only. Scan an image or type an ID. No bank transfer is executed.
      </p>
      <Link to="/customer/pay/scan">
        <Button>Scan QR</Button>
      </Link>
      <Link to="/customer/pay/confirm">
        <Button variant="ghost">Enter UPI ID</Button>
      </Link>
    </div>
  )
}

export function PayScan() {
  const [parsed, setParsed] = useState('')
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold">Scan QR</h1>
      <p className="text-sm text-nx-muted">Mock parser only. Upload any image to simulate a UPI payload.</p>
      <input
        type="file"
        accept="image/*"
        className="mt-4 text-sm"
        onChange={(e) => {
          const file = e.target.files?.[0]
          setParsed(file ? `upi://pay?pa=demo@nexora&pn=Sample%20Shop&file=${file.name}` : '')
        }}
      />
      {parsed && (
        <Card className="mt-4">
          <p>Parsed (mock): {parsed}</p>
          <Link to="/customer/pay/confirm">
            <Button className="mt-3">Continue</Button>
          </Link>
        </Card>
      )}
    </div>
  )
}

