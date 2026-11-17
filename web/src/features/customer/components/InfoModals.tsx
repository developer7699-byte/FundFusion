import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Info,
  ShieldCheck,
  CheckCircle2,
  Store,
  Layers,
  Code2,
  Crown,
  ArrowRight,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {} from '@/lib/utils'

/* =========================================================================
   1. ABOUT MODAL (Replaces jumping out to public /about)
   ========================================================================= */
export function AboutModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-[360px] bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                About FundFusion
              </h3>
              <p className="text-[11px] text-slate-500">v2.4.0 (Build 2026.11)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 mx-auto font-black text-lg">
              F
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white pt-1">
              Next-Gen P2P Escrow & Utility Hub
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              FundFusion enables instant crypto-fiat swaps, direct UPI settlements, BBPS bill payments, and gift vouchers at 0% extra fee.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Smart Escrow Guarantee</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Every USDT order is backed by automated smart contracts. Funds are locked safely in escrow until your bank confirms settlement.
            </p>
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Architecture</span>
              <span className="font-bold text-slate-900 dark:text-white">Hybrid Decentralized Rails</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Supported Networks</span>
              <span className="font-bold text-slate-900 dark:text-white">TRC20, BEP20, ERC20, UPI</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Security Standard</span>
              <span className="font-bold text-slate-900 dark:text-white">AES-256 GCM + Multi-Sig</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Support Desk</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">24/7 Live Arbitrators</span>
            </div>
          </div>

          <Button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   2. BECOME A MERCHANT MODAL (Replaces jumping out to /merchant)
   ========================================================================= */
export function BecomeMerchantModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-[360px] bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Merchant Liquidity Desk
              </h3>
              <p className="text-[11px] text-slate-500">Earn up to 2.8% on daily P2P volume</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 space-y-2">
            <span className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-wider">
              Partner Privileges
            </span>
            <ul className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Priority order matching & custom spread rates</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>0% fee on all automated IMPS/UPI bank payouts</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Dedicated dispute arbitrator & VIP support channel</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate('/merchant/dashboard')
              }}
              className="w-full py-3 rounded-2xl font-black bg-[#0a2316] dark:bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Launch Merchant Desk</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   3. PAYOUT API MODAL (Replaces jumping out to /features)
   ========================================================================= */
export function PayoutApiModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null
  const [copiedKey, setCopiedKey] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-[360px] bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Developer Payout API
              </h3>
              <p className="text-[11px] text-slate-500">Automate USDT & UPI payouts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
            Integrate FundFusion directly into your app, gaming portal, or checkout system for sub-minute automated withdrawals.
          </p>

          {/* Sandbox Key */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400">Sandbox API Key</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText('ff_test_9920148ad8192ef0938b')
                  setCopiedKey(true)
                  setTimeout(() => setCopiedKey(false), 2000)
                }}
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {copiedKey ? 'Copied!' : 'Copy Key'}
              </button>
            </div>
            <code className="text-[11px] font-mono text-slate-900 dark:text-white block bg-slate-100 dark:bg-slate-900 p-2 rounded-xl break-all">
              ff_test_9920148ad8192ef0938b
            </code>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs">Features Included:</h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="font-bold block text-slate-800 dark:text-slate-200">REST Endpoints</span>
                <span className="text-slate-400 text-[10px]">Instant disbursements</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="font-bold block text-slate-800 dark:text-slate-200">Webhooks 2.0</span>
                <span className="text-slate-400 text-[10px]">Real-time txn status</span>
              </div>
            </div>
          </div>

          <Button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          >
            Close API Details
          </Button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   4. BULK PAYOUT MODAL (Replaces jumping out to /merchant)
   ========================================================================= */
export function BulkPayoutModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-[360px] bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Bulk Batch Payouts
              </h3>
              <p className="text-[11px] text-slate-500">Pay 500+ recipients in 1 click</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
            Execute batch salary disbursements, affiliate payouts, or vendor settlements with zero network gas friction.
          </p>

          <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
            <FileText className="w-8 h-8 text-slate-400 mx-auto" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block text-xs">
                Upload CSV / Excel Sheet
              </span>
              <span className="text-[10px] text-slate-400 block">
                Format: Address/UPI, Amount, Remarks
              </span>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold hover:bg-purple-500/20"
            >
              Download Sample CSV
            </button>
          </div>

          <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Multi-chain: USDT (TRC20/BEP20) & UPI VPA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Automated duplicate & invalid address validation</span>
            </div>
          </div>

          <Button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white text-xs"
          >
            Got It
          </Button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   5. AFFILIATE MODAL (Replaces jumping out to /merchant)
   ========================================================================= */
export function AffiliateModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null
  const [copiedLink, setCopiedLink] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-[360px] bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Affiliate Partner Program
              </h3>
              <p className="text-[11px] text-slate-500">Earn 40% lifetime revenue share</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Your Commission Tier
            </span>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              40% Rebate
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Credited instantly on every friend's trade & bill pay
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
              <span>YOUR UNIQUE AFFILIATE LINK</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText('https://fundfusion.io/ref/VIP8829')
                  setCopiedLink(true)
                  setTimeout(() => setCopiedLink(false), 2000)
                }}
                className="text-amber-600 dark:text-amber-400 font-bold hover:underline"
              >
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <code className="text-xs font-mono font-bold text-slate-900 dark:text-white block bg-slate-100 dark:bg-slate-900 p-2 rounded-xl truncate">
              https://fundfusion.io/ref/VIP8829
            </code>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Invited Friends</span>
              <span className="text-base font-black text-slate-900 dark:text-white font-mono">24</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Total Rebate</span>
              <span className="text-base font-black text-emerald-600 font-mono">$184.50</span>
            </div>
          </div>

          <Button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs shadow-md shadow-amber-500/20"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

