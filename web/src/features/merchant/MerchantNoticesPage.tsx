import { useState } from 'react'
import { CheckCheck, ChevronRight } from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useMerchantStore } from '@/lib/merchant-store'
import { useLanguage } from '@/lib/language'
import { ToastNotification } from '@/components/ui/ToastNotification'

export function MerchantNotices() {
  const { notices, markAllNoticesRead, markNoticeRead, unreadNoticesCount } = useMerchantStore()
  const { t } = useLanguage()
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleMarkAllRead = () => {
    markAllNoticesRead()
    showToast(t('merchantAlerts.toastMarked'))
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4 relative">
      {/* Toast Notification */}
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/merchant/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {t('merchantAlerts.title')}
            </h1>
            <p className="text-[11px] text-slate-500">{t('merchantAlerts.subtitle')}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={unreadNoticesCount === 0}
          className={cn(
            'text-xs font-bold flex items-center gap-1 transition-all',
            unreadNoticesCount > 0
              ? 'text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer'
              : 'text-slate-400 dark:text-slate-500 cursor-default opacity-80'
          )}
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>{unreadNoticesCount > 0 ? t('merchantAlerts.markAllRead') : t('merchantAlerts.allRead')}</span>
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
                ? 'bg-white dark:bg-[#111827] border-emerald-500/40 shadow-xs'
                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/80 opacity-75'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                )}
                <h3 className={cn(
                  'text-xs font-black',
                  !n.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                )}>
                  {n.title}
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono shrink-0">{n.time}</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{n.desc}</p>

            {n.link && (
              <Link
                to={n.link}
                onClick={() => markNoticeRead(n.id)}
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
