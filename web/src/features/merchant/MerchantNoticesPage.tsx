import { useState } from 'react'
import { Bell, CheckCheck, Clock, CheckCircle2, AlertCircle, ChevronRight, Sparkles } from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface Notice {
  id: string
  title: string
  desc: string
  time: string
  read: boolean
  type: 'ORDER' | 'UTR' | 'COMMISSION' | 'SYSTEM'
  link?: string
}

export function MerchantNotices() {
  const [notices, setNotices] = useState<Notice[]>([
    {
      id: 'n1',
      title: 'Action Needed: Bank UTR Submitted',
      desc: 'Buyer @aarav_crypto submitted UTR: 429104829104 for ₹9,150. Please check your bank and release USDT.',
      time: '6 mins ago',
      read: false,
      type: 'UTR',
      link: '/merchant/orders/FF-8921',
    },
    {
      id: 'n2',
      title: 'Commission Credited (+7.50 USDT)',
      desc: 'Order #FF-8920 successfully settled. 1.5% desk volume rebate has been added to your available vault balance.',
      time: '45 mins ago',
      read: false,
      type: 'COMMISSION',
      link: '/merchant/earnings',
    },
    {
      id: 'n3',
      title: 'Order Matched: 250 USDT',
      desc: 'Order #FF-8922 accepted for buyer @priya_trader. 250 USDT locked safely in multi-sig escrow.',
      time: '1 hr ago',
      read: true,
      type: 'ORDER',
      link: '/merchant/orders/FF-8922',
    },
    {
      id: 'n4',
      title: 'Zero Bank Payout Fees Active',
      desc: 'All IMPS & RTGS settlement payouts to your registered bank account carry 0% network fees today.',
      time: 'Yesterday',
      read: true,
      type: 'SYSTEM',
    },
  ])

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const markAllAsRead = () => {
    setNotices((prev) => prev.map((n) => ({ ...n, read: true })))
    showToast('All notifications marked as read')
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-slate-900/90 text-white text-xs font-bold shadow-2xl backdrop-blur-md border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top duration-300">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/merchant/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Merchant Alerts
            </h1>
            <p className="text-[11px] text-slate-500">Live escrow and order updates</p>
          </div>
        </div>

        <button
          type="button"
          onClick={markAllAsRead}
          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Mark all read</span>
        </button>
      </div>

      {/* Notices List */}
      <div className="space-y-2.5">
        {notices.map((n) => (
          <div
            key={n.id}
            className={cn(
              'p-4 rounded-3xl border transition-all space-y-2 shadow-2xs',
              !n.read
                ? 'bg-white dark:bg-[#111827] border-emerald-500/40'
                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/80 opacity-80'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {!n.read && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                <h3 className="text-xs font-black text-slate-900 dark:text-white">{n.title}</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono shrink-0">{n.time}</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{n.desc}</p>

            {n.link && (
              <Link
                to={n.link}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-1"
              >
                <span>View Details</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

