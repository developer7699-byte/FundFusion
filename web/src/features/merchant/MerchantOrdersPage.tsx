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
import { useAdminStore, type GiftCardOrderRouteLog } from '@/lib/admin-store'
import { ReleaseEscrowModal, DisputeOrderModal } from './components/MerchantModals'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language'
import { ToastNotification } from '@/components/ui/ToastNotification'
import { Gift, X } from 'lucide-react'

export function MerchantOrders({ filter: defaultFilter }: { filter?: 'active' | 'done' | string }) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { myOrders } = useMerchantStore()
  const { giftCardRouteLogs, merchantFulfillGiftCard } = useAdminStore()
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'VOUCHERS'>(
    defaultFilter === 'active' ? 'ACTIVE' : defaultFilter === 'done' ? 'COMPLETED' : 'ALL'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReleaseOrder, setSelectedReleaseOrder] = useState<MerchantOrder | null>(null)
  const [selectedDisputeOrder, setSelectedDisputeOrder] = useState<MerchantOrder | null>(null)
  const [selectedVoucherOrder, setSelectedVoucherOrder] = useState<GiftCardOrderRouteLog | null>(null)
  const [voucherCodeInput, setVoucherCodeInput] = useState('')
  const [voucherPinInput, setVoucherPinInput] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const forwardedVouchers = giftCardRouteLogs.filter((l) => l.fulfillmentTier === 'TIER_3_MERCHANT_DESK')

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
        <button
          type="button"
          onClick={() => setActiveTab('VOUCHERS')}
          className={cn(
            'flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1',
            activeTab === 'VOUCHERS'
              ? 'bg-white dark:bg-[#1e293b] text-amber-500 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          <span>Vouchers</span>
          {forwardedVouchers.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-slate-950">
              {forwardedVouchers.length}
            </span>
          )}
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {activeTab === 'VOUCHERS' ? (
          forwardedVouchers.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <Gift className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Forwarded Voucher Orders</p>
              <p className="text-[11px] text-slate-400">All gift card orders are currently in-stock or fulfilled via API.</p>
            </div>
          ) : (
            forwardedVouchers.map((v) => (
              <div
                key={v.id}
                className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-amber-500/40 shadow-xs space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-500 block">
                      Procurement #{v.id} · {v.buyerName}
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {v.brand}
                    </span>
                    <span className="text-xs text-slate-400 font-mono block">
                      Value: ₹{v.denominationInr.toLocaleString('en-IN')} (${v.usdtAmount} USDT)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    {v.status === 'MERCHANT_COMPLETED' ? 'COMPLETED' : 'ACTION REQUIRED'}
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  Auto-forwarded from Router because local vault & API were out-of-stock. Fulfill to earn 1.5% commission!
                </div>

                {v.status !== 'MERCHANT_COMPLETED' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVoucherOrder(v)
                      setVoucherCodeInput('')
                      setVoucherPinInput('')
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-transform active:scale-95 cursor-pointer text-center"
                  >
                    Enter Retail Voucher & Fulfill
                  </button>
                ) : (
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-mono flex justify-between">
                    <span>Code: <strong>{v.voucherCode}</strong></span>
                    <span>Status: <strong className="text-emerald-500">Delivered</strong></span>
                  </div>
                )}
              </div>
            ))
          )
        ) : filteredOrders.length === 0 ? (
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

      {/* Manual Voucher Fulfillment Modal */}
      {selectedVoucherOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111827] w-full max-w-sm rounded-[28px] p-5 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-amber-500 font-bold">#{selectedVoucherOrder.id}</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Manual Voucher Fulfillment</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVoucherOrder(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Procure {selectedVoucherOrder.brand} (₹{selectedVoucherOrder.denominationInr}) and enter the voucher details below:
            </p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter Voucher Code (e.g. AMZN-1920-8910)"
                value={voucherCodeInput}
                onChange={(e) => setVoucherCodeInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Enter Security PIN (e.g. 8829)"
                value={voucherPinInput}
                onChange={(e) => setVoucherPinInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedVoucherOrder(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!voucherCodeInput.trim()) {
                    showToast('Please enter a voucher code')
                    return
                  }
                  merchantFulfillGiftCard(selectedVoucherOrder.id, voucherCodeInput.trim(), voucherPinInput.trim() || '—', 'Orbit Desk LLP')
                  showToast('Voucher delivered to customer! Rebate credited.')
                  setSelectedVoucherOrder(null)
                }}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

