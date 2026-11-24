import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  QrCode,
  ArrowLeftRight,
  Zap,
  Gift,
  Smartphone,
  MessageSquare,
  Send,
  HelpCircle,
  Users,
  Share2,
  Lock,
  Building2,
  Tv,
  Search,
  CheckCircle,
  FileText,
  BadgeAlert,
  X,
  CreditCard,
  Flame,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Sun,
  Moon,
  Receipt,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { BackButton } from '@/components/ui/BackButton'
import { useNotifications } from '@/lib/notifications'
import { useAdminStore } from '@/lib/admin-store'
import { useCustomerOrders, useMerchantStore, type CustomerOrder } from '@/lib/merchant-store'

type Order = {
  id: string
  kind: string
  status: string
  usdtAmount: string
  inrAmount: string
  timeline: { at: string; status: string; note: string }[]
  utr?: string
  upiId?: string
  beneficiary?: string
}

/* =========================================================================
   1. ORDERS LIST (/customer/orders)
   ========================================================================= */
export function OrdersList() {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'P2P' | 'UPI' | 'UTILITIES'>('ALL')
  const { orders: localCustomerOrders } = useCustomerOrders()
  const q = useQuery({ queryKey: ['orders'], queryFn: () => api<Order[]>('/orders').catch(() => []) })

  // Mock demo orders if none exist
  const mockOrders: Order[] = [
    {
      id: 'ord-89201',
      kind: 'BUY_USDT',
      status: 'ESCROW_LOCKED',
      usdtAmount: '50.00',
      inrAmount: '4575.00',
      beneficiary: 'FundFusionEscrow_Fast',
      upiId: 'merchant.fundfusion@okaxis',
      timeline: [
        { at: '14:20', status: 'CREATED', note: 'Order matched with verified merchant' },
        { at: '14:21', status: 'ESCROW_LOCKED', note: '50.00 USDT held safely in smart escrow' },
      ],
    },
    {
      id: 'ord-88319',
      kind: 'UPI_PAY',
      status: 'COMPLETED',
      usdtAmount: '3.82',
      inrAmount: '350.00',
      beneficiary: 'Starbucks Coffee',
      upiId: 'starbucks@icici',
      utr: 'UTR993810294821',
      timeline: [
        { at: 'Yesterday', status: 'COMPLETED', note: 'Merchant confirmed UPI receipt' },
      ],
    },
    {
      id: 'ord-87102',
      kind: 'GIFT_CARD',
      status: 'COMPLETED',
      usdtAmount: '10.92',
      inrAmount: '1000.00',
      beneficiary: 'Amazon Pay Gift Voucher',
      utr: 'VCH-AMZN-8921-901',
      timeline: [
        { at: 'Nov 10', status: 'COMPLETED', note: 'Voucher code delivered to vault' },
      ],
    },
    {
      id: 'ord-86004',
      kind: 'UTILITY_BILL',
      status: 'COMPLETED',
      usdtAmount: '15.84',
      inrAmount: '1450.00',
      beneficiary: 'BESCOM Electricity Bill',
      timeline: [
        { at: 'Nov 08', status: 'COMPLETED', note: 'BBPS biller settled at zero fee' },
      ],
    },
  ]

  const baseOrders = (q.data && q.data.length > 0) ? q.data : mockOrders
  // Merge live customer orders with base orders so newly broadcasted orders appear right at top
  const orders: Order[] = [
    ...(localCustomerOrders as Order[]),
    ...baseOrders.filter((bo) => !localCustomerOrders.some((lo) => lo.id === bo.id)),
  ]

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === 'ALL') return true
    if (activeFilter === 'P2P') return o.kind.includes('BUY') || o.kind.includes('SELL')
    if (activeFilter === 'UPI') return o.kind.includes('UPI')
    if (activeFilter === 'UTILITIES') return o.kind.includes('UTILITY') || o.kind.includes('GIFT')
    return true
  })

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/customer/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              My Orders & Swaps
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">P2P Escrow & Utility History</p>
          </div>
        </div>

        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Escrow Protected
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900/60 overflow-x-auto no-scrollbar">
        {[
          { id: 'ALL', label: 'All Orders' },
          { id: 'P2P', label: 'P2P Crypto' },
          { id: 'UPI', label: 'UPI QR' },
          { id: 'UTILITIES', label: 'Bills & Gifts' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id as any)}
            className={cn(
              'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
              activeFilter === tab.id
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-2.5">
        {filteredOrders.map((o) => {
          const isCompleted = o.status === 'COMPLETED'
          const isLocked = o.status === 'ESCROW_LOCKED' || o.status === 'PENDING'

          return (
            <Link
              key={o.id}
              to={`/customer/orders/${o.id}`}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:border-emerald-500/40 hover:shadow-xs transition-all group block shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-base',
                    o.kind.includes('BUY') || o.kind.includes('SELL')
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                      : o.kind.includes('UPI')
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      : 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                  )}
                >
                  {o.kind.includes('BUY') ? (
                    <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
                  ) : o.kind.includes('SELL') ? (
                    <ArrowUpRight className="w-5 h-5 text-blue-500" />
                  ) : o.kind.includes('UPI') ? (
                    <QrCode className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Gift className="w-5 h-5 text-purple-500" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {o.beneficiary || o.kind.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    ID: {o.id}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <span className="text-xs font-black text-slate-900 dark:text-white block font-mono">
                    ₹{o.inrAmount}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold block">
                    {o.usdtAmount} USDT
                  </span>
                  <span
                    className={cn(
                      'text-[9px] font-black px-1.5 py-0.2 rounded-full inline-block mt-0.5',
                      o.status === 'AVAILABLE'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse'
                        : isCompleted
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : o.status === 'UTR_SUBMITTED'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : isLocked
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {o.status === 'AVAILABLE' ? '📡 BROADCASTING' : o.status.replace('_', ' ')}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/* =========================================================================
   2. ORDER DETAIL (/customer/orders/:orderId)
   ========================================================================= */
export function OrderDetail() {
  const { orderId } = useParams()
  const qc = useQueryClient()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [actionDone, setActionDone] = useState<string | null>(null)
  const [utrInput, setUtrInput] = useState('')

  const { getOrder, submitCustomerUtr, cancelOrder } = useCustomerOrders()
  const { acceptOrder: merchantAcceptOrder, releaseEscrow: merchantReleaseEscrow } = useMerchantStore()

  const liveOrder = getOrder(orderId || '')

  const q = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api<Order>(`/orders/${orderId}`).catch(() => null),
  })

  const fallbackOrder: Order = {
    id: orderId || 'ord-89201',
    kind: 'BUY_USDT',
    status: 'ESCROW_LOCKED',
    usdtAmount: '50.00',
    inrAmount: '4575.00',
    beneficiary: 'Orbit Desk LLP',
    upiId: 'orbitdesk@okaxis',
    utr: 'UTR99482019482',
    timeline: [
      { at: '14:20', status: 'CREATED', note: 'Order broadcasted to verified merchants' },
      { at: '14:21', status: 'ESCROW_LOCKED', note: '50.00 USDT locked in smart escrow' },
      { at: '14:22', status: 'AWAITING_PAYMENT', note: 'Transfer ₹4,575.00 to merchant UPI' },
    ],
  }

  const o: any = liveOrder || q.data || fallbackOrder

  const handleCopy = (text: string, key = 'generic') => {
    navigator.clipboard?.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleSubmitUtr = () => {
    if (!utrInput.trim()) return
    submitCustomerUtr(o.id, utrInput.trim())
    setActionDone('UTR submitted to merchant! Waiting for bank verification.')
    setUtrInput('')
  }

  const handleCancelBroadcast = () => {
    const ok = cancelOrder(o.id)
    if (ok) {
      setActionDone('Order broadcast request cancelled.')
    } else {
      alert('Cannot cancel: Order has already been accepted by a merchant desk.')
    }
  }

  const isBroadcasting = o.status === 'AVAILABLE'
  const isEscrowLocked = o.status === 'ESCROW_LOCKED' || o.status === 'AWAITING_PAYMENT'
  const isUtrSubmitted = o.status === 'UTR_SUBMITTED'
  const isCompleted = o.status === 'COMPLETED'
  const isCancelled = o.status === 'CANCELLED'

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/customer/orders" />
          <div>
            <h1 className="text-base font-black text-slate-900 dark:text-white">Order Details</h1>
            <p className="text-[11px] text-slate-500 font-mono">{o.id}</p>
          </div>
        </div>

        <span
          className={cn(
            'text-[10px] font-black px-2.5 py-1 rounded-full',
            isBroadcasting
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse'
              : isCompleted
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : isUtrSubmitted
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
              : isCancelled
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
          )}
        >
          {isBroadcasting ? '📡 BROADCASTING' : o.status.replace('_', ' ')}
        </span>
      </div>

      {/* 1. BROADCASTING RADAR HERO (When waiting for first merchant to accept) */}
      {isBroadcasting && (
        <div className="rounded-[28px] bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-500/5 border-2 border-dashed border-[#f7a83b] p-5 text-center space-y-4 shadow-sm relative overflow-hidden animate-in fade-in duration-300">
          <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
            <div className="w-16 h-16 rounded-full bg-[#f7a83b] text-slate-950 flex items-center justify-center text-2xl font-black shadow-md shadow-amber-400/30">
              📡
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Broadcasting to Online Merchants...
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
              Your purchase of <strong className="text-slate-900 dark:text-white font-mono">{o.usdtAmount} USDT</strong> (₹{o.inrAmount}) has been sent to <strong>14 verified merchant desks</strong>.
            </p>
            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 pt-1">
              ⚡ Whichever merchant accepts first will lock your USDT in escrow immediately.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancelBroadcast}
              className="py-2 px-4 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
            >
              Cancel Broadcast
            </button>
            <button
              type="button"
              onClick={() => merchantAcceptOrder(o.id, 'Orbit Desk LLP')}
              className="py-2 px-4 rounded-xl text-xs font-black bg-[#f7a83b] hover:bg-[#f59e26] text-slate-950 shadow-md shadow-amber-400/20 cursor-pointer flex items-center gap-1.5"
            >
              <span>⚡ Accept as 'Orbit Desk LLP'</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. ACCEPTED / ESCROW LOCKED BANNER */}
      {(isEscrowLocked || isUtrSubmitted || isCompleted) && (
        <div className="rounded-[28px] bg-gradient-to-tr from-slate-950 via-slate-900 to-amber-950 text-white p-5 space-y-3.5 shadow-xl border border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-300 font-medium">Escrow Protected Asset</span>
            <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              🛡️ Multi-Sig Vault Locked
            </span>
          </div>

          <div>
            <div className="text-3xl font-black font-mono tracking-tight text-white">
              {o.usdtAmount} USDT
            </div>
            <span className="text-xs text-amber-300 font-mono">
              ≈ ₹{o.inrAmount} INR
            </span>
          </div>

          <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Accepted By Desk</span>
              <span className="font-bold text-white truncate block">
                {o.beneficiary || o.acceptedByDesk || 'Orbit Desk LLP'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Locked Exchange Rate</span>
              <span className="font-bold font-mono text-amber-300">₹{o.rate || '91.50'} / USDT</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. PAYMENT DETAILS & UTR SUBMISSION (When Escrow is locked) */}
      {isEscrowLocked && (
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-3.5 shadow-2xs">
          <div>
            <span className="text-xs font-black text-slate-900 dark:text-white block">
              Step 1: Transfer Exact INR to Merchant
            </span>
            <p className="text-[11px] text-slate-500">
              Send payment within 15 minutes to prevent escrow timeout.
            </p>
          </div>

          {/* Amount to pay */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40">
            <div>
              <span className="text-[10px] text-slate-500 block">Exact INR Amount</span>
              <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                ₹{o.inrAmount}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(o.inrAmount, 'amt')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === 'amt' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'amt' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* UPI ID */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 block">Merchant Verified UPI ID</span>
              <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
                {o.upiId || 'orbitdesk@okaxis'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(o.upiId || 'orbitdesk@okaxis', 'upi')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === 'upi' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'upi' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Optional Bank Details if present */}
          {o.bankDetails && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1.5 text-xs">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Merchant Bank Account</span>
              <div className="flex justify-between">
                <span className="text-slate-500">A/C Number:</span>
                <span className="font-mono font-bold">{o.bankDetails.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IFSC:</span>
                <span className="font-mono font-bold">{o.bankDetails.ifsc}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">A/C Holder:</span>
                <span className="font-bold">{o.bankDetails.holderName}</span>
              </div>
            </div>
          )}

          {/* Step 2: Submit UTR */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-xs font-black text-slate-900 dark:text-white block">
              Step 2: Submit 12-Digit Bank UTR / UPI Ref ID
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value)}
                placeholder="e.g. 429104829104"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white"
              />
              <button
                type="button"
                disabled={!utrInput.trim()}
                onClick={handleSubmitUtr}
                className="px-4 py-2 rounded-xl bg-[#f7a83b] hover:bg-[#f59e26] disabled:opacity-40 text-slate-950 font-black text-xs shadow-md shadow-amber-400/20 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                Submit UTR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. UTR SUBMITTED BANNER */}
      {isUtrSubmitted && (
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-3">
          <div className="flex items-start gap-2.5">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h3 className="text-xs font-black text-blue-900 dark:text-blue-300">
                UTR Submitted: {o.utr}
              </h3>
              <p className="text-[11px] text-blue-800/90 dark:text-blue-300/80 leading-relaxed">
                Merchant <strong>{o.beneficiary || 'Orbit Desk LLP'}</strong> has been alerted to verify the INR receipt in their banking app. Escrow will release automatically upon confirmation.
              </p>
            </div>
          </div>

          {/* Developer / Demo Quick Release */}
          <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between">
            <span className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">Demo Testing Shortcut:</span>
            <button
              type="button"
              onClick={() => merchantReleaseEscrow(o.id)}
              className="py-1.5 px-3 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span>⚡ Simulate Merchant Release</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. COMPLETED BANNER */}
      {isCompleted && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-300">
            Order Successfully Settled!
          </h3>
          <p className="text-xs text-emerald-800/90 dark:text-emerald-300/80 font-mono">
            +{o.usdtAmount} USDT has been credited to your wallet balance.
          </p>
          <div className="pt-1">
            <Link
              to="/customer/wallet"
              className="inline-block py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md"
            >
              View My Wallet Vault →
            </Link>
          </div>
        </div>
      )}

      {/* Timeline Steps */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-3 shadow-2xs">
        <span className="text-xs font-black text-slate-900 dark:text-white block">
          Order Status History
        </span>
        <div className="space-y-3">
          {o.timeline?.map((t: any, idx: number) => (
            <div key={`${t.at}-${idx}`} className="flex items-start gap-2.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#f7a83b] mt-1.5 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-slate-900 dark:text-white block">{t.status}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{t.note}</span>
                <span className="text-[9px] text-slate-400 font-mono block mt-0.5">{t.at}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-1">
        {actionDone && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionDone}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                await api(`/orders/${o.id}/cancel`, { method: 'POST' })
                void qc.invalidateQueries()
              } catch {}
              setActionDone('Order cancellation requested')
            }}
            className="py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer text-center"
          >
            Cancel Order
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await api(`/orders/${o.id}/dispute`, {
                  method: 'POST',
                  body: JSON.stringify({ reason: 'Payment made but escrow not released' }),
                })
                void qc.invalidateQueries()
              } catch {}
              setActionDone('Escrow dispute opened with arbitrator')
            }}
            className="py-2.5 px-3 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200/60 dark:border-rose-900/40 cursor-pointer text-center"
          >
            Raise Dispute
          </button>
        </div>

        <Link
          to="/customer/support"
          className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1.5"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Need Help with this Order? Contact Support</span>
        </Link>
      </div>
    </div>
  )
}

/* =========================================================================
   3. PAY CONFIRM (/customer/pay/confirm)
   ========================================================================= */
export function PayConfirm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialVpa = searchParams.get('vpa') || 'demo.shop@okicici'
  const [upi, setUpi] = useState(initialVpa)
  const [amount, setAmount] = useState('500')
  const [note, setNote] = useState('Payment for purchase')
  const [isPaid, setIsPaid] = useState(false)
  const [receiptData, setReceiptData] = useState<{ id: string; utr: string } | null>(null)

  const usdtEquivalent = (parseFloat(amount || '0') / 91.5).toFixed(2)

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const order = await api<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify({ kind: 'UPI_PAY', inrAmount: amount, upiId: upi, beneficiary: 'Merchant Store' }),
      })
      setReceiptData({ id: order.id, utr: `UTR${Date.now().toString().slice(-10)}` })
    } catch {
      setReceiptData({ id: `ord-${Date.now().toString().slice(-6)}`, utr: `UTR${Date.now().toString().slice(-10)}` })
    }
    setIsPaid(true)
  }

  if (isPaid && receiptData) {
    return (
      <div className="space-y-4 max-w-lg mx-auto w-full pb-4 text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-500 mx-auto flex items-center justify-center shadow-lg border border-emerald-500/30">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            Payment Successful
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{amount}.00</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Debited {usdtEquivalent} USDT @ ₹91.50
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 text-left space-y-2.5 text-xs shadow-2xs">
          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-400">Paid to UPI ID</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{upi}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-400">UTR / Ref Number</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{receiptData.utr}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Transaction Fee</span>
            <span className="font-bold text-emerald-600">₹0.00 (Zero Fee)</span>
          </div>
        </div>

        <Link
          to="/customer/dashboard"
          className="w-full py-3 rounded-2xl bg-[#0a2316] text-white hover:bg-emerald-950 font-black text-xs shadow-lg transition-transform active:scale-95 block text-center"
        >
          Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      {/* Top Header */}
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <BackButton fallback="/customer/pay" />
        <div>
          <h1 className="text-base font-black text-slate-900 dark:text-white">Confirm UPI Pay</h1>
          <p className="text-[11px] text-slate-500">Zero fee instant USDT settlement</p>
        </div>
      </div>

      <form onSubmit={handlePay} className="space-y-3.5">
        {/* Beneficiary Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-base shadow-sm">
              {upi.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                Verified Merchant
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {upi}
              </span>
            </div>
          </div>
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
        </div>

        {/* Amount Input */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-2 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Enter Amount (INR)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">₹</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
              className="w-full text-2xl font-black text-slate-900 dark:text-white bg-transparent focus:outline-none"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Equivalent in USDT</span>
            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
              ≈ {usdtEquivalent} USDT
            </span>
          </div>
        </div>

        {/* Note */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">
            Note / Remark
          </span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add payment remark"
            className="w-full text-xs bg-transparent focus:outline-none text-slate-900 dark:text-white"
          />
        </div>

        {/* Escrow Guarantee Pill */}
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-[11px]">
            Protected by FundFusion Escrow. USDT is released only when the merchant confirms settlement.
          </span>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 rounded-2xl bg-[#0a2316] text-white hover:bg-emerald-950 font-black text-xs shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Pay ₹{amount}.00 via USDT</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}

/* =========================================================================
   4. GIFT HUB (/customer/gift-cards)
   ========================================================================= */
export function GiftHub() {
  const { user } = useAuth()
  const { theme, toggle } = useTheme()
  const { fulfillGiftCardOrder } = useAdminStore()
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [boughtVoucher, setBoughtVoucher] = useState<{ brand: string; code: string; pin: string; message?: string } | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedPin, setCopiedPin] = useState(false)
  const [buyingBrand, setBuyingBrand] = useState<{ id: string; name: string; emoji: string; min: string; discount: string; cat?: string } | null>(null)
  const [selectedDenom, setSelectedDenom] = useState('500')
  const [customAmount, setCustomAmount] = useState('')
  const [playerUid, setPlayerUid] = useState('')

  const giftBrands = [
    { id: 'amazon', name: 'Amazon Pay Gift Card', cat: 'SHOPPING', discount: '5% Back', emoji: '📦', min: '₹100', recommended: true, badge: '🔥 Most Popular' },
    { id: 'flipkart', name: 'Flipkart Voucher', cat: 'SHOPPING', discount: '4% Back', emoji: '🛍️', min: '₹250', recommended: true, badge: '⚡ Super Fast' },
    { id: 'googleplay', name: 'Google Play Recharge Code', cat: 'GAMING', discount: 'Instant', emoji: '▶️', min: '₹50', recommended: true, badge: '🎮 Instant Code' },
    { id: 'freefire', name: 'Free Fire MAX Diamonds', cat: 'GAMING', discount: 'Bonus 10%', emoji: '💎', min: '₹80', recommended: true, badge: '🔥 Gaming Hot' },
    { id: 'bgmi', name: 'BGMI Unknown Cash (UC)', cat: 'GAMING', discount: 'Instant', emoji: '🪖', min: '₹75', recommended: true, badge: '⭐ Top Seller' },
    { id: 'swiggy', name: 'Swiggy Food & Instamart', cat: 'FOOD', discount: '6% Back', emoji: '🍔', min: '₹150', recommended: true, badge: '🍔 Instant Food' },
    { id: 'apple', name: 'Apple App Store & iTunes', cat: 'ENTERTAINMENT', discount: '2% Back', emoji: '🍎', min: '₹200', recommended: true, badge: '🎵 Apps & Music' },
    { id: 'zomato', name: 'Zomato Pro Dining Voucher', cat: 'FOOD', discount: '5% Back', emoji: '🍕', min: '₹150', recommended: false },
    { id: 'myntra', name: 'Myntra Fashion Voucher', cat: 'SHOPPING', discount: '6% Back', emoji: '👗', min: '₹500', recommended: false },
    { id: 'uber', name: 'Uber Rides & Eats Voucher', cat: 'TRAVEL', discount: 'Instant', emoji: '🚗', min: '₹200', recommended: false },
    { id: 'psn', name: 'PlayStation Store Wallet', cat: 'GAMING', discount: 'Instant', emoji: '🎮', min: '₹500', recommended: false },
    { id: 'netflix', name: 'Netflix Subscription Voucher', cat: 'ENTERTAINMENT', discount: 'Instant', emoji: '🎬', min: '₹649', recommended: false },
    { id: 'steam', name: 'Steam Wallet Card', cat: 'GAMING', discount: 'Instant', emoji: '🕹️', min: '₹250', recommended: false },
    { id: 'bookmyshow', name: 'BookMyShow Movies Voucher', cat: 'ENTERTAINMENT', discount: 'Instant', emoji: '🎟️', min: '₹200', recommended: false },
  ]

  const topRecommendations = giftBrands.filter((b) => b.recommended)

  const filteredBrands = giftBrands.filter((b) => {
    const matchCat =
      selectedCategory === 'ALL'
        ? true
        : selectedCategory === 'RECOMMENDED'
        ? b.recommended
        : b.cat === selectedCategory
    const matchSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.cat.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCat && matchSearch
  })

  const rate = 91.5
  const currentBuyAmount = customAmount ? parseFloat(customAmount) || 0 : parseFloat(selectedDenom) || 500
  const usdtCost = (currentBuyAmount / rate).toFixed(2)

  const handleConfirmPurchase = () => {
    if (!buyingBrand || currentBuyAmount <= 0) return
    const res = fulfillGiftCardOrder(buyingBrand.name, currentBuyAmount, user?.displayName || '@customer')
    setBuyingBrand(null)
    setCustomAmount('')
    setPlayerUid('')
    if (res.code) {
      setBoughtVoucher({ brand: buyingBrand.name, code: res.code, pin: res.pin || '—', message: res.message })
    } else {
      setBoughtVoucher({
        brand: buyingBrand.name,
        code: 'FORWARDED_TO_OTC_DESK',
        pin: 'Pending Procurement',
        message: res.message,
      })
    }
  }

  return (
    <div className="space-y-3.5 max-w-lg mx-auto w-full pb-28">
      {/* Top Header - One Line Responsive */}
      <div className="pb-2 border-b border-slate-100 dark:border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BackButton fallback="/customer/dashboard" />
            <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white whitespace-nowrap tracking-tight">
              Gift Cards & Vouchers
            </h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => toggle(e)}
              className="p-1.5 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle Color Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
            <Link
              to="/customer/gift-cards/orders"
              className="px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center gap-1 transition-all whitespace-nowrap shadow-2xs"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>My Vouchers</span>
            </Link>
          </div>
        </div>

        {/* Subtitle & Badge Sub-row */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-0.5">
          <span>Instant code & PIN delivery via USDT</span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
            100+ Brands
          </span>
        </div>
      </div>

      {/* Prominent Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Amazon, Free Fire, Flipkart, Swiggy, Steam..."
          className="w-full pl-10 pr-10 py-2.5 text-xs rounded-2xl bg-slate-50/80 dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900 dark:text-white placeholder:text-slate-400 shadow-2xs font-medium"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Top Recommendations Section */}
      {!searchQuery && selectedCategory === 'ALL' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>🔥 Top Recommended Vouchers</span>
            </h2>
            <span className="text-[10px] font-bold text-slate-400">Instant Delivery</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {topRecommendations.slice(0, 4).map((b) => (
              <div
                key={'top-' + b.id}
                onClick={() => setBuyingBrand(b)}
                className="p-3 rounded-2xl bg-gradient-to-br from-white via-amber-500/[0.02] to-slate-50 dark:from-[#111827] dark:via-amber-500/[0.03] dark:to-[#0f172a] border border-amber-500/30 dark:border-amber-500/25 shadow-2xs hover:shadow-md hover:border-amber-500/60 transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{b.emoji}</span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      {b.badge || b.discount}
                    </span>
                  </div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white line-clamp-2 min-h-[32px] leading-snug">
                    {b.name}
                  </h3>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                  <span className="text-slate-400 font-mono">Min {b.min}</span>
                  <span className="font-extrabold text-[#f7a83b] dark:text-[#f7a83b] group-hover:underline flex items-center gap-0.5">
                    <span>Buy</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Pills */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-0.5 px-0.5">
        {[
          { id: 'ALL', label: '🏷️ All' },
          { id: 'RECOMMENDED', label: '⭐ Top Picks' },
          { id: 'SHOPPING', label: '🛍️ Shopping' },
          { id: 'GAMING', label: '🎮 Gaming & Topup' },
          { id: 'FOOD', label: '🍔 Food' },
          { id: 'ENTERTAINMENT', label: '🎬 Entertainment' },
          { id: 'TRAVEL', label: '✈️ Travel' },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer',
              selectedCategory === cat.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* All Filtered Brands Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
          <span>Available Brands ({filteredBrands.length})</span>
          <span>Zero network fee</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {filteredBrands.map((b) => (
            <div
              key={b.id}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 flex flex-col justify-between space-y-3 hover:border-[#f7a83b]/50 hover:shadow-xs transition-all shadow-2xs group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{b.emoji}</span>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-700 dark:text-amber-400 border border-amber-400/25">
                    {b.discount}
                  </span>
                </div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white line-clamp-2 min-h-[32px] leading-snug">
                  {b.name}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">Min {b.min}</p>
              </div>

              <button
                type="button"
                onClick={() => setBuyingBrand(b)}
                className="w-full py-2 rounded-xl text-xs font-black bg-slate-100 dark:bg-slate-800 hover:bg-[#f7a83b] hover:text-slate-950 transition-all cursor-pointer text-slate-800 dark:text-slate-200 active:scale-95"
              >
                Buy Voucher
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Purchase Sheet / Modal */}
      {buyingBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111827] w-full max-w-[360px] rounded-[28px] p-5 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[90%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{buyingBrand.emoji}</span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">{buyingBrand.name}</h3>
                  <span className="text-[10px] font-bold text-[#f7a83b] dark:text-[#f7a83b]">{buyingBrand.discount}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBuyingBrand(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* In-Game Player ID if gaming brand */}
            {buyingBrand.cat === 'GAMING' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>Player UID / Character ID</span>
                  <span className="text-[#f7a83b] font-semibold text-[10px]">Instant Crediting</span>
                </label>
                <input
                  type="text"
                  value={playerUid}
                  onChange={(e) => setPlayerUid(e.target.value)}
                  placeholder="e.g. Free Fire UID / BGMI ID"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f7a83b]/40"
                />
              </div>
            )}

            {/* Denomination Choices */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Select Voucher Amount
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['100', '250', '500', '1000', '2500', '5000'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSelectedDenom(d)
                      setCustomAmount('')
                    }}
                    className={cn(
                      'py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer font-mono',
                      selectedDenom === d && !customAmount
                        ? 'border-[#f7a83b] bg-amber-400/15 text-amber-700 dark:text-amber-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    )}
                  >
                    ₹{d}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 block">Or Custom INR Amount</label>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter custom ₹ amount"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f7a83b]/40"
              />
            </div>

            {/* USDT Cost Banner */}
            <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">Total USDT Payable</span>
                <span className="text-base font-black text-[#f7a83b] dark:text-[#f7a83b] font-mono">
                  {usdtCost} USDT
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">1 USDT ≈ ₹{rate}</span>
            </div>

            {/* Buy CTA */}
            <button
              type="button"
              onClick={handleConfirmPurchase}
              disabled={currentBuyAmount <= 0}
              className="w-full py-3 rounded-2xl bg-[#f7a83b] hover:bg-[#f59e26] text-slate-950 font-black text-xs shadow-md shadow-amber-400/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
            >
              <span>Pay ₹{currentBuyAmount} with USDT</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Voucher Generated Modal (Only Rendered Once!) */}
      {boughtVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111827] w-full max-w-[360px] rounded-[28px] p-5 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Voucher Activated</span>
              </span>
              <button
                type="button"
                onClick={() => setBoughtVoucher(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {boughtVoucher.brand}
              </h3>
              <p className="text-xs text-slate-400">
                {boughtVoucher.message || 'Ready to redeem immediately'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Voucher Code</span>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
                  {boughtVoucher.code}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(boughtVoucher.code)
                    setCopiedCode(true)
                    setTimeout(() => setCopiedCode(false), 2000)
                  }}
                  className="p-1.5 text-xs text-emerald-600 font-bold hover:underline cursor-pointer"
                >
                  {copiedCode ? 'Copied!' : 'Copy Code'}
                </button>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Security PIN</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">
                    {boughtVoucher.pin}
                  </span>
                </div>
                {boughtVoucher.pin !== '—' && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(boughtVoucher.pin)
                      setCopiedPin(true)
                      setTimeout(() => setCopiedPin(false), 2000)
                    }}
                    className="p-1 text-xs text-slate-500 hover:text-emerald-600 font-bold cursor-pointer"
                  >
                    {copiedPin ? 'Copied!' : 'Copy PIN'}
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBoughtVoucher(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs cursor-pointer shadow-xs active:scale-98"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* =========================================================================
   5. GIFT BRAND & DETAIL (/customer/gift-cards/:brandId)
   ========================================================================= */
export function GiftBrand() {
  const { brandId } = useParams()
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  const denominations = [
    { inr: '250', usdt: '2.52' },
    { inr: '500', usdt: '5.04' },
    { inr: '1000', usdt: '10.09' },
    { inr: '2000', usdt: '20.18' },
  ]

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <BackButton fallback="/customer/gift-cards" />
        <div>
          <h1 className="text-base font-black text-slate-900 dark:text-white capitalize">
            {brandId?.replace('-', ' ') || 'Brand Voucher'}
          </h1>
          <p className="text-[11px] text-slate-500">Digital Gift Card Denominations</p>
        </div>
      </div>

      <div className="space-y-2">
        {denominations.map((d) => (
          <div
            key={d.inr}
            className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-2xs"
          >
            <div>
              <span className="text-sm font-black text-slate-900 dark:text-white block font-mono">
                ₹{d.inr}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                {d.usdt} USDT
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setCode(`VCH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`)
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0a2316] text-white hover:bg-emerald-950 transition-colors cursor-pointer"
            >
              Buy with USDT
            </button>
          </div>
        ))}
      </div>

      {code && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 space-y-1 text-center animate-in zoom-in-95">
          <span className="text-xs font-black text-emerald-600 block">Voucher Code Ready:</span>
          <span className="text-sm font-mono font-black text-slate-900 dark:text-white block">{code}</span>
        </div>
      )}
    </div>
  )
}

/* =========================================================================
   6. GIFT HISTORY (/customer/gift-cards/orders)
   ========================================================================= */
export function GiftHistory() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const history = [
    { id: '1', brand: 'Amazon Pay Gift Card', amount: '₹1,000', usdt: '10.92 USDT', code: 'AMZN-8921-9923', pin: '882910', date: 'Nov 10' },
    { id: '2', brand: 'Swiggy Food Voucher', amount: '₹250', usdt: '2.73 USDT', code: 'SWIG-1120-4491', pin: '102948', date: 'Oct 29' },
    { id: '3', brand: 'Google Play Code', amount: '₹500', usdt: '5.46 USDT', code: 'GPLY-9920-1102', pin: '002918', date: 'Oct 15' },
  ]

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <BackButton fallback="/customer/gift-cards" />
        <div>
          <h1 className="text-base font-black text-slate-900 dark:text-white">Purchased Vouchers</h1>
          <p className="text-[11px] text-slate-500">Your digital gift codes & PINs</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {history.map((h, idx) => (
          <div
            key={h.id}
            className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-2 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-900 dark:text-white block">{h.brand}</span>
                <span className="text-[10px] text-slate-400">{h.date}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-slate-900 dark:text-white block font-mono">{h.amount}</span>
                <span className="text-[10px] text-emerald-600 font-mono">{h.usdt}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Code:</span>
                <span className="text-xs font-mono font-black text-slate-900 dark:text-white">{h.code}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(h.code)
                  setCopiedIndex(idx)
                  setTimeout(() => setCopiedIndex(null), 2000)
                }}
                className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
              >
                {copiedIndex === idx ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* =========================================================================
   7. UTILITY FLOW (/customer/utilities/:service)
   ========================================================================= */
export function UtilityFlow({ service }: { service: string }) {
  const navigate = useNavigate()
  const [operator, setOperator] = useState('Jio')
  const [consumerId, setConsumerId] = useState('9876543210')
  const [amount, setAmount] = useState('299')
  const [receipt, setReceipt] = useState<string | null>(null)

  const usdtVal = (parseFloat(amount || '0') / 91.5).toFixed(2)

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault()
    setReceipt(`BBPS-${Date.now().toString().slice(-8)}`)
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <BackButton fallback="/customer/utilities" />
        <div>
          <h1 className="text-base font-black text-slate-900 dark:text-white uppercase">{service}</h1>
          <p className="text-[11px] text-slate-500">BBPS Zero-Fee USDT Settlement</p>
        </div>
      </div>

      {!receipt ? (
        <form onSubmit={handlePay} className="space-y-3.5">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-3 shadow-2xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                Select Operator / Board
              </span>
              <div className="flex gap-2">
                {['Jio', 'Airtel', 'Vi', 'BSNL'].map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setOperator(op)}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                      operator === op
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-black'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                Mobile Number / Consumer ID
              </span>
              <input
                type="text"
                value={consumerId}
                onChange={(e) => setConsumerId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold focus:outline-none"
              />
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                Recharge Amount (INR)
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-lg font-mono font-black focus:outline-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs">
              <span className="text-slate-400">USDT Required</span>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                ≈ {usdtVal} USDT
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-[#0a2316] text-white hover:bg-emerald-950 font-black text-xs shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            Pay with USDT Vault
          </button>
        </form>
      ) : (
        <div className="p-5 rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 text-center space-y-3 shadow-2xs">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-500 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">Recharge Successful!</h2>
          <p className="text-xs text-slate-500 font-mono">Ref ID: {receipt}</p>
          <button
            type="button"
            onClick={() => navigate('/customer/utilities')}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold"
          >
            Back to Bills
          </button>
        </div>
      )}
    </div>
  )
}

/* =========================================================================
   8. NOTIFICATION CENTER (/customer/notifications)
   ========================================================================= */
export function NoticeCenter() {
  const [filter, setFilter] = useState<'ALL' | 'ORDERS' | 'SYSTEM'>('ALL')
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications()

  const filtered = notifications.filter((n) => filter === 'ALL' || n.type === filter)

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/customer/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Notifications
            </h1>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span>Live alerts & trade updates</span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  {unreadCount} unread
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className={cn(
            'text-xs font-bold transition-all cursor-pointer',
            unreadCount > 0
              ? 'text-emerald-600 dark:text-emerald-400 hover:underline active:scale-95'
              : 'text-slate-400 dark:text-slate-500 cursor-default'
          )}
        >
          {unreadCount > 0 ? 'Mark all read' : 'All read ✓'}
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900/60">
        {[
          { id: 'ALL', label: `All Alerts (${notifications.length})` },
          { id: 'ORDERS', label: 'Orders & P2P' },
          { id: 'SYSTEM', label: 'System & Security' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id as any)}
            className={cn(
              'flex-1 py-1 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer truncate',
              filter === t.id
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Notices List */}
      <div className="space-y-2">
        {filtered.map((n) => (
          <div
            key={n.id}
            onClick={() => {
              if (n.unread) markAsRead(n.id)
            }}
            className={cn(
              'p-3.5 rounded-2xl border transition-all shadow-2xs space-y-1.5 relative cursor-pointer active:scale-[0.99]',
              n.unread
                ? 'bg-emerald-50/50 dark:bg-emerald-950/25 border-emerald-500/30 hover:border-emerald-500/50'
                : 'bg-white dark:bg-[#111827] border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                {n.unread && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                {n.title}
              </span>
              <div className="flex items-center gap-1.5">
                {n.unread && (
                  <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full">
                    NEW
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-mono">{n.time}</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{n.body}</p>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-slate-400 text-xs">
            No notifications in this category
          </div>
        )}
      </div>
    </div>
  )
}

/* =========================================================================
   9. SUPPORT DESK & TICKETS (/customer/support)
   ========================================================================= */
export function SupportDesk() {
  const [showCreate, setShowCreate] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [createdMsg, setCreatedMsg] = useState(false)

  const tickets = [
    { id: 't-101', subject: 'Escrow payment verification delay', status: 'IN_REVIEW', lastReply: 'Agent assigned (5m ago)' },
    { id: 't-98', subject: 'Query on Amazon gift voucher code redemption', status: 'RESOLVED', lastReply: 'Resolved on Oct 25' },
  ]

  const faqs = [
    { q: 'How does FundFusion USDT Escrow protect me?', a: 'When a trade begins, the sellers USDT is locked in a cryptographic multi-sig vault. Rupee transfers are verified before release, guaranteeing zero fraud risk.' },
    { q: 'How fast do UPI & QR payments settle?', a: 'Instant! In under 45 seconds, the merchant receives verified rupees while your USDT vault is safely debited.' },
    { q: 'Can I redeem Gift Cards anywhere?', a: 'Yes, all digital vouchers are 100% genuine codes redeemable directly on the official apps like Amazon, Flipkart, Swiggy, etc.' },
  ]

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault()
    setCreatedMsg(true)
    setTimeout(() => {
      setShowCreate(false)
      setCreatedMsg(false)
      setSubject('')
      setMessage('')
    }, 1500)
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/customer/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Help & Support
            </h1>
            <p className="text-[11px] text-slate-500">24/7 Live Desk & Ticket Resolution</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live 24×7</span>
        </div>
      </div>

      {/* 24/7 Live Chat Hero */}
      <div className="rounded-[28px] bg-gradient-to-tr from-[#0a2316] via-[#0d3420] to-[#0a2316] p-4.5 text-white shadow-xl border border-emerald-500/30 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
            Average Response: &lt; 2 mins
          </span>
          <h2 className="text-sm font-black">Chat with Escrow Arbitrator</h2>
          <p className="text-[11px] text-emerald-200/80">Available right now for order disputes & guidance.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shrink-0 cursor-pointer shadow-md transition-transform active:scale-95"
        >
          Open Ticket
        </button>
      </div>

      {/* Create Ticket Modal / Form */}
      {showCreate && (
        <form
          onSubmit={handleCreateTicket}
          className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-3 shadow-md animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 dark:text-white">Create Support Ticket</span>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject / Issue summary"
            required
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none"
          />

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue with order ID or transaction details..."
            rows={3}
            required
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none resize-none"
          />

          {createdMsg && (
            <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ticket submitted! An agent will respond shortly.</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#0a2316] text-white font-bold text-xs cursor-pointer"
          >
            Submit Support Request
          </button>
        </form>
      )}

      {/* Your Active Tickets */}
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Your Recent Tickets
        </h3>
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link
              key={t.id}
              to={`/customer/support/${t.id}`}
              className="p-3 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:border-emerald-500/40 transition-all shadow-2xs group block"
            >
              <div className="min-w-0">
                <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
                  {t.subject}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{t.lastReply}</span>
              </div>
              <span
                className={cn(
                  'text-[9px] font-black px-2 py-0.5 rounded-full shrink-0',
                  t.status === 'RESOLVED'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                )}
              >
                {t.status}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Instant FAQ Accordion */}
      <div className="space-y-2 pt-1">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Frequently Asked Questions
        </h3>
        <div className="space-y-2">
          {faqs.map((f, idx) => (
            <details
              key={idx}
              className="p-3 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 text-xs shadow-2xs group cursor-pointer"
            >
              <summary className="font-extrabold text-slate-900 dark:text-white flex items-center justify-between list-none">
                <span>{f.q}</span>
                <span className="text-slate-400 transition-transform group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-2">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   10. TICKET DETAIL (/customer/support/:ticketId)
   ========================================================================= */
export function TicketDetail() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([
    { id: '1', from: 'agent', text: 'Hello! I am your FundFusion dispute supervisor. How can I assist you with your escrow order?', time: '14:22' },
    { id: '2', from: 'user', text: 'I transferred ₹4,575 via UPI to the merchant, but the status is still showing Awaiting Payment.', time: '14:24' },
    { id: '3', from: 'agent', text: 'Thank you for sharing. Please provide the 12-digit bank UTR reference number so we can auto-verify with the banking switch.', time: '14:25' },
  ])
  const [inputVal, setInputVal] = useState('')

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputVal) return
    const newMsg = { id: `${Date.now()}`, from: 'user', text: inputVal, time: 'Just now' }
    setMessages((prev) => [...prev, newMsg])
    setInputVal('')

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now() + 1}`, from: 'agent', text: 'UTR received and verified with banking switch! Your escrow has been marked complete.', time: 'Just now' },
      ])
    }, 1200)
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4 flex flex-col h-[700px] max-h-[80vh]">
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <BackButton fallback="/customer/support" />
        <div>
          <h1 className="text-base font-black text-slate-900 dark:text-white">Ticket #{ticketId}</h1>
          <p className="text-[11px] text-slate-500">Live Escrow Arbitrator Chat</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 p-1 no-scrollbar">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed space-y-1',
              m.from === 'user'
                ? 'ml-auto bg-[#0a2316] text-white rounded-br-xs'
                : 'mr-auto bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-xs'
            )}
          >
            <p>{m.text}</p>
            <span
              className={cn(
                'text-[9px] block text-right font-mono',
                m.from === 'user' ? 'text-emerald-300' : 'text-slate-400'
              )}
            >
              {m.time}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="flex gap-2 shrink-0 pt-2 border-t border-slate-100 dark:border-slate-800">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Type message or paste UTR number..."
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none"
        />
        <button
          type="submit"
          className="p-2.5 rounded-xl bg-[#0a2316] text-white hover:bg-emerald-950 transition-colors cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}

/* =========================================================================
   11. ACCOUNT LIVE (Referrals, Rewards, Settings, Security)
   ========================================================================= */
export function AccountLive({ title }: { title: string }) {
  const { user } = useAuth()
  const [copiedRef, setCopiedRef] = useState(false)

  const isReferralOrRewards = title.toLowerCase().includes('referral') || title.toLowerCase().includes('reward')

  if (isReferralOrRewards) {
    return (
      <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <BackButton fallback="/customer/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Refer & Earn
            </h1>
            <p className="text-[11px] text-slate-500">Up to 40% Lifetime Trading Rebate</p>
          </div>
        </div>

        {/* Hero Card */}
        <div className="rounded-[28px] bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-600 p-5 text-white shadow-xl space-y-3">
          <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block">
            VIP Tier 2 • 30% Commission
          </span>
          <div>
            <div className="text-3xl font-black font-mono tracking-tight">$342.50 USDT</div>
            <span className="text-xs text-emerald-100 font-mono">≈ ₹31,338 INR Earned</span>
          </div>

          <div className="pt-2 border-t border-white/20 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-emerald-100 block">Total Referrals</span>
              <span className="font-bold text-white">18 Traders</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-100 block">Total Team Vol</span>
              <span className="font-bold font-mono text-white">$45,200</span>
            </div>
          </div>
        </div>

        {/* Referral Code Box */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-2.5 shadow-2xs">
          <span className="text-xs font-black text-slate-900 dark:text-white block">
            Your Exclusive Referral Code
          </span>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-wider">
              FUSION-VIP-99
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText('https://fundfusion.dev/register?ref=FUSION-VIP-99')
                setCopiedRef(true)
                setTimeout(() => setCopiedRef(false), 2000)
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0a2316] text-white hover:bg-emerald-950 transition-colors cursor-pointer"
            >
              {copiedRef ? 'Copied Link' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Invited Traders List */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Recent Referrals
          </h3>
          <div className="space-y-2">
            {[
              { name: 'Aarav_99', vol: '$1,200 USDT', earned: '+₹1,098', date: '2 days ago' },
              { name: 'RohanCrypto', vol: '$4,500 USDT', earned: '+₹4,117', date: '5 days ago' },
              { name: 'Sneha_Trader', vol: '$850 USDT', earned: '+₹777', date: 'Oct 28' },
            ].map((r, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs shadow-2xs"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">{r.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">Vol: {r.vol} • {r.date}</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-emerald-600 font-mono block">{r.earned}</span>
                  <span className="text-[9px] text-slate-400">Commission</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Settings / Security / Sessions / Verification
  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <BackButton fallback="/customer/dashboard" />
        <div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{title}</h1>
          <p className="text-[11px] text-slate-500">Security & Account Configuration</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-black text-slate-900 dark:text-white block">Email Address</span>
            <span className="text-[11px] text-slate-500 font-mono">{user?.email || 'customer@fundfusion.dev'}</span>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
            Verified
          </span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-black text-slate-900 dark:text-white block">KYC Verification</span>
            <span className="text-[11px] text-slate-500">PAN & Aadhaar Identity Match</span>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
            Tier 2 Active
          </span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-black text-slate-900 dark:text-white block">2FA Two-Factor Security</span>
            <span className="text-[11px] text-slate-500">Google Authenticator OTP</span>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
            Enabled
          </span>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <span className="text-xs font-black text-slate-900 dark:text-white block">Active Sessions</span>
            <span className="text-[11px] text-slate-500">Chrome on Windows (Current device)</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Active</span>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   12. PAY SCAN LIVE (/customer/pay/scan)
   ========================================================================= */
export function PayScanLive() {
  const navigate = useNavigate()
  return (
    <div className="p-4 text-center">
      <Link
        to="/customer/pay/scan"
        className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
      >
        Open QR Scanner
      </Link>
    </div>
  )
}
