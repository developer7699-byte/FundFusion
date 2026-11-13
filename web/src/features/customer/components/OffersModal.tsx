import { useState } from 'react'
import { X, Percent, Gift, Sparkles, Check, Copy, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OffersModalProps {
  isOpen: boolean
  onClose: () => void
  onClaimPromo?: (code: string) => void
}

export function OffersModal({ isOpen, onClose, onClaimPromo }: OffersModalProps) {
  if (!isOpen) return null

  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const offers = [
    {
      code: 'FUSION100',
      title: '100% Free Mobile Recharge',
      desc: 'Deposit 50+ USDT and get flat ₹199 mobile recharge voucher free.',
      badge: 'POPULAR',
      validTill: 'Valid till 30 Nov',
      gradient: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30',
    },
    {
      code: 'ZEROFEE',
      title: '0% P2P Trade Fee for 30 Days',
      desc: 'Trade unlimited USDT/INR via UPI and IMPS with zero platform fees.',
      badge: 'TRADING',
      validTill: 'New Users Only',
      gradient: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30',
    },
    {
      code: 'AMZN5X',
      title: 'Flat 5% Extra Cashback on Amazon',
      desc: 'Buy any Amazon digital gift voucher with USDT and get instant 5% cashback.',
      badge: 'GIFT CARD',
      validTill: 'Instant Delivery',
      gradient: 'from-amber-500/10 to-orange-500/10 border-amber-500/30',
    },
    {
      code: 'VIPREF40',
      title: '40% Lifetime Referral Rebate',
      desc: 'Invite friends to buy/sell crypto or pay bills and earn 40% fee commission.',
      badge: 'LIFETIME',
      validTill: 'Active Always',
      gradient: 'from-purple-500/10 to-pink-500/10 border-purple-500/30',
    },
  ]

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code)
    setCopiedCode(code)
    if (onClaimPromo) {
      onClaimPromo(code)
    }
    setTimeout(() => setCopiedCode(null), 2000)
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
            <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Offers & Promo Coupons
              </h3>
              <p className="text-[11px] text-slate-500">Cashback, recharge codes & zero-fee perks</p>
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

        {/* Offers List */}
        <div className="p-4 space-y-3 overflow-y-auto">
          {offers.map((item) => (
            <div
              key={item.code}
              className={`p-3.5 rounded-2xl border bg-gradient-to-r ${item.gradient} space-y-2`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    {item.badge}
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-1">
                    {item.title}
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(item.code)}
                  className="px-2.5 py-1 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold font-mono hover:scale-105 active:scale-95 transition-all flex items-center gap-1 shrink-0"
                >
                  {copiedCode === item.code ? <Check className="w-3 h-3 text-emerald-400" /> : null}
                  <span>{copiedCode === item.code ? 'Applied' : item.code}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.desc}
              </p>

              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                <span>{item.validTill}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">1-Tap Apply</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

