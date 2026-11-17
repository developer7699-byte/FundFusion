import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Store,
  ShieldCheck,
  TrendingUp,
  ArrowDown,
  ArrowUp,
  Lock,
  History,
  ChevronRight,
  Building2,
  Sliders,
  Bell,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react'
import { useMerchantStore, type MerchantOrder } from '@/lib/merchant-store'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language'
import { ToastNotification } from '@/components/ui/ToastNotification'
import {
  DepositLiquidityModal,
  WithdrawPayoutModal,
  AcceptOrderModal,
  ReleaseEscrowModal,
  DisputeOrderModal,
} from './components/MerchantModals'

export function MerchantHome() {
  const { t } = useLanguage()
  const {
    deskName,
    isOnline,
    toggleDeskOnline,
    rating,
    totalTrades,
    completionRate,
    availableUsdt,
    lockedUsdt,
    availableOrders,
    myOrders,
    earnings,
  } = useMerchantStore()

  // State
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isDepositOpen, setIsDepositOpen] = useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const [selectedAcceptOrder, setSelectedAcceptOrder] = useState<MerchantOrder | null>(null)
  const [selectedReleaseOrder, setSelectedReleaseOrder] = useState<MerchantOrder | null>(null)
  const [selectedDisputeOrder, setSelectedDisputeOrder] = useState<MerchantOrder | null>(null)
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Filter orders needing immediate action (UTR submitted by buyer)
  const actionRequiredOrders = myOrders.filter((o) => o.status === 'UTR_SUBMITTED')
  // Active in progress orders
  const activeOrders = myOrders.filter((o) => o.status === 'AWAITING_PAYMENT' || o.status === 'UTR_SUBMITTED')

  const totalVaultUsdt = availableUsdt + lockedUsdt
  const inrEstimate = totalVaultUsdt * 91.5

  return (
    <div className="space-y-3.5 sm:space-y-4 max-w-lg mx-auto w-full pb-3 relative">
      {/* Toast Overlay */}
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* 1. TOP DESK IDENTITY & STATUS HERO */}
      <div className="rounded-3xl bg-gradient-to-tr from-[#0a2316] via-[#0d3420] to-[#0a2316] text-white p-4.5 sm:p-5 shadow-xl border border-emerald-500/30 relative overflow-hidden space-y-3.5">
        {/* Ambient background glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold shadow-md">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black tracking-tight">{deskName}</h1>
                <span className="p-0.5 rounded-full bg-emerald-400 text-slate-950 text-[9px] font-bold">
                  ✓
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 font-medium">
                {rating} Rating · {totalTrades} Settled Trades
              </p>
            </div>
          </div>

          {/* Verified Partner Badge */}
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm shrink-0">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Verified Desk</span>
          </span>
        </div>

        {/* Online / Offline Status Toggle Bar */}
        <div className="pt-1 flex items-center justify-between border-t border-emerald-500/20 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full',
                isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              )}
            />
            <span className="font-bold text-[11px] text-emerald-100">
              {isOnline ? 'Desk Active · Accepting Orders' : 'Desk Paused · Offline'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              toggleDeskOnline()
              showToast(isOnline ? 'Desk set to Offline' : 'Desk set to Online!')
            }}
            className={cn(
              'px-3 py-1 rounded-full text-[10px] font-black transition-all cursor-pointer',
              isOnline
                ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            )}
          >
            {isOnline ? 'Pause Desk' : 'Go Online'}
          </button>
        </div>
      </div>

      {/* 2. LIQUIDITY VAULT CARD */}
      <div className="w-full rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100/90 dark:border-slate-800/80 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Desk Liquidity Vault</span>
              <button
                type="button"
                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                className="p-0.5 rounded text-slate-400 hover:text-slate-600"
              >
                {isBalanceVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Rate: ₹91.50 / USDT
            </span>
          </div>

          {/* Large Balance Display */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
              {isBalanceVisible ? `$${totalVaultUsdt.toFixed(2)}` : '$••••••'}
            </span>
            <span className="text-xs text-slate-400 font-medium font-mono">
              (≈ ₹{isBalanceVisible ? inrEstimate.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '••••••'})
            </span>
          </div>

          {/* Vault Split Bar */}
          <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">{t('merchantDash.availableToTrade')}</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {isBalanceVisible ? `${availableUsdt.toFixed(2)} USDT` : '••••'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <span className="text-amber-500 block text-[10px] flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                {t('merchantDash.lockedEscrow')}
              </span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {isBalanceVisible ? `${lockedUsdt.toFixed(2)} USDT` : '••••'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Deposit USDT & Withdraw / Settle to Bank */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => setIsDepositOpen(true)}
            className="h-12 px-2.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <span>{t('merchantDash.deposit')}</span>
            <ArrowDown className="w-4 h-4 stroke-[2.5] shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setIsWithdrawOpen(true)}
            className="h-12 px-2.5 rounded-2xl bg-[#0c2417] dark:bg-[#10291e] hover:bg-[#133321] text-emerald-100 dark:text-emerald-300 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer border border-emerald-900/30 whitespace-nowrap"
          >
            <span>{t('merchantDash.withdraw')}</span>
            <ArrowUp className="w-4 h-4 stroke-[2.5] shrink-0" />
          </button>
        </div>
      </div>

      {/* 3. PERFORMANCE STATS (2x2 Balanced Responsive Grid) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Today Volume */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">{t('merchantDash.todayVolume')}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          </div>
          <p className="text-base font-black text-slate-900 dark:text-white font-mono tracking-tight">
            ₹{earnings.todayVolumeInr.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400 block font-medium">18 {t('merchantDash.tradesSettled')}</span>
        </div>

        {/* Today Net Fee */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-500">
            <span className="text-[10px] font-black uppercase tracking-wider">{t('merchantDash.todayNetFee')}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <p className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight whitespace-nowrap">
            +{earnings.todayCommissionUsdt.toFixed(2)} USDT
          </p>
          <span className="text-[10px] text-slate-400 block font-mono">
            ≈ ₹{(earnings.todayCommissionUsdt * 91.5).toFixed(0)} {t('merchantDash.earned')}
          </span>
        </div>

        {/* Active Escrows */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-[10px] font-black uppercase tracking-wider">{t('merchantDash.activeEscrows')}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          </div>
          <p className="text-base font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {activeOrders.length} {t('merchantDash.orders')}
          </p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-medium">
            {lockedUsdt.toFixed(2)} {t('merchantDash.locked')}
          </span>
        </div>

        {/* Completion */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">{t('merchantDash.completion')}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <p className="text-base font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {completionRate}%
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">
            {rating} ★ {t('merchantDash.rating')}
          </span>
        </div>
      </div>

      {/* 4. QUICK ACTION GRID */}
      <div className="grid grid-cols-4 gap-2 py-1">
        {[
          { label: t('merchantQuick.available'), icon: Store, to: '/merchant/available-orders', badge: `${availableOrders.length}` },
          { label: t('merchantQuick.escrows'), icon: Lock, to: '/merchant/active-orders', badge: activeOrders.length > 0 ? `${activeOrders.length}` : undefined },
          { label: t('merchantQuick.allOrders'), icon: History, to: '/merchant/orders' },
          { label: t('merchantQuick.earnings'), icon: TrendingUp, to: '/merchant/earnings' },
          { label: t('merchantQuick.banks'), icon: Building2, to: '/merchant/payment-methods' },
          { label: t('merchantQuick.limits'), icon: Sliders, to: '/merchant/settings' },
          { label: t('merchantQuick.alerts'), icon: Bell, to: '/merchant/notifications' },
          { label: t('merchantQuick.profile'), icon: UserCheck, to: '/merchant/profile' },
        ].map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="flex flex-col items-center justify-start group cursor-pointer text-center relative p-1"
          >
            <div className="relative mb-1">
              {item.badge && (
                <span className="absolute -top-1 -right-1 text-[8px] font-black px-1.5 py-0.2 rounded-full bg-emerald-500 text-white shadow-xs z-10">
                  {item.badge}
                </span>
              )}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 group-hover:bg-slate-100 dark:group-hover:bg-slate-700 group-hover:scale-105 border border-slate-200/50 dark:border-slate-700/60 shadow-xs">
                <item.icon className="w-5 h-5 group-hover:text-emerald-500 transition-colors" />
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[72px]">
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      {/* 5. HIGH PRIORITY: ACTION REQUIRED ORDERS (UTR SUBMITTED) */}
      {actionRequiredOrders.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              Action Required: Verify & Release
            </h2>
            <span className="text-[10px] font-mono text-slate-400 font-bold">
              {actionRequiredOrders.length} Pending
            </span>
          </div>

          <div className="space-y-2">
            {actionRequiredOrders.map((order) => (
              <div
                key={order.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border-2 border-emerald-500/40 shadow-md space-y-2.5 animate-in fade-in"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 block">
                      Order #{order.id} · {order.buyerName}
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                      ₹{order.inrAmount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-500 font-mono pl-1.5">
                      ({order.usdtAmount.toFixed(2)} USDT)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    UTR SUBMITTED
                  </span>
                </div>

                {/* UTR Pill */}
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Bank UTR Reference</span>
                    <p className="font-mono font-bold text-slate-900 dark:text-white">{order.utr}</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">{order.paymentMethod}</span>
                </div>

                {/* Dual Action Buttons */}
                <div className="flex gap-2 pt-1">
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. LIVE ORDER BOOK STREAM (AVAILABLE ORDERS) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Customer Orders (Available Book)
          </h2>
          <Link
            to="/merchant/available-orders"
            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
          >
            <span>View All ({availableOrders.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-2">
          {availableOrders.slice(0, 3).map((order) => (
            <div
              key={order.id}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800/80 shadow-2xs hover:border-emerald-500/40 transition-all space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                      {order.buyerName}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded-full">
                      {order.buyerRating}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Order #{order.id} · {order.paymentMethod}
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white block">
                    ₹{order.inrAmount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {order.usdtAmount.toFixed(2)} USDT
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                <span className="text-[10px] font-bold text-amber-500">
                  Est. Commission: +{((order.usdtAmount * 0.015)).toFixed(2)} USDT
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedAcceptOrder(order)}
                  className="py-1.5 px-3.5 rounded-xl bg-[#0a2316] dark:bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  Accept Order
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODALS */}
      <DepositLiquidityModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onSuccess={showToast}
      />
      <WithdrawPayoutModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onSuccess={showToast}
      />
      <AcceptOrderModal
        order={selectedAcceptOrder}
        isOpen={!!selectedAcceptOrder}
        onClose={() => setSelectedAcceptOrder(null)}
        onSuccess={showToast}
      />
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

