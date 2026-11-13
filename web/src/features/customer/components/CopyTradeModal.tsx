import { useState } from 'react'
import { X, Repeat, UserCheck, Check, TrendingUp, ShieldCheck } from 'lucide-react'

interface CopyTradeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CopyTradeModal({ isOpen, onClose }: CopyTradeModalProps) {
  if (!isOpen) return null

  const [copiedTrader, setCopiedTrader] = useState<string | null>(null)

  const traders = [
    {
      id: 'trader-1',
      name: 'AlphaPulse Pro',
      winRate: '94.8%',
      roi30d: '+248.5%',
      followers: '1,420',
      tag: 'Low Risk',
      badgeColor: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      id: 'trader-2',
      name: 'Vortex Quantum',
      winRate: '89.2%',
      roi30d: '+178.2%',
      followers: '984',
      tag: 'Momentum',
      badgeColor: 'text-blue-500 bg-blue-500/10',
    },
    {
      id: 'trader-3',
      name: 'BullRider Elite',
      winRate: '91.4%',
      roi30d: '+192.0%',
      followers: '2,150',
      tag: 'Trending',
      badgeColor: 'text-amber-500 bg-amber-500/10',
    },
  ]

  const handleCopy = (id: string) => {
    setCopiedTrader(id)
    setTimeout(() => {
      setCopiedTrader(null)
      onClose()
    }, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-[#121829] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Repeat className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Copy Trading Masters</h3>
              <p className="text-[10px] text-slate-400">Mirror verified top traders automatically</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {copiedTrader && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in zoom-in-95">
              <Check className="w-4 h-4 shrink-0" />
              <span>Copy trading enabled! Trades will automatically replicate.</span>
            </div>
          )}

          {traders.map((t) => {
            const isCopied = copiedTrader === t.id

            return (
              <div
                key={t.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">{t.name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${t.badgeColor}`}>{t.tag}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-400 text-[10px] block">30D ROI</span>
                      <span className="font-mono font-bold text-emerald-500">{t.roi30d}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Win Rate</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{t.winRate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Followers</span>
                      <span className="font-mono font-bold text-slate-500">{t.followers}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(t.id)}
                  disabled={isCopied}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs active:scale-95'
                  }`}
                >
                  {isCopied ? 'Copying...' : 'Copy'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

