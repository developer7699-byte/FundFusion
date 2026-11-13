import { useState } from 'react'
import { X, Coins, Sparkles, Check, ArrowRight, Percent } from 'lucide-react'

interface EarnModalProps {
  isOpen: boolean
  onClose: () => void
}

export function EarnModal({ isOpen, onClose }: EarnModalProps) {
  if (!isOpen) return null

  const [stakeAmount, setStakeAmount] = useState('500')
  const [selectedPlan, setSelectedPlan] = useState<'USDT' | 'BTC' | 'ETH'>('USDT')
  const [isStaked, setIsStaked] = useState(false)

  const plans = {
    USDT: { apy: 12.8, name: 'Tether USD', term: 'Flexible · Daily Payout' },
    BTC: { apy: 6.4, name: 'Bitcoin Safe', term: '30 Days Fixed' },
    ETH: { apy: 7.2, name: 'Ethereum 2.0', term: 'Flexible Staking' },
  }

  const currentPlan = plans[selectedPlan]
  const estDaily = (((parseFloat(stakeAmount) || 0) * (currentPlan.apy / 100)) / 365).toFixed(3)
  const estMonthly = (((parseFloat(stakeAmount) || 0) * (currentPlan.apy / 100)) / 12).toFixed(2)

  const handleStake = () => {
    setIsStaked(true)
    setTimeout(() => {
      setIsStaked(false)
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
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Nexora Earn & Staking</h3>
              <p className="text-[10px] text-slate-400">Earn up to 12.8% APY on idle crypto</p>
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
          {isStaked && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in zoom-in-95">
              <Check className="w-4 h-4 shrink-0" />
              <span>Staking activated! Yield will credit daily to your wallet.</span>
            </div>
          )}

          {/* Staking Assets Picker */}
          <div className="grid grid-cols-3 gap-2">
            {(['USDT', 'BTC', 'ETH'] as const).map((coin) => (
              <button
                key={coin}
                type="button"
                onClick={() => setSelectedPlan(coin)}
                className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  selectedPlan === coin
                    ? 'border-amber-500 bg-amber-500/10 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <span className="text-xs font-bold block text-slate-900 dark:text-white">{coin}</span>
                <span className="text-xs font-extrabold text-amber-500">{plans[coin].apy}% APY</span>
              </button>
            ))}
          </div>

          {/* Plan Info */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
            <div>
              <span className="font-bold text-slate-800 dark:text-white block">{currentPlan.name}</span>
              <span className="text-[10px] text-slate-400">{currentPlan.term}</span>
            </div>
            <span className="text-base font-extrabold text-emerald-500 font-mono">+{currentPlan.apy}% APY</span>
          </div>

          {/* Amount input */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Deposit Amount
            </label>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="bg-transparent font-bold text-sm text-slate-900 dark:text-white focus:outline-none flex-1"
              />
              <span className="text-xs font-black text-amber-500">{selectedPlan}</span>
            </div>
          </div>

          {/* Earnings calculator */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Daily Expected Return:</span>
              <span className="font-bold text-emerald-500">+{estDaily} {selectedPlan}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Monthly Expected Return:</span>
              <span className="font-bold text-emerald-500">+{estMonthly} {selectedPlan}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStake}
            disabled={isStaked}
            className="w-full py-3 rounded-full font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 transition-transform active:scale-95 cursor-pointer"
          >
            {isStaked ? 'Subscribed!' : 'Confirm & Stake Now'}
          </button>
        </div>
      </div>
    </div>
  )
}

