import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  History,
  Lock,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { useMerchantStore, type MerchantOrder } from '@/lib/merchant-store'
import { ReleaseEscrowModal, DisputeOrderModal } from './components/MerchantModals'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language'
import { ToastNotification } from '@/components/ui/ToastNotification'

export function MerchantOrders({ filter: defaultFilter }: { filter?: 'active' | 'done' | string }) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { myOrders } = useMerchantStore()
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>(
    defaultFilter === 'active' ? 'ACTIVE' : defaultFilter === 'done' ? 'COMPLETED' : 'ALL'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReleaseOrder, setSelectedReleaseOrder] = useState<MerchantOrder | null>(null)
  const [selectedDisputeOrder, setSelectedDisputeOrder] = useState<MerchantOrder | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const activeEscrowsCount = myOrders.filter(
    (o) => o.status === 'AWAITING_PAYMENT' || o.status === 'UTR_SUBMITTED'
  ).length

  const filteredOrders = myOrders.filter((o) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const match =
        o.id.toLowerCase().includes(q) ||
        o.buyerName.toLowerCase().includes(q) ||
        o.paymentMethod.toLowerCase().includes(q)
      if (!match) return false
    }

    if (activeTab === 'ACTIVE') {
      return o.status === 'AWAITING_PAYMENT' || o.status === 'UTR_SUBMITTED'
    }
    if (activeTab === 'COMPLETED') {
      return o.status === 'COMPLETED'
    }
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
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {t('merchantOrders.title')}
            </h1>
            <p className="text-[11px] text-slate-500">{t('merchantOrders.subtitle')}</p>
          </div>
        </div>

        <Link
          to="/merchant/available-orders"
          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
        >
          <span>Available</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by order ID or buyer name..."
          className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
      </div>

      {/* Tabs */}
      <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 gap-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={cn(
            'flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer',
            activeTab === 'ALL'
              ? 'bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          {t('merchantOrders.tabAll')} ({myOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ACTIVE')}
          className={cn(
            'flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
            activeTab === 'ACTIVE'
              ? 'bg-white dark:bg-[#1e293b] text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          <span>{t('merchantOrders.tabActive')}</span>
          {activeEscrowsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('COMPLETED')}
          className={cn(
            'flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer',
            activeTab === 'COMPLETED'
              ? 'bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          {t('merchantOrders.tabCompleted')}
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
            <History className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No orders found in this view</p>
            <Link
              to="/merchant/available-orders"
              className="inline-block text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-1"
            >
              Browse Available Orders →
            </Link>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isUtrSubmitted = order.status === 'UTR_SUBMITTED'
            const isCompleted = order.status === 'COMPLETED'
            const isAwaiting = order.status === 'AWAITING_PAYMENT'

            return (
              <div
                key={order.id}
                className={cn(
                  'p-4 rounded-3xl bg-white dark:bg-[#111827] border transition-all space-y-3 shadow-2xs',
                  isUtrSubmitted
                    ? 'border-2 border-emerald-500/50 dark:border-emerald-500/40'
                    : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-300'
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                        {order.buyerName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">#{order.id}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block pt-0.5">
                      {order.createdAt} · {order.paymentMethod}
                    </span>
                  </div>

                  {/* Status Badge */}
                  {isUtrSubmitted && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-pulse">
                      UTR SUBMITTED
                    </span>
                  )}
                  {isAwaiting && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      AWAITING INR
                    </span>
                  )}
                  {isCompleted && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      COMPLETED
                    </span>
                  )}
                </div>

                {/* Amounts */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Settlement Value</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                      ₹{order.inrAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Escrow USDT</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {order.usdtAmount.toFixed(2)} USDT
                    </span>
                  </div>
                </div>

                {/* UTR Banner if present */}
                {order.utr && (
                  <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
                    <span>UTR: <strong className="font-mono text-slate-900 dark:text-white">{order.utr}</strong></span>
                    {order.commissionEarned && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Fee: +{order.commissionEarned.toFixed(2)} USDT
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  {isUtrSubmitted ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedReleaseOrder(order)}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white text-xs font-black shadow-xs cursor-pointer active:scale-95 transition-all text-center"
                      >
                        Verify & Release USDT
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDisputeOrder(order)}
                        className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition-all cursor-pointer"
                      >
                        Dispute
                      </button>
                    </>
                  ) : (
                    <Link
                      to={`/merchant/orders/${order.id}`}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span>View Full Order Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <ReleaseEscrowModal
        order={selectedReleaseOrder}
        isOpen={!!selectedReleaseOrder}
        onClose={() => setSelectedReleaseOrder(null)}
        onSuccess={showToast}
      />
      <DisputeOrderModal
        order={selectedDisputeOrder}
        isOpen={!!selectedDisputeOrder}
        onClose={() => setSelectedDisputeOrder(null)}
        onSuccess={showToast}
      />
    </div>
  )
}

