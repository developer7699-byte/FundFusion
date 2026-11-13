import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BackButtonProps {
  fallback?: string
  className?: string
  iconClassName?: string
  onClick?: () => void
}

export function BackButton({
  fallback = '/customer/dashboard',
  className,
  iconClassName,
  onClick,
}: BackButtonProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onClick) {
      onClick()
      return
    }
    // Check if there is history in current session
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1)
    } else if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(fallback)
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        'p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0 shadow-2xs flex items-center justify-center',
        className
      )}
      title="Go back"
      aria-label="Go back to previous page"
    >
      <ArrowLeft className={cn('w-4 h-4 text-slate-700 dark:text-slate-200', iconClassName)} />
    </button>
  )
}

