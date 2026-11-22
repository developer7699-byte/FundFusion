import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * A USDT ledger string at 2dp for display (PRD §5.1).
 *
 * Works on the string and BigInt, never a `number`: the caller keeps the
 * full-precision string, this only decides what the eye sees. Rounds half up.
 */
export function usdt2dp(value: string | undefined): string {
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec((value ?? '0').trim())
  if (!m) return '0.00'
  const [, sign, whole, frac = ''] = m
  const padded = (frac + '00').slice(0, 3)
  let cents = BigInt(whole) * 100n + BigInt(padded.slice(0, 2))
  if ((padded[2] ?? '0') >= '5') cents += 1n
  const units = cents / 100n
  const rest = (cents % 100n).toString().padStart(2, '0')
  const out = `${new Intl.NumberFormat('en-IN').format(units)}.${rest}`
  return cents === 0n ? out : `${sign}${out}`
}
