import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  Lock,
  Building2,
} from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { useMerchantStore } from '@/lib/merchant-store'
import { DepositLiquidityModal, WithdrawPayoutModal } from './components/MerchantModals'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language'
import { ToastNotification } from '@/components/ui/ToastNotification'

export function MerchantWallet() {
  const { t } = useLanguage()
  const { availableUsdt, lockedUsdt, ledger, accounts } = useMerchantStore()
  const [isDepositOpen, setIsDepositOpen] = useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const totalVault = availableUsdt + lockedUsdt
  const inrEstimate = totalVault * 91.5
  const defaultBank = accounts.find((a) => a.isDefault) || accounts[0]

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
              {t('merchantWallet.title')}
            </h1>
            <p className="text-[11px] text-slate-500">{t('merchantWallet.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Liquidity Vault Card */}
      <div className="rounded-3xl bg-gradient-to-tr from-[#0a2316] via-[#0d3420] to-[#0a2316] text-white p-5 shadow-xl border border-emerald-500/30 relative overflow-hidden space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs text-emerald-300">
            <span>Total Desk Balance</span>
            <span className="font-mono font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full">
              Rate: ₹91.50
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono">
              ${totalVault.toFixed(2)}
            </span>
            <span className="text-xs text-emerald-200/80 font-mono">
              (≈ ₹{inrEstimate.toLocaleString('en-IN', { maximumFractionDigits: 0 })})
            </span>
          </div>
        </div>

        {/* Split Details */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-3 rounded-2xl bg-white/10 border border-white/10 space-y-0.5">
            <span className="text-emerald-200 text-[10px] block">Available to Trade</span>
            <span className="font-mono font-bold text-sm text-white">
              {availableUsdt.toFixed(2)} USDT
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 space-y-0.5">
            <span className="text-amber-200 text-[10px] block flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Locked Escrow
            </span>
            <span className="font-mono font-bold text-sm text-amber-300">
              {lockedUsdt.toFixed(2)} USDT
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => setIsDepositOpen(true)}
            className="h-12 px-2.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <span>{t('merchantDash.deposit')}</span>
            <ArrowDown className="w-4 h-4 stroke-[2.5] shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setIsWithdrawOpen(true)}
            className="h-12 px-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer border border-white/20 whitespace-nowrap"
          >
            <span>{t('merchantDash.withdraw')}</span>
            <ArrowUp className="w-4 h-4 stroke-[2.5] shrink-0" />
          </button>
        </div>
      </div>

      {/* Primary Settlement Bank Card */}
      {defaultBank && (
        <div className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white">{defaultBank.label}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-600">
                  Default
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">{defaultBank.details}</p>
            </div>
          </div>

          <Link
            to="/merchant/payment-methods"
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Manage
          </Link>
        </div>
      )}

      {/* Ledger History */}
      <div className="space-y-2">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
          Vault Ledger & Settlements
        </h2>

        <div className="space-y-2">
          {ledger.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800/80 shadow-2xs flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {item.title}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {item.timestamp} · {item.secondaryAmount}
                </span>
              </div>

              <div className="text-right">
                <span
                  className={cn(
                    'font-mono font-black text-xs block',
                    item.type === 'CREDIT' || item.type === 'COMMISSION'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : item.type === 'ESCROW_LOCK'
                      ? 'text-amber-500'
                      : 'text-slate-900 dark:text-white'
                  )}
                >
                  {item.amount}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

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
    </div>
  )
}

