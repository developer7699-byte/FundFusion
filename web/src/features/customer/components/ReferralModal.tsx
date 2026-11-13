import { useState } from 'react'
import { X, UserPlus, Copy, Check, Users, Gift, Share2 } from 'lucide-react'

interface ReferralModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ReferralModal({ isOpen, onClose }: ReferralModalProps) {
  if (!isOpen) return null

  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const referralCode = 'FUSION-VIP88'
  const referralLink = `${window.location.origin}/register?ref=${referralCode}`

  const copyCode = () => {
    navigator.clipboard?.writeText(referralCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const copyLink = () => {
    navigator.clipboard?.writeText(referralLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-[360px] bg-white dark:bg-[#121829] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Invite Friends & Earn</h3>
              <p className="text-[10px] text-slate-400">Get up to 30% lifetime trading fee rebate</p>
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
          {/* Stats Box */}
          <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 text-center">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Invited Friends</span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400">12</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Earned</span>
              <span className="text-xl font-black text-emerald-500">142.50 USDT</span>
            </div>
          </div>

          {/* Referral Code Box */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Your Referral Code
            </label>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-sm font-mono font-black text-slate-900 dark:text-white">{referralCode}</span>
              <button
                type="button"
                onClick={copyCode}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:text-blue-500 flex items-center gap-1 shadow-xs cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Referral Link Box */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Invitation Link
            </label>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 truncate pr-2">
                {referralLink}
              </span>
              <button
                type="button"
                onClick={copyLink}
                className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* How it works */}
          <div className="space-y-2 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 block">How referral program works:</span>
            <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
              <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
              <span>Share your referral code or invitation link with friends.</span>
            </div>
            <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
              <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
              <span>Your friend signs up and makes their first deposit or P2P trade.</span>
            </div>
            <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
              <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
              <span>Earn instant 30% trading commission credited directly in USDT!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

