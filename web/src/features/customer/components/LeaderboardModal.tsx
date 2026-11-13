import { useState } from 'react'
import { X, Trophy, Medal, Crown, TrendingUp, Sparkles, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LeaderboardModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  if (!isOpen) return null

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'all'>('weekly')

  const topTraders = [
    { rank: 1, name: 'CryptoRider_IND', volume: '$124,500', profit: '+₹1,18,000', badge: '🥇 Top Maker' },
    { rank: 2, name: 'DexPro_Mumbai', volume: '$98,200', profit: '+₹94,500', badge: '🥈 High Volume' },
    { rank: 3, name: 'NexoraMerchant_99', volume: '$87,400', profit: '+₹82,100', badge: '🥉 Verified Desk' },
    { rank: 4, name: 'BangaloreSwaps', volume: '$62,100', profit: '+₹58,400', badge: '⚡ <45s Fast' },
    { rank: 5, name: 'DelhiP2P_Trader', volume: '$54,800', profit: '+₹51,000', badge: '🛡️ 100% Escrow' },
    { rank: 6, name: 'Kolkata_CryptoHub', volume: '$46,300', profit: '+₹42,800', badge: '⭐ 4.98' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-[360px] bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Trader Leaderboard
              </h3>
              <p className="text-[11px] text-slate-500">Top P2P volume & monthly rebates</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-4 pt-3 flex items-center gap-1.5">
          {(['daily', 'weekly', 'all'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer',
                period === p
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
              )}
            >
              {p === 'all' ? 'All Time' : `${p} Top`}
            </button>
          ))}
        </div>

        {/* User rank card */}
        <div className="p-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-black text-sm">
                #42
              </div>
              <div>
                <span className="text-xs font-black block">Your Performance</span>
                <span className="text-[11px] text-emerald-100">Volume: $1,250 USDT</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-emerald-100 block">Rebate Earned</span>
              <span className="text-xs font-black font-mono">₹1,140</span>
            </div>
          </div>
        </div>

        {/* Traders list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {topTraders.map((t) => (
            <div
              key={t.rank}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0',
                    t.rank === 1
                      ? 'bg-amber-400 text-amber-950'
                      : t.rank === 2
                      ? 'bg-slate-300 text-slate-800'
                      : t.rank === 3
                      ? 'bg-amber-700 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  )}
                >
                  {t.rank}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {t.name}
                    </span>
                    <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full shrink-0">
                      {t.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    Vol: {t.volume}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                  {t.profit}
                </span>
                <span className="text-[10px] text-slate-400">Net Earned</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

