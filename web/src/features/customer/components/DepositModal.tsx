import { useState } from 'react'
import { X, Copy, Check, QrCode, ShieldCheck, ArrowDownLeft, Zap } from 'lucide-react'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
  onDepositSuccess?: (amount: number) => void
}

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  if (!isOpen) return null

  // Exclusively BEP20 (BNB Smart Chain) as requested
  const bep20Address = '0x71C9484920492850294829482948294829482948'
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard?.writeText(bep20Address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-[360px] bg-white dark:bg-[#121829] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-[#f7a83b] flex items-center justify-center font-black">
              <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Deposit USDT (BEP20)
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                BNB Smart Chain · Zero deposit fee
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5 overflow-y-auto">
          {/* Exclusive BEP20 Network Badge Card */}
          <div className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-400/15 via-yellow-400/10 to-orange-400/10 border border-amber-400/25 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#f7a83b] text-slate-950 flex items-center justify-center font-black text-xs shadow-xs">
                ⚡
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 dark:text-white block">
                  BNB Smart Chain (BEP20)
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                  Official USDT Contract · Fastest Rail
                </span>
              </div>
            </div>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Active
            </span>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-3.5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/80">
            <div className="w-34 h-34 bg-white p-2.5 rounded-2xl shadow-sm flex items-center justify-center border border-slate-200/80">
              {/* Simulated BEP20 QR Code SVG */}
              <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900" fill="currentColor">
                <rect x="5" y="5" width="28" height="28" rx="4" />
                <rect x="9" y="9" width="20" height="20" fill="white" rx="2" />
                <rect x="13" y="13" width="12" height="12" rx="2" />
                <rect x="67" y="5" width="28" height="28" rx="4" />
                <rect x="71" y="9" width="20" height="20" fill="white" rx="2" />
                <rect x="75" y="13" width="12" height="12" rx="2" />
                <rect x="5" y="67" width="28" height="28" rx="4" />
                <rect x="9" y="71" width="20" height="20" fill="white" rx="2" />
                <rect x="13" y="75" width="12" height="12" rx="2" />
                <circle cx="50" cy="50" r="10" fill="#f7a83b" />
                <rect x="42" y="10" width="8" height="16" />
                <rect x="42" y="74" width="8" height="16" />
                <rect x="10" y="42" width="16" height="8" />
                <rect x="74" y="42" width="16" height="8" />
                <rect x="66" y="66" width="10" height="10" />
                <rect x="80" y="80" width="10" height="10" />
              </svg>
            </div>
            <p className="text-[11px] text-slate-500 font-bold mt-2 flex items-center gap-1">
              <span>Scan to deposit USDT (BEP20)</span>
            </p>
          </div>

          {/* Address Bar */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
              <span>BEP20 Deposit Address:</span>
              <span className="text-[#f7a83b] font-black">BEP20</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate pr-2 select-all">
                {bep20Address}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-amber-500 shadow-xs transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Network Safety Tip */}
          <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-start gap-2.5 text-[11px] text-slate-600 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-[#f7a83b] shrink-0 mt-0.5 stroke-[2.2]" />
            <p className="leading-snug">
              Deposit strictly <strong>USDT via BNB Smart Chain (BEP20)</strong>. Any other asset sent to this address may be permanently lost.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
