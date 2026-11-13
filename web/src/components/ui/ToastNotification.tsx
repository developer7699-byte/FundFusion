import { CheckCircle2, Sparkles, X } from 'lucide-react'

interface ToastNotificationProps {
  message: string | null
  onClose?: () => void
  type?: 'success' | 'info' | 'error'
}

export function ToastNotification({
  message,
  onClose,
  type = 'success',
}: ToastNotificationProps) {
  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.75rem)] max-w-[360px] p-3 px-3.5 rounded-2xl bg-slate-900/95 dark:bg-[#0f172a]/95 text-white border border-slate-700/80 dark:border-slate-700 shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-auto"
    >
      <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
        {type === 'success' ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : (
          <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
        )}
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <p className="text-xs font-bold text-white tracking-tight leading-snug break-words">
          {message}
        </p>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

