import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language'

interface TotalAssetsCardProps {
  totalUsdt?: string
  inrEstimate?: string
  usdtInrRate?: string
  onOpenDeposit?: () => void
  onOpenSell?: () => void
}

export function TotalAssetsCard({
  totalUsdt = '0.00',
  inrEstimate = '0.00',
  usdtInrRate = '91.50',
  onOpenDeposit,
  onOpenSell,
}: TotalAssetsCardProps) {
  const { t } = useLanguage()
  const [isVisible, setIsVisible] = useState(true)
  const rawBalance = parseFloat(totalUsdt) || 0

  return (
    <div className="w-full rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100/90 dark:border-slate-800/80 p-4 sm:p-5 shadow-xs space-y-4">
      {/* 1. Label & Eye Toggle */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <span className="text-xs sm:text-sm font-medium">{t('dash.totalAssets')}</span>
          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            className="p-0.5 rounded hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title={isVisible ? 'Hide balance' : 'Show balance'}
            aria-label="Toggle balance visibility"
          >
            {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* 2. Large Balance Display Matching Screenshot 3 */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
            {isVisible ? `$${rawBalance.toFixed(2)}` : '$••••••'}
          </span>
        </div>

        {/* 3. Tether USDT Network Badge */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <div className="w-4 h-4 rounded-full bg-[#f7a83b] text-slate-950 flex items-center justify-center font-black text-[9px] shadow-2xs">
            ₮
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            USDT, across all networks
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            (≈ ₹{isVisible ? inrEstimate : '••••'})
          </span>
        </div>
      </div>

      {/* 4. Two Action Buttons (Deposit ↓ and Sell Crypto ↑) Matching White & Orange Theme */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        {/* Deposit Button (Lighter Warm Honey-Orange Pill matching Image 2) */}
        {onOpenDeposit ? (
          <button
            type="button"
            onClick={onOpenDeposit}
            className="py-3 px-4 rounded-2xl bg-[#f7a83b] hover:bg-[#f59e26] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm shadow-amber-400/25 active:scale-95 transition-all cursor-pointer"
          >
            <span>{t('dash.deposit')}</span>
            <ArrowDown className="w-4 h-4 stroke-[2.5]" />
          </button>
        ) : (
          <Link to="/customer/wallet/deposit">
            <button
              type="button"
              className="w-full py-3 px-4 rounded-2xl bg-[#f7a83b] hover:bg-[#f59e26] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm shadow-amber-400/25 active:scale-95 transition-all cursor-pointer"
            >
              <span>{t('dash.deposit')}</span>
              <ArrowDown className="w-4 h-4 stroke-[2.5]" />
            </button>
          </Link>
        )}

        {/* Sell Crypto Button (Clean Modern Slate with Subtle Border) */}
        {onOpenSell ? (
          <button
            type="button"
            onClick={onOpenSell}
            className="py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700/80"
          >
            <span>{t('dash.sell')}</span>
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        ) : (
          <Link to="/customer/sell">
            <button
              type="button"
              className="w-full py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700/80"
            >
              <span>{t('dash.sell')}</span>
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </Link>
        )}
      </div>
    </div>
  )
}
