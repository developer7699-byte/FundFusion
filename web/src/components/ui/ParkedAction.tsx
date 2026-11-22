import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * An inert stand-in for a feature that is outside v1 (PRD §3) or has no v1
 * backing yet. It is not a link and has no handler that reaches the router,
 * a store or the API. Tapping it shows a brief "Not available yet" tooltip
 * that is absolutely positioned (never shifts layout) and clears itself.
 */
export function ParkedAction({
  label,
  children,
  className,
  labelClassName = 'sr-only',
}: {
  label: string
  /** Visual shown above the label (an icon tile, say). */
  children?: ReactNode
  className?: string
  labelClassName?: string
}) {
  const [tapped, setTapped] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const tipId = useId()
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-disabled="true"
        aria-describedby={tapped ? tipId : undefined}
        onClick={(e) => {
          e.preventDefault()
          setTapped(true)
          clearTimeout(timer.current)
          timer.current = setTimeout(() => setTapped(false), 1800)
        }}
        className={cn('cursor-not-allowed opacity-60 focus:outline-none', className)}
      >
        {children}
        <span className={labelClassName}>{label}</span>
      </button>
      {tapped && (
        <span
          id={tipId}
          role="status"
          className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white shadow-lg"
        >
          Not available yet
        </span>
      )}
    </span>
  )
}
