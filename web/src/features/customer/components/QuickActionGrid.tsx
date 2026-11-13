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
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language'

interface QuickActionGridProps {
  onOpenMore?: () => void
  onAction?: (actionId: string) => void
}

export function QuickActionGrid({ onOpenMore, onAction }: QuickActionGridProps) {
  const { t } = useLanguage()

  const actions = [
    {
      id: 'wallet',
      label: t('dash.wallet'),
      icon: Wallet,
      to: '/customer/wallet',
    },
    {
      id: 'buy',
      label: t('dash.buy'),
      icon: ArrowDownToLine,
      to: '/customer/buy',
    },
    {
      id: 'gifts',
      label: t('dash.gifts'),
      icon: Gift,
      actionId: 'gifts',
    },
    {
      id: 'bills',
      label: t('dash.bills'),
      icon: Receipt,
      badge: '$50K',
      badgeColor: 'bg-emerald-500 text-white',
      actionId: 'bills',
    },
    {
      id: 'offers',
      label: t('dash.offers'),
      icon: Percent,
      actionId: 'offers',
    },
    {
      id: 'cards',
      label: t('dash.cards'),
      icon: CreditCard,
      actionId: 'cards',
    },
    {
      id: 'community',
      label: t('dash.community'),
      icon: Users,
      badge: 'Top',
      badgeColor: 'bg-emerald-500 text-white',
      actionId: 'community',
    },
    {
      id: 'more',
      label: t('dash.more'),
      icon: MoreHorizontal,
      isMore: true,
    },
  ]

  return (
    <div className="w-full py-1">
      <div className="grid grid-cols-4 gap-y-3.5 sm:gap-y-4 gap-x-2">
        {actions.map((item) => {
          const Icon = item.icon

          const btnContent = (
            <div className="flex flex-col items-center justify-start group cursor-pointer text-center relative">
              <div className="relative mb-1.5">
                {/* Badge if present (like $50K or Top in Screenshot 3) */}
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
                    'group-hover:bg-slate-100 dark:group-hover:bg-slate-700 group-hover:scale-105 active:scale-95',
                    'border border-slate-200/50 dark:border-slate-700/60'
                  )}
                >
                  <Icon className="w-5 h-5 stroke-[1.8] group-hover:text-emerald-500 transition-colors" />
                </div>
              </div>

              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-tight line-clamp-1 max-w-[76px] group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {item.label}
              </span>
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
                {btnContent}
              </button>
            )
          }

          if (item.actionId && onAction) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onAction(item.actionId!)}
                className="focus:outline-none"
                aria-label={item.label}
              >
                {btnContent}
              </button>
            )
          }

          if (item.to) {
            return (
              <Link key={item.id} to={item.to}>
                {btnContent}
              </Link>
            )
          }

          return <div key={item.id}>{btnContent}</div>
        })}
      </div>
    </div>
  )
}
