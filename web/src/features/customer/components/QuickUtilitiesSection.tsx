import { Link } from 'react-router-dom'
import { Smartphone, Zap, Tv, Globe, Gift, ArrowRight, Gamepad2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickUtilitiesSectionProps {
  onOpenBills: (cat: 'gaming' | 'recharge' | 'electricity' | 'dth' | 'broadband') => void
  onOpenGifts?: () => void
}

export function QuickUtilitiesSection({ onOpenBills, onOpenGifts }: QuickUtilitiesSectionProps) {
  const utilityItems = [
    {
      id: 'gaming',
      name: 'Game Top-up',
      desc: 'Free Fire, BGMI, Play',
      icon: Gamepad2,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-500/10',
      cat: 'gaming' as const,
    },
    {
      id: 'recharge',
      name: 'Mobile Recharge',
      desc: 'Jio, Airtel, Vi, BSNL',
      icon: Smartphone,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
      cat: 'recharge' as const,
    },
    {
      id: 'electricity',
      name: 'Electricity Bill',
      desc: 'BESCOM, Adani, Tata',
      icon: Zap,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
      cat: 'electricity' as const,
    },
    {
      id: 'dth',
      name: 'DTH TV Recharge',
      desc: 'Tata Play, Airtel, Dish',
      icon: Tv,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10',
      cat: 'dth' as const,
    },
  ]

  const featuredVouchers = [
    { id: 'amz', name: 'Amazon Pay', val: '₹500', usdt: '5.46 USDT', tag: '5% Back' },
    { id: 'flp', name: 'Flipkart', val: '₹1000', usdt: '10.92 USDT', tag: '4% Back' },
    { id: 'gpl', name: 'Google Play', val: '₹250', usdt: '2.73 USDT', tag: 'Instant' },
    { id: 'swg', name: 'Swiggy', val: '₹500', usdt: '5.46 USDT', tag: 'Food 6%' },
  ]

  return (
    <div className="space-y-4">
      {/* 1. Quick Utility Rails */}
      <div className="rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
              Instant Bill Pay & Recharge
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onOpenBills('gaming')}
            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>All Billers</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {utilityItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenBills(item.cat)}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center shrink-0', item.bg, item.color)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-500 transition-colors">
                    {item.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block truncate pl-9">
                  {item.desc}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Featured Digital Vouchers */}
      <div className="rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5 text-amber-500" />
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
              Popular Gift Vouchers
            </h3>
          </div>
          <Link
            to="/customer/gift-cards"
            className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>100+ Brands</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {featuredVouchers.map((v) => (
            <Link
              key={v.id}
              to="/customer/gift-cards"
              className="p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-amber-300 dark:hover:border-amber-500/40 text-left transition-all group cursor-pointer block"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {v.name}
                </span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {v.tag}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-200">
                  {v.val}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {v.usdt}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

