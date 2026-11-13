import { useState } from 'react'
import { Menu, SlidersHorizontal } from 'lucide-react'
import { DASHBOARD_CONFIG, type TabCategory } from '../dashboard.config'
import { cn } from '@/lib/utils'

interface DashboardTabsProps {
  activeTab: string
  onTabChange: (tabId: string) => void
  onToggleFilter?: () => void
}

export function DashboardTabs({ activeTab, onTabChange, onToggleFilter }: DashboardTabsProps) {
  const categories = DASHBOARD_CONFIG.categories

  return (
    <div className="w-full flex items-center justify-between gap-2 py-1 px-0.5 overflow-hidden">
      {/* Scrollable Category Pill Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-1 py-1">
        {categories.map((cat) => {
          const isActive = activeTab === cat.id

          return (
            <div key={cat.id} className="relative shrink-0">
              {/* Optional Floating Badge (e.g. "New" over Stocks) */}
              {cat.badge && (
                <span
                  className={cn(
                    'absolute -top-1.5 right-0.5 text-[8px] font-black px-1.5 py-0.2 rounded-full tracking-tight shadow-xs pointer-events-none select-none z-10 scale-90',
                    cat.badgeColor || 'bg-amber-400 text-slate-950'
                  )}
                >
                  {cat.badge}
                </span>
              )}

              <button
                type="button"
                onClick={() => onTabChange(cat.id)}
                className={cn(
                  'px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none whitespace-nowrap',
                  isActive
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm font-bold scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                )}
                aria-selected={isActive}
                role="tab"
              >
                {cat.label}
              </button>
            </div>
          )
        })}
      </div>

      {/* Right End Hamburger / Filter Icon */}
      <button
        type="button"
        onClick={onToggleFilter}
        className="p-1.5 sm:p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
        title="Customize tabs and layout"
        aria-label="Filter or customize menu"
      >
        <Menu className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
      </button>
    </div>
  )
}

