import { useState } from 'react'
import { X, Copy, Check, ArrowDownLeft } from 'lucide-react'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
  /** The address this user's deposits are watched on, or null if none. */
  address: string | null
  network: string
}

/**
 * Where to send USDT (PRD §8.2).
 *
 * The prototype offered TRC20, ERC20 and a UPI handle, all of them constants
 * typed into this file, and a button that credited the balance without a
 * chain. v1 has one network and one derived address, and nothing credits a
 * balance but the watcher.
 */
export function DepositModal({
  isOpen,
  onClose,
  address,
  network,
}: DepositModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopy = () => {
    if (!address) return
    void navigator.clipboard?.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-[360px] bg-white dark:bg-[#121829] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Deposit USDT
              </h2>
              <p className="text-[10px] text-slate-500">{network || 'No network'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {address ? (
            <>
              <div className="rounded-2xl bg-slate-50 dark:bg-[#0c101d] border border-slate-100 dark:border-slate-800 p-3.5 text-center space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Your deposit address
                </span>
                <p className="font-mono text-[11px] break-all text-slate-900 dark:text-white">
                  {address}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="w-full h-11 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy address
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Send USDT on {network} only. Your balance moves after fifteen
                confirmations, not when the transaction is broadcast.
              </p>
            </>
          ) : (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
              No deposit address is available on this server. Do not send
              anything anywhere until one is.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
