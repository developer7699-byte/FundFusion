import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

/**
 * There is no dealer list or rate table in v1: a price exists only as a quote
 * for a specific amount (PRD §7), so this card quotes none. The prototype
 * listed invented dealers and rupee prices here — market data nobody had
 * supplied — and nothing in its place is better than a number that is wrong.
 */
export function P2PRatesSection() {
  return (
    <div className="w-full rounded-2xl sm:rounded-3xl bg-white dark:bg-[#121829] border border-slate-100 dark:border-slate-800/80 p-3.5 sm:p-4 shadow-xs space-y-3">
      <div className="pb-2 border-b border-slate-100 dark:border-slate-800/80">
        <h2 className="text-xs font-black text-slate-900 dark:text-white">P2P USDT</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Prices are quoted for the amount you enter, and locked once you confirm.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/customer/buy"
          className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold"
        >
          <span>Buy USDT</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          to="/customer/sell"
          className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold"
        >
          <span>Sell USDT</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
