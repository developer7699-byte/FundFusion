import { useState } from 'react'
import { X, Copy, Check, ArrowDownLeft, Zap } from 'lucide-react'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
  onDepositSuccess?: (amount: number) => void
}

export function DepositModal({ isOpen, onClose, onDepositSuccess }: DepositModalProps) {
  const [network, setNetwork] = useState<'TRC20' | 'BEP20' | 'ERC20' | 'UPI'>('TRC20')
  const [copied, setCopied] = useState(false)
  const [simulatedAmount, setSimulatedAmount] = useState('100')
  const [isDepositing, setIsDepositing] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  if (!isOpen) return null

  const addresses = {
    TRC20: 'TLvM8vPq9xK92Zc1Qj4w9tG7eX5m4P1y9z',
    BEP20: '0x71C9484920492850294829482948294829482948',
    ERC20: '0x89205A3A3b2A5532642352bCfe327E749aCfe123',
    UPI: 'platform.deposit@icici',
  }

  const handleCopy = () => {
    navigator.clipboard?.writeText(addresses[network])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSimulateDeposit = () => {
    setIsDepositing(true)
    setTimeout(() => {
      setIsDepositing(false)
      const amt = parseFloat(simulatedAmount) || 100
      setSuccessMsg(`Successfully credited +${amt} USDT to your wallet!`)
      if (onDepositSuccess) {
        onDepositSuccess(amt)
      }
      setTimeout(() => {
        setSuccessMsg('')
        onClose()
      }, 1500)
    }, 900)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-[360px] bg-white dark:bg-[#121829] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Deposit Crypto & Fiat</h3>
              <p className="text-[10px] text-slate-400">Zero deposit fees · Instant confirmation</p>
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

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in zoom-in-95">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Network Selector Tabs */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Select Deposit Rail
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
              {(['TRC20', 'BEP20', 'ERC20', 'UPI'] as const).map((net) => (
                <button
                  key={net}
                  type="button"
                  onClick={() => setNetwork(net)}
                  className={`py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    network === net
                      ? 'bg-white dark:bg-[#1e273e] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {net}
                </button>
              ))}
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/80">
            <div className="w-36 h-36 bg-white p-2 rounded-2xl shadow-sm flex items-center justify-center border border-slate-200/80">
              {/* Simulated QR Code SVG */}
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
                <circle cx="50" cy="50" r="10" fill="#f59e0b" />
                <rect x="42" y="10" width="8" height="16" />
                <rect x="42" y="74" width="8" height="16" />
                <rect x="10" y="42" width="16" height="8" />
                <rect x="74" y="42" width="16" height="8" />
                <rect x="66" y="66" width="10" height="10" />
                <rect x="80" y="80" width="10" height="10" />
              </svg>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-2">
              Scan to deposit {network === 'UPI' ? 'INR' : 'USDT'}
            </p>
          </div>

          {/* Address Bar */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
              <span>Deposit Address / UPI ID:</span>
              <span className="text-amber-500 font-bold">{network}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate pr-2">
                {addresses[network]}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-amber-500 shadow-xs transition-colors flex items-center gap-1 text-[11px] font-bold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Quick Simulation Test (Client Demo Feature) */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> Demo Instant Deposit
              </span>
              <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.2 rounded">Sandbox</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={simulatedAmount}
                onChange={(e) => setSimulatedAmount(e.target.value)}
                className="w-24 px-2 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-[#121829] border border-amber-300 dark:border-amber-800 text-slate-900 dark:text-white"
                placeholder="Amount"
              />
              <span className="text-xs font-bold text-slate-500">USDT</span>
              <button
                type="button"
                onClick={handleSimulateDeposit}
                disabled={isDepositing}
                className="ml-auto px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-transform active:scale-95"
              >
                {isDepositing ? 'Crediting...' : 'Deposit Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

