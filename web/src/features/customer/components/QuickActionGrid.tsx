import { Link } from 'react-router-dom'
import {
  Wallet,
  ArrowDownToLine,
  Gift,
  Receipt,
  Percent,
  CreditCard,
  Users,
  MoreHorizontal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language'
import { ParkedAction } from '@/components/ui/ParkedAction'

interface QuickActionGridProps {
  onOpenMore?: () => void
}

/**
 * main's tile positions. Wallet and Buy are the only real v1 destinations;
 * the rest are out of v1 (PRD §3) and render as inert <ParkedAction> tiles
 * with no route, no store and no API behind them.
 */
export function QuickActionGrid({ onOpenMore }: QuickActionGridProps) {
  const { t } = useLanguage()

  const actions: Array<{
    id: string
    label: string
    icon: LucideIcon
    to?: string
    parked?: boolean
    isMore?: boolean
    badge?: string
    badgeColor?: string
  }> = [
    { id: 'wallet', label: t('dash.wallet'), icon: Wallet, to: '/customer/wallet' },
    { id: 'buy', label: t('dash.buy'), icon: ArrowDownToLine, to: '/customer/buy' },
    { id: 'gifts', label: t('dash.gifts'), icon: Gift, parked: true },
    { id: 'bills', label: t('dash.bills'), icon: Receipt, parked: true, badge: '$50K', badgeColor: 'bg-emerald-500 text-white' },
    { id: 'offers', label: t('dash.offers'), icon: Percent, parked: true },
    { id: 'cards', label: t('dash.cards'), icon: CreditCard, parked: true },
    { id: 'community', label: t('dash.community'), icon: Users, parked: true, badge: 'Top', badgeColor: 'bg-emerald-500 text-white' },
    { id: 'more', label: t('dash.more'), icon: MoreHorizontal, isMore: true },
  ]

  return (
    <div className="w-full py-1">
      <div className="grid grid-cols-4 gap-y-3.5 sm:gap-y-4 gap-x-2">
        {actions.map((item) => {
          const Icon = item.icon

          const tile = (
            <div className="relative mb-1.5">
              {item.badge && (
                <span
                  className={cn(
                    'absolute -top-1.5 -right-1 text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-xs z-10 scale-90',
                    item.badgeColor || 'bg-emerald-500 text-white'
                  )}
                >
                  {item.badge}
                </span>
              )}
              <div
                className={cn(
                  'w-13 h-13 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-xs',
                  'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200',
                  !item.parked &&
                    'group-hover:bg-slate-100 dark:group-hover:bg-slate-700 group-hover:scale-105 active:scale-95',
                  'border border-slate-200/50 dark:border-slate-700/60'
                )}
              >
                <Icon className="w-5 h-5 stroke-[1.8] group-hover:text-emerald-500 transition-colors" />
              </div>
            </div>
          )
          const labelClass =
            'text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-tight line-clamp-1 max-w-[76px] group-hover:text-slate-900 dark:group-hover:text-white transition-colors'
          const wrap = 'flex flex-col items-center justify-start group text-center relative'

          if (item.parked) {
            return (
              <ParkedAction key={item.id} label={item.label} className={wrap} labelClassName={labelClass}>
                {tile}
              </ParkedAction>
            )
          }

          const content = (
            <div className={cn(wrap, 'cursor-pointer')}>
              {tile}
              <span className={labelClass}>{item.label}</span>
            </div>
          )

          if (item.isMore) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={onOpenMore}
                className="focus:outline-none"
                aria-label="View all platform features"
              >
                {content}
              </button>
            )
          }

          return (
            <Link key={item.id} to={item.to!}>
              {content}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
