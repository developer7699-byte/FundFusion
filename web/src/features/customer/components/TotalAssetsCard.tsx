import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowDown, ArrowUp } from 'lucide-react'
import { usdt2dp } from '@/lib/utils'
import { useLanguage } from '@/lib/language'

interface TotalAssetsCardProps {
  /** A string at full scale, straight from the ledger (PRD §5.1). Shown at 2dp; never parsed. */
  availableUsdt?: string
  onOpenDeposit?: () => void
  onOpenSell?: () => void
}

export function TotalAssetsCard({
  availableUsdt = '0.000000000000000000',
  onOpenDeposit,
  onOpenSell,
}: TotalAssetsCardProps) {
  const { t } = useLanguage()
  const [isVisible, setIsVisible] = useState(true)

  return (
    <div data-testid="total-assets-card" className="w-full rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100/90 dark:border-slate-800/80 p-4 sm:p-5 shadow-xs space-y-4">
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
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono break-all">
            {isVisible ? usdt2dp(availableUsdt) : '••••••'}
          </span>
        </div>

        {/* 3. Tether USDT Network Badge */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[9px]">
            ₮
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            USDT available to spend
          </span>
        </div>
      </div>

      {/* 4. Two Action Buttons (Deposit ↓ and Sell Crypto ↑) Matching Screenshot 3 */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        {/* Deposit Button (Bright Green) */}
        {onOpenDeposit ? (
          <button
            type="button"
            onClick={onOpenDeposit}
            className="py-3 px-4 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <span>{t('dash.deposit')}</span>
            <ArrowDown className="w-4 h-4 stroke-[2.5]" />
          </button>
        ) : (
          <Link to="/customer/wallet/deposit">
            <button
              type="button"
              className="w-full py-3 px-4 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>{t('dash.deposit')}</span>
              <ArrowDown className="w-4 h-4 stroke-[2.5]" />
            </button>
          </Link>
        )}

        {/* Sell Crypto Button (Dark Slate/Forest Green) */}
        {onOpenSell ? (
          <button
            type="button"
            onClick={onOpenSell}
            className="py-3 px-4 rounded-2xl bg-[#0c2417] dark:bg-[#10291e] hover:bg-[#133321] text-emerald-100 dark:text-emerald-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer border border-emerald-900/30"
          >
            <span>{t('dash.sell')}</span>
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        ) : (
          <Link to="/customer/sell">
            <button
              type="button"
              className="w-full py-3 px-4 rounded-2xl bg-[#0c2417] dark:bg-[#10291e] hover:bg-[#133321] text-emerald-100 dark:text-emerald-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer border border-emerald-900/30"
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
