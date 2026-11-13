import { BackButton } from '@/components/ui/BackButton'
import { useMerchantStore } from '@/lib/merchant-store'
import { TrendingUp, Sparkles, Percent, Award, ShieldCheck, CheckCircle2 } from 'lucide-react'

export function MerchantEarnings() {
  const { earnings, commissionRate, totalTrades } = useMerchantStore()

  const todayInrEquivalent = (earnings.todayCommissionUsdt * 91.5).toFixed(2)
  const totalInrEquivalent = (earnings.totalCommissionUsdt * 91.5).toFixed(2)

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/merchant/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Earnings & Commission
            </h1>
            <p className="text-[11px] text-slate-500">P2P liquidity spread & trade rebates</p>
          </div>
        </div>
      </div>

      {/* Hero Overview Card */}
      <div className="rounded-3xl bg-gradient-to-tr from-amber-500/20 via-emerald-500/15 to-blue-500/10 border border-emerald-500/30 p-5 space-y-4 shadow-xl">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">Total Net Revenue Earned</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300">
            Tier Rate: 1.50%
          </span>
        </div>

        <div>
          <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono block">
            +{earnings.totalCommissionUsdt.toFixed(2)} USDT
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            ≈ ₹{parseFloat(totalInrEquivalent).toLocaleString('en-IN')} in settled commission
          </span>
        </div>

        {/* 2 Stats Split */}
        <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
          <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
            <span className="text-slate-400 text-[10px] block uppercase font-bold">Today Fee</span>
            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
              +{earnings.todayCommissionUsdt.toFixed(2)} USDT
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">≈ ₹{todayInrEquivalent}</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
            <span className="text-slate-400 text-[10px] block uppercase font-bold">Volume Processed</span>
            <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
              ₹{earnings.totalVolumeInr.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-400 block">{totalTrades} completed trades</span>
          </div>
        </div>
      </div>

      {/* Partner Tier Level */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800/80 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          <div>
            <h2 className="text-xs font-black text-slate-900 dark:text-white">VIP Gold Liquidity Partner</h2>
            <p className="text-[10px] text-slate-400">Current tier status based on monthly volume</p>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300">Base Commission Rate</span>
            <span className="font-bold text-slate-900 dark:text-white">1.50% per trade</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300">Bank Payout Fee</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">0% Zero Fee</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300">Order Matching Priority</span>
            <span className="font-bold text-slate-900 dark:text-white">Tier 1 Fast-Track</span>
          </div>
        </div>
      </div>
    </div>
  )
}

