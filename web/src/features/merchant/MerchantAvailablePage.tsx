import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Store,
  CheckCircle2,
  Lock,
  ArrowLeft,
  ChevronRight,
  Filter,
  Sparkles,
  Search,
} from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { useMerchantStore, type MerchantOrder } from '@/lib/merchant-store'
import { AcceptOrderModal } from './components/MerchantModals'
import { cn } from '@/lib/utils'
import { ToastNotification } from '@/components/ui/ToastNotification'

export function MerchantAvailable() {
  const { availableOrders, availableUsdt } = useMerchantStore()
  const [filter, setFilter] = useState<'ALL' | 'UPI' | 'IMPS' | 'HIGH'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<MerchantOrder | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const filteredOrders = availableOrders.filter((o) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const match =
        o.id.toLowerCase().includes(q) ||
        o.buyerName.toLowerCase().includes(q) ||
        o.paymentMethod.toLowerCase().includes(q)
      if (!match) return false
    }

    if (filter === 'UPI') return o.paymentType === 'UPI'
    if (filter === 'IMPS') return o.paymentType === 'IMPS' || o.paymentType === 'BANK'
    if (filter === 'HIGH') return o.inrAmount >= 25000
    return true
  })

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4 relative">
      {/* Toast Notification */}
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/merchant/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Available Order Book</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                {availableOrders.length}
              </span>
            </h1>
            <p className="text-[11px] text-slate-500">Pick up orders to lock escrow & earn fees</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 block">Available</span>
          <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
            {availableUsdt.toFixed(2)} USDT
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by order ID or buyer username..."
          className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
        {[
          { id: 'ALL', label: 'All Orders' },
          { id: 'UPI', label: 'Instant UPI' },
          { id: 'IMPS', label: 'IMPS Bank' },
          { id: 'HIGH', label: 'High Value (₹25K+)' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id as any)}
            className={cn(
              'px-3 py-1.5 rounded-full font-bold text-xs shrink-0 transition-all cursor-pointer',
              filter === f.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Available Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
            <Store className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No available orders matching filter</p>
            <p className="text-[11px] text-slate-500">New customer orders will appear here automatically.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const canAfford = availableUsdt >= order.usdtAmount
            return (
              <div
                key={order.id}
                className={cn(
                  "p-4 rounded-3xl bg-white dark:bg-[#111827] border shadow-2xs hover:border-emerald-500/40 transition-all space-y-3",
                  order.isLiveBroadcast
                    ? "border-amber-400 dark:border-amber-600/70 shadow-amber-500/10"
                    : "border-slate-100 dark:border-slate-800/90"
                )}
              >
                {/* Live Broadcast Badge */}
                {order.isLiveBroadcast && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-black">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>⚡ LIVE BROADCAST REQUEST · First merchant desk to accept locks escrow</span>
                  </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                        {order.buyerName}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded-full">
                        {order.buyerRating}
                      </span>
                      <span className="text-[10px] text-slate-400">({order.buyerTrades} trades)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block pt-0.5">
                      Order #{order.id} · {order.createdAt}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-slate-900 dark:text-white font-mono block">
                      ₹{order.inrAmount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                      {order.usdtAmount.toFixed(2)} USDT
                    </span>
                  </div>
                </div>

                {/* Details Strip */}
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Payment Rail</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{order.paymentMethod}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Est. Fee Earnings</span>
                    <span className="font-mono font-black text-amber-500">
                      +{((order.usdtAmount * 0.015)).toFixed(2)} USDT
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    {canAfford ? 'Escrow will lock upon accept' : 'Insufficient vault balance'}
                  </span>
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => setSelectedOrder(order)}
                    className="py-2 px-5 rounded-xl bg-[#0a2316] dark:bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    Accept Order
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <AcceptOrderModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onSuccess={showToast}
      />
    </div>
  )
}

