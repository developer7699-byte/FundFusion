import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { DASHBOARD_CONFIG, type SectorCardItem } from '../dashboard.config'
import { cn } from '@/lib/utils'

interface MarketSectorGridProps {
  sectors?: SectorCardItem[]
  onSelectSector?: (sector: SectorCardItem) => void
}

// Token Icon SVGs for realistic crypto experience matching reference screenshot
function CryptoTokenIcon({ symbol }: { symbol: string }) {
  const s = symbol.toUpperCase()

  if (s.includes('ETH')) {
    return (
      <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
        <svg viewBox="0 0 32 32" className="w-3.5 h-3.5 fill-current">
          <path d="M16 2L6 18.5 16 24.5 26 18.5z" opacity="0.8" />
          <path d="M16 24.5L6 18.5 16 30 26 18.5z" />
        </svg>
      </div>
    )
  }

  if (s.includes('SOL')) {
    return (
      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-teal-400 text-white flex items-center justify-center shrink-0">
        <span className="text-[9px] font-black">S</span>
      </div>
    )
  }

  if (s.includes('ENA')) {
    return (
      <div className="w-5 h-5 rounded-full bg-slate-950 text-white flex items-center justify-center shrink-0 border border-slate-700">
        <span className="text-[9px] font-mono font-bold">Σ</span>
      </div>
    )
  }

  if (s.includes('XAUT') || s.includes('GOLD')) {
    return (
      <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
        <span className="text-[9px] font-bold">₮</span>
      </div>
    )
  }

  return (
    <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0 font-bold text-[9px]">
      {symbol.slice(0, 3)}
    </div>
  )
}

export function MarketSectorGrid({
  sectors = DASHBOARD_CONFIG.marketSectors,
  onSelectSector,
}: MarketSectorGridProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {sectors.map((item) => {
          const cardContent = (
            <div
              className={cn(
                'rounded-2xl p-3 sm:p-3.5 transition-all duration-200 group cursor-pointer text-left',
                'bg-white dark:bg-[#121829] border border-slate-100 dark:border-slate-800/80',
                'hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700'
              )}
            >
              {/* Top Row: Sector Name + Right Chevron */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors truncate">
                  {item.sectorName}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </div>

              {/* Bottom Row: Token Icon + Pair + Change Percentage */}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <CryptoTokenIcon symbol={item.symbol} />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {item.pair}
                  </span>
                </div>

                {/* 24h Change Badge (Red/Green pill matching screenshot) */}
                <span
                  className={cn(
                    'text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap',
                    item.isPositive
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                      : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                  )}
                >
                  {item.change}
                </span>
              </div>
            </div>
          )

          if (onSelectSector) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSector(item)}
                className="w-full text-left focus:outline-none"
              >
                {cardContent}
              </button>
            )
          }

          return (
            <Link key={item.id} to={item.link}>
              {cardContent}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

