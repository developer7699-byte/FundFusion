import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
  ArrowLeft,
  Tv,
  Wifi,
  Flame,
  Droplets,
  Car,
  CreditCard,
  Building2,
  Clock,
  RefreshCw,
  Search,
  ScanLine,
  Check,
  ArrowDownCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { activity } from '@/lib/demo-data'
import { cn, inr, usdt } from '@/lib/utils'
import { BillPaymentModal } from './components/BillPaymentModal'
import { BackButton } from '@/components/ui/BackButton'

type Overview = {
  simulated: boolean
  usdtInrRate: string
  wallet: { availableUsdt: string; lockedUsdt: string; totalUsdt: string; inrEstimate: string }
  totals: { transactions: number }
  recent: { id: string; type: string; status: string; amount: string; asset: string; createdAt: string }[]
}

export { CustomerDashboard } from './CustomerDashboard'

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
  const [selectedCat, setSelectedCat] = useState<
    'recharge' | 'electricity' | 'dth' | 'broadband' | 'gas' | 'water' | 'fastag'
  >('recharge')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const utilityServices = [
    { id: 'recharge', label: 'Mobile Recharge', icon: Smartphone, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50', badge: 'Fast' },
    { id: 'electricity', label: 'Electricity Bill', icon: Zap, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50', badge: 'Instant' },
    { id: 'dth', label: 'DTH / Cable TV', icon: Tv, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50', badge: '' },
    { id: 'broadband', label: 'Broadband / Wi-Fi', icon: Wifi, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50', badge: '' },
    { id: 'gas', label: 'Piped Gas (PNG)', icon: Flame, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/50', badge: '' },
    { id: 'water', label: 'Water Utility', icon: Droplets, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/50', badge: '' },
    { id: 'fastag', label: 'FASTag Toll', icon: Car, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/50', badge: 'Toll' },
    { id: 'recharge', label: 'Credit Card Bill', icon: CreditCard, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50', badge: '2% Back' },
  ]

  const recentBills = [
    { id: '1', title: 'Jio Mobile Prepaid', idNum: '9876543210', amount: '₹299', usdt: '3.01 USDT', date: '2 days ago', cat: 'recharge' as const },
    { id: '2', title: 'BESCOM Electricity', idNum: 'CA #99482104', amount: '₹1,450', usdt: '14.63 USDT', date: 'Oct 28', cat: 'electricity' as const },
    { id: '3', title: 'Tata Play DTH', idNum: 'Sub #10029384', amount: '₹450', usdt: '4.54 USDT', date: 'Oct 15', cat: 'dth' as const },
  ]

  const openService = (cat: 'recharge' | 'electricity' | 'dth' | 'broadband' | 'gas' | 'water' | 'fastag') => {
    setSelectedCat(cat)
    setIsModalOpen(true)
  }

  const filteredServices = utilityServices.filter((s) =>
    s.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/customer/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Bills & Recharges
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Pay directly with USDT at 0% fee</p>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 text-[10px] font-black">
          <ShieldCheck className="w-3 h-3" />
          <span>BBPS Verified</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search biller, operator or board..."
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white placeholder:text-slate-400"
        />
      </div>

      {/* Promotional Cashback Banner */}
      <div className="rounded-[24px] bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 p-4 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1 max-w-[240px]">
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block">
              🎉 Festive Rebate
            </span>
            <h3 className="text-sm font-black leading-tight">2% Instant USDT Cashback</h3>
            <p className="text-[11px] text-emerald-100 leading-snug">
              On all Electricity, Mobile and DTH recharges settled via USDT escrow.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-amber-300" />
          </div>
        </div>
      </div>

      {/* Service Grid (4 columns) */}
      <div className="space-y-2">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Utility Services
        </h2>
        <div className="grid grid-cols-4 gap-2.5">
          {filteredServices.map((service, idx) => (
            <button
              key={`${service.label}-${idx}`}
              type="button"
              onClick={() => openService(service.id as any)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800/80 hover:border-emerald-500/40 hover:shadow-sm transition-all text-center group cursor-pointer relative"
            >
              {service.badge && (
                <span className="absolute -top-1.5 right-1 text-[8px] font-black px-1.5 py-0.2 rounded-full bg-emerald-500 text-white shadow-2xs">
                  {service.badge}
                </span>
              )}
              <div
                className={cn(
                  'w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95',
                  service.color
                )}
              >
                <service.icon className="w-5 h-5 stroke-[2]" />
              </div>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                {service.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Bills & Quick Repeat */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Recent Payments
          </h2>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            Auto-fetch on
          </span>
        </div>

        <div className="space-y-2">
          {recentBills.map((b) => (
            <div
              key={b.id}
              className="p-3 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
                    {b.title}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {b.idNum} • {b.date}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <span className="text-xs font-black text-slate-900 dark:text-white block font-mono">
                    {b.amount}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                    {b.usdt}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openService(b.cat)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
                >
                  Repeat
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Bill Payment Modal */}
      <BillPaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialCategory={selectedCat}
      />
    </div>
  )
}

export function AccountPage({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <BackButton fallback="/customer/dashboard" />
        <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{title}</h1>
      </div>
      <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed shadow-2xs">
        {body}
      </div>
    </div>
  )
}

export function PayHome() {
  const [upiInput, setUpiInput] = useState('')
  const navigate = useNavigate()

  const recentPayees = [
    { name: 'Starbucks Coffee', upiId: 'starbucks@icici', avatar: '☕' },
    { name: 'Reliance Fresh', upiId: 'reliancefresh@hdfcbank', avatar: '🛒' },
    { name: 'Aarav Sharma', upiId: 'aarav.sharma@okaxis', avatar: '👤' },
    { name: 'Airtel Broadband', upiId: 'airtel.bb@airtel', avatar: '📶' },
  ]

  const handleProceedUpi = (e: React.FormEvent) => {
    e.preventDefault()
    if (!upiInput) return
    navigate(`/customer/pay/confirm?vpa=${encodeURIComponent(upiInput)}`)
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/customer/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Scan & Pay UPI
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Instant merchant settlements via USDT</p>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 text-[10px] font-black">
          <Sparkles className="w-3 h-3" />
          <span>Zero Fee</span>
        </div>
      </div>

      {/* Main Scan Camera Hero Card */}
      <div className="rounded-[28px] bg-gradient-to-tr from-[#0a2316] via-[#0d3420] to-[#0a2316] p-5 text-white shadow-xl border border-emerald-500/30 text-center space-y-4 relative overflow-hidden">
        <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 mx-auto flex items-center justify-center shadow-lg">
          <QrCode className="w-10 h-10 text-emerald-400 animate-pulse" />
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-black">Scan Any UPI QR Code</h2>
          <p className="text-xs text-emerald-200/80 max-w-xs mx-auto">
            Pay at BharatPe, Paytm, GooglePay, PhonePe or any Indian merchant store instantly.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 justify-center">
          <Link
            to="/customer/pay/scan"
            className="w-full py-3 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1.5"
          >
            <ScanLine className="w-4 h-4" />
            <span>Scan QR</span>
          </Link>
          <Link
            to="/customer/request"
            className="w-full py-3 px-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-black text-xs shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1.5 border border-white/20"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Request Money</span>
          </Link>
        </div>
      </div>

      {/* Direct UPI ID Entry Form */}
      <form
        onSubmit={handleProceedUpi}
        className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-3 shadow-2xs"
      >
        <span className="text-xs font-black text-slate-900 dark:text-white block">
          Or Enter UPI ID / Mobile Number
        </span>

        <div className="flex gap-2">
          <input
            type="text"
            value={upiInput}
            onChange={(e) => setUpiInput(e.target.value)}
            placeholder="e.g. merchant@okicici or 9876543210"
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!upiInput}
            className="px-4 py-2.5 rounded-xl bg-[#0a2316] text-white hover:bg-emerald-950 font-bold text-xs disabled:opacity-40 transition-all cursor-pointer"
          >
            Verify
          </button>
        </div>
      </form>

      {/* Recent Merchant Payees */}
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Recent Payees
        </h3>
        <div className="space-y-2">
          {recentPayees.map((p) => (
            <button
              key={p.upiId}
              type="button"
              onClick={() => navigate(`/customer/pay/confirm?vpa=${encodeURIComponent(p.upiId)}`)}
              className="w-full p-3 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:border-emerald-500/40 transition-all text-left cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base shrink-0">
                  {p.avatar}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate block group-hover:text-emerald-500 transition-colors">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{p.upiId}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function PayScan() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate('/customer/pay/scan', { replace: true })
  }, [navigate])
  return null
}

