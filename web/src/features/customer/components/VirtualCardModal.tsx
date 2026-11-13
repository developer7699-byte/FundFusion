import { useState } from 'react'
import { X, CreditCard, ShieldCheck, Lock, Eye, EyeOff, Sparkles, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VirtualCardModalProps {
  isOpen: boolean
  onClose: () => void
}

export function VirtualCardModal({ isOpen, onClose }: VirtualCardModalProps) {
  if (!isOpen) return null

  const [showCardDetails, setShowCardDetails] = useState(false)
  const [isFrozen, setIsFrozen] = useState(false)
  const [copied, setCopied] = useState(false)

  const cardNumber = showCardDetails ? '4829 · 9102 · 3847 · 2841' : '•••• · •••• · •••• · 2841'
  const cvv = showCardDetails ? '842' : '•••'
  const expiry = '08/29'

  const handleCopy = () => {
    navigator.clipboard?.writeText('4829910238472841')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-[360px] bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Virtual Crypto Card
              </h3>
              <p className="text-[11px] text-slate-500">Spend USDT worldwide online</p>
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

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Card Graphic */}
          <div className="relative w-full h-52 rounded-3xl p-5 text-white shadow-xl overflow-hidden bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950 border border-emerald-500/30">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

            <div className="flex justify-between items-center relative z-10">
              <span className="text-xs font-black tracking-widest text-emerald-400 uppercase">
                FundFusion Platinum
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {isFrozen ? 'FROZEN' : 'ACTIVE'}
              </span>
            </div>

            {/* Chip */}
            <div className="w-9 h-7 rounded-md bg-amber-400/80 my-3 flex items-center justify-center text-[8px] font-mono font-bold text-amber-950">
              CHIP
            </div>

            {/* Card Number */}
            <div className="my-2 relative z-10 flex items-center justify-between">
              <span className="font-mono text-base sm:text-lg font-black tracking-wider">
                {cardNumber}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 rounded text-slate-400 hover:text-white"
                title="Copy Card Number"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Card Bottom: Holder, Expiry, CVV */}
            <div className="flex justify-between items-end text-xs relative z-10 pt-1">
              <div>
                <span className="text-[9px] text-slate-400 uppercase block">Card Holder</span>
                <span className="font-bold tracking-wide">ALOK KUMAR</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase block">Expires</span>
                <span className="font-mono font-bold">{expiry}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase block">CVV</span>
                <span className="font-mono font-bold">{cvv}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowCardDetails(!showCardDetails)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 transition-colors"
            >
              {showCardDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showCardDetails ? 'Hide Details' : 'Show CVV & No.'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFrozen(!isFrozen)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 transition-colors"
            >
              <Lock className="w-4 h-4" />
              <span>{isFrozen ? 'Unfreeze Card' : 'Freeze Card'}</span>
            </button>
          </div>

          {/* Balance card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center">
            <div>
              <span className="text-slate-500 block text-[11px]">Card Auto-Debit Source</span>
              <span className="font-bold text-slate-900 dark:text-white">USDT Primary Wallet</span>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Zero Foreign Exchange Mark-up
            </span>
          </div>

          <Button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-bold bg-[#22c55e] hover:bg-[#16a34a] text-white"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}

