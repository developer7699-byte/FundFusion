import { useState } from 'react'
import { X, Rocket, Check, Sparkles, Clock } from 'lucide-react'

interface LaunchpadModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LaunchpadModal({ isOpen, onClose }: LaunchpadModalProps) {
  if (!isOpen) return null

  const [committed, setCommitted] = useState(false)
  const [amount, setAmount] = useState('250')

  const handleCommit = () => {
    setCommitted(true)
    setTimeout(() => {
      setCommitted(false)
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
            <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Nexora Launchpad</h3>
              <p className="text-[10px] text-slate-400">Exclusive early-access token presales</p>
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

        <div className="p-4 space-y-4 overflow-y-auto">
          {committed && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in zoom-in-95">
              <Check className="w-4 h-4 shrink-0" />
              <span>Successfully committed {amount} USDT to CyberPay presale pool!</span>
            </div>
          )}

          {/* Featured Project Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-rose-500/10 via-purple-500/10 to-amber-500/10 border border-rose-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-black text-sm shadow-md">
                  CPAY
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">CyberPay Network</h4>
                  <span className="text-[10px] text-slate-400">Layer-2 High Speed Payment Rail</span>
                </div>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                Subscription Live
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-slate-400 text-[10px] block">Public Sale Price</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">1 CPAY = $0.05</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Total Pool Cap</span>
                <span className="font-mono font-bold text-emerald-500">2,000,000 USDT</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                <span>Committed: 1,420,000 USDT</span>
                <span>71%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-rose-500 to-purple-600 h-full w-[71%]" />
              </div>
            </div>
          </div>

          {/* Commit Input */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Commit USDT Amount
            </label>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-transparent font-bold text-sm text-slate-900 dark:text-white focus:outline-none flex-1"
              />
              <span className="text-xs font-black text-rose-500">USDT</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCommit}
            disabled={committed}
            className="w-full py-3 rounded-full font-black text-xs sm:text-sm bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-lg shadow-rose-500/25 transition-transform active:scale-95 cursor-pointer"
          >
            {committed ? 'Allocation Reserved!' : 'Commit USDT & Join Presale'}
          </button>
        </div>
      </div>
    </div>
  )
}

