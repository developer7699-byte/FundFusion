import { useState } from 'react'
import { X, TrendingUp, TrendingDown, ArrowRight, ShieldCheck, Check } from 'lucide-react'

interface QuickTradeModalProps {
  isOpen: boolean
  onClose: () => void
  initialPair?: string
  initialPrice?: string
  initialChange?: string
  isPositive?: boolean
}

export function QuickTradeModal({
  isOpen,
  onClose,
  initialPair = 'ETH/USDT',
  initialPrice = '3,142.80',
  initialChange = '-0.61%',
  isPositive = false,
}: QuickTradeModalProps) {
  if (!isOpen) return null

  const [tradeSide, setTradeSide] = useState<'BUY' | 'SELL'>('BUY')
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET')
  const [amount, setAmount] = useState('100')
  const [percent, setPercent] = useState<number | null>(50)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)

  const cleanPrice = parseFloat(initialPrice.replace(/[^0-9.]/g, '')) || 3142.8
  const cryptoEst = ((parseFloat(amount) || 0) / cleanPrice).toFixed(4)

  const handlePlaceOrder = () => {
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setOrderPlaced(true)
      setTimeout(() => {
        setOrderPlaced(false)
        onClose()
      }, 1400)
    }, 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-[#121829] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-800 dark:text-slate-200">
              {initialPair.split('/')[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">{initialPair}</h3>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    isPositive ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'
                  }`}
                >
                  {initialChange}
                </span>
              </div>
              <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">${initialPrice}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trade Body */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {orderPlaced && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in zoom-in-95">
              <Check className="w-4 h-4 shrink-0" />
              <span>
                {tradeSide} Order Executed! Received ~{cryptoEst} {initialPair.split('/')[0]}
              </span>
            </div>
          )}

          {/* Buy / Sell Pill Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
            <button
              type="button"
              onClick={() => setTradeSide('BUY')}
              className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                tradeSide === 'BUY'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-[1.01]'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Buy {initialPair.split('/')[0]}
            </button>
            <button
              type="button"
              onClick={() => setTradeSide('SELL')}
              className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                tradeSide === 'SELL'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25 scale-[1.01]'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Sell {initialPair.split('/')[0]}
            </button>
          </div>

          {/* Mini Sparkline Chart Preview */}
          <div className="h-16 w-full bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 flex items-end justify-between gap-1 border border-slate-100 dark:border-slate-800/60">
            {[40, 52, 48, 65, 59, 72, 68, 85, 78, 92, 88, 95].map((val, idx) => (
              <div
                key={idx}
                className={`w-full rounded-t-sm transition-all duration-300 ${
                  tradeSide === 'BUY' ? 'bg-emerald-500/40 hover:bg-emerald-500' : 'bg-rose-500/40 hover:bg-rose-500'
                }`}
                style={{ height: `${val}%` }}
              />
            ))}
          </div>

          {/* Order Type & Price */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500">Order Type:</span>
              <div className="flex items-center gap-2">
                {(['MARKET', 'LIMIT'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setOrderType(t)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      orderType === t ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Spend Amount Input */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Order Value (USDT)
              </label>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    setPercent(null)
                  }}
                  className="bg-transparent font-bold text-sm text-slate-900 dark:text-white focus:outline-none flex-1"
                  placeholder="0.00"
                />
                <span className="text-xs font-black text-amber-500">USDT</span>
              </div>
            </div>

            {/* Percent Quick Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[25, 50, 75, 100].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPercent(p)
                    setAmount((p * 2).toString())
                  }}
                  className={`py-1 text-[11px] font-extrabold rounded-lg transition-colors cursor-pointer ${
                    percent === p
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>

            {/* Est Receive */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300">
              <span>Estimated {initialPair.split('/')[0]}:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                ~{cryptoEst} {initialPair.split('/')[0]}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={isSubmitting}
            className={`w-full py-3 rounded-full font-black text-xs sm:text-sm text-white shadow-lg transition-all active:scale-95 cursor-pointer ${
              tradeSide === 'BUY'
                ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25'
                : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25'
            }`}
          >
            {isSubmitting ? 'Confirming Order...' : `Place ${tradeSide} Order`}
          </button>
        </div>
      </div>
    </div>
  )
}

