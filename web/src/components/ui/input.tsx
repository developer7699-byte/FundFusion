import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-xl border border-nx-line bg-nx-bg/60 px-3 text-sm text-nx-text outline-none placeholder:text-nx-muted/70 focus:border-nx-accent',
        className,
      )}
      {...props}
    />
  )
}
