import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const styles = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-nx-accent text-white hover:brightness-110 shadow-[0_0_0_1px_rgba(139,124,255,0.3)]',
        mint: 'bg-nx-mint text-nx-bg hover:brightness-110',
        ghost: 'bg-white/5 text-nx-text hover:bg-white/10 border border-nx-line',
        danger: 'bg-nx-err/15 text-nx-err hover:bg-nx-err/25',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-11 px-4',
        lg: 'h-12 px-5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof styles>) {
  return <button className={cn(styles({ variant, size }), className)} {...props} />
}
