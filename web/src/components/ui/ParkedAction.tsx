import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * An inert stand-in for a feature that is outside v1 (PRD §3) or has no v1
 * backing yet. It is not a link and has no handler that reaches the router,
 * a store or the API; tapping it only reveals a neutral "not available yet"
 * line so the tile never reads as broken.
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
  return (
    <button
      type="button"
      aria-disabled="true"
      onClick={(e) => {
        e.preventDefault()
        setTapped(true)
      }}
      className={cn('cursor-not-allowed opacity-60 focus:outline-none', className)}
    >
      {children}
      <span className={labelClassName}>{label}</span>
      {tapped && (
        <span role="status" className="block text-[9px] font-semibold text-slate-500">
          Not available yet
        </span>
      )}
    </button>
  )
}
