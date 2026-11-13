import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { DASHBOARD_CONFIG, type MarketTokenItem } from '../dashboard.config'
import { cn } from '@/lib/utils'

interface MarketsTableSectionProps {
  activeCategory?: string
  onSelectToken?: (token: MarketTokenItem) => void
}

export function MarketsTableSection({
  activeCategory = 'all',
  onSelectToken,
}: MarketsTableSectionProps) {
  const [subFilter, setSubFilter] = useState<'hot' | 'gainers' | 'losers' | 'volume'>('hot')
  const allTokens = DASHBOARD_CONFIG.marketTokens

  // Filter according to category and subfilter
  const filtered = allTokens
    .filter((token) => {
      if (activeCategory === 'all') return true
      return token.category === activeCategory
    })
    .sort((a, b) => {
      if (subFilter === 'gainers') {
        return parseFloat(b.change24h) - parseFloat(a.change24h)
      }
      if (subFilter === 'losers') {
        return parseFloat(a.change24h) - parseFloat(b.change24h)
      }
      return 0
    })

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#121829] border border-slate-100 dark:border-slate-800/80 p-3.5 sm:p-4 shadow-xs">
      {/* Sub-filter tabs */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5 mb-2.5">
        <div className="flex items-center gap-3 sm:gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSubFilter('hot')}
            className={cn(
              'pb-1 cursor-pointer transition-colors relative',
              subFilter === 'hot'
                ? 'text-slate-900 dark:text-white font-extrabold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            Hot
            {subFilter === 'hot' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-amber-500 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubFilter('gainers')}
            className={cn(
              'pb-1 cursor-pointer transition-colors relative',
              subFilter === 'gainers'
                ? 'text-slate-900 dark:text-white font-extrabold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            Gainers
            {subFilter === 'gainers' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-amber-500 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubFilter('losers')}
            className={cn(
              'pb-1 cursor-pointer transition-colors relative',
              subFilter === 'losers'
                ? 'text-slate-900 dark:text-white font-extrabold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            Losers
            {subFilter === 'losers' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-amber-500 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubFilter('volume')}
            className={cn(
              'pb-1 cursor-pointer transition-colors relative',
              subFilter === 'volume'
                ? 'text-slate-900 dark:text-white font-extrabold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            24h Vol
            {subFilter === 'volume' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-amber-500 rounded-full" />
            )}
          </button>
        </div>

        <Link
          to="/customer/buy"
          className="text-[11px] font-bold text-amber-500 hover:text-amber-600 flex items-center gap-0.5"
        >
          <span>All Markets</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Token List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {filtered.map((item) => {
          const rowContent = (
            <div className="flex items-center justify-between py-2.5 sm:py-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl px-1.5 transition-colors group cursor-pointer w-full text-left">
              {/* Left: Token info */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-800 dark:text-slate-200 shrink-0">
                  {item.symbol.slice(0, 3)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                      {item.pair}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate">
                    Vol {item.volume24h}
                  </span>
                </div>
              </div>

              {/* Right: Last Price + 24h Change Badge */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block font-mono">
                    {item.lastPrice}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {item.inrPrice}
                  </span>
                </div>

                <div
                  className={cn(
                    'min-w-[62px] text-center text-xs font-bold py-1 px-2 rounded-lg text-white font-mono',
                    item.isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                  )}
                >
                  {item.change24h}
                </div>
              </div>
            </div>
          )

          if (onSelectToken) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectToken(item)}
                className="w-full text-left focus:outline-none"
              >
                {rowContent}
              </button>
            )
          }

          return (
            <Link key={item.id} to={`/customer/buy?pair=${item.symbol}`}>
              {rowContent}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

