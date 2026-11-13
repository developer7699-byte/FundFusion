import { Link } from 'react-router-dom'
import {
  X,
  Repeat,
  Rocket,
  ArrowLeftRight,
  Gift,
  Coins,
  Smartphone,
  ShieldCheck,
  Users,
  QrCode,
  Wallet,
  Headphones,
  Settings,
  Flame,
  CreditCard,
} from 'lucide-react'

interface MoreServicesModalProps {
  isOpen: boolean
  onClose: () => void
}

export function MoreServicesModal({ isOpen, onClose }: MoreServicesModalProps) {
  if (!isOpen) return null

  const sections = [
    {
      title: 'Trade & Exchange',
      items: [
        { label: 'Buy USDT', desc: 'Instant fiat onramp', icon: Rocket, to: '/customer/buy', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
        { label: 'Sell USDT', desc: 'Instant INR payout', icon: ArrowLeftRight, to: '/customer/sell', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
        { label: 'Convert', desc: 'Zero fee swap', icon: Repeat, to: '/customer/convert', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
        { label: 'Scan & Pay', desc: 'UPI QR settlements', icon: QrCode, to: '/customer/pay', color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' },
      ],
    },
    {
      title: 'Earn & Finance',
      items: [
        { label: 'Nexora Earn', desc: 'High APY staking', icon: Coins, to: '/customer/utilities', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
        { label: 'Rewards Hub', desc: 'Task bonuses', icon: Gift, to: '/customer/gift-cards', color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40' },
        { label: 'Invite Friends', desc: 'Referral rewards', icon: Users, to: '/customer/referrals', color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40' },
        { label: 'Wallet', desc: 'Deposit & withdraw', icon: Wallet, to: '/customer/wallet', color: 'text-slate-500 bg-slate-50 dark:bg-slate-800' },
      ],
    },
    {
      title: 'Utilities & Bills',
      items: [
        { label: 'Recharges', desc: 'Mobile & DTH', icon: Smartphone, to: '/customer/utilities', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
        { label: 'Gift Cards', desc: 'Up to 15% discount', icon: CreditCard, to: '/customer/gift-cards', color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' },
      ],
    },
    {
      title: 'Support & Security',
      items: [
        { label: 'Support Desk', desc: '24x7 resolution', icon: Headphones, to: '/customer/support', color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40' },
        { label: 'Account Security', desc: '2FA & Passkeys', icon: ShieldCheck, to: '/customer/security', color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' },
      ],
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#121829] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">All Services</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {sections.map((sec) => (
            <div key={sec.title} className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {sec.title}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {sec.items.map((it) => (
                  <Link
                    key={it.label}
                    to={it.to}
                    onClick={onClose}
                    className="flex items-center gap-3 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${it.color}`}>
                      <it.icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-amber-500 transition-colors truncate">
                        {it.label}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">{it.desc}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

