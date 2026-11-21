import { useState } from 'react'
import { Store } from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { acceptOrder, openDesk, useDesk, useFeed } from './v1'
import { useQueryClient } from '@tanstack/react-query'

/**
 * The live order feed (PRD §6.7).
 *
 * Every order is broadcast to every eligible merchant at one instant and the
 * first to accept wins atomically. This screen never decides eligibility —
 * it shows what the server offered and reports, word for word, whichever
 * refusal comes back when the race is lost.
 */
export function MerchantAvailable() {
  const qc = useQueryClient()
  const desk = useDesk()
  const feed = useFeed()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const accept = async (orderId: string) => {
    setError('')
    setBusy(orderId)
    try {
      await acceptOrder(orderId)
      await qc.invalidateQueries({ queryKey: ['merchant'] })
      await qc.invalidateQueries({ queryKey: ['wallet'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That order could not be taken.')
    } finally {
      setBusy(null)
    }
  }

  const open = async () => {
    setError('')
    setBusy('desk')
    try {
      await openDesk('My Desk')
      await qc.invalidateQueries({ queryKey: ['merchant'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That desk could not be opened.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-2">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/merchant/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Available Orders
            </h1>
            <p className="text-[11px] text-slate-500">
              First to accept wins. Live.
            </p>
          </div>
        </div>
        {desk.data && (
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {desk.data.status}
          </span>
        )}
      </div>

      {!desk.isLoading && !desk.data && (
        <div className="rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-5 space-y-3 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
            <Store className="h-7 w-7" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            You have no merchant desk. Opening one lets you take orders; what
            you can actually take is decided by your USDT balance.
          </p>
          <Button
            type="button"
            onClick={() => void open()}
            disabled={busy === 'desk'}
            className="w-full h-11 rounded-full font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900"
          >
            {busy === 'desk' ? 'Opening...' : 'Open a desk'}
          </Button>
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-500 font-medium bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
          {error}
        </p>
      )}

      {feed.isLoading && <Skeleton className="h-24 rounded-2xl" />}
      {feed.error && (
        <p className="text-rose-500 font-bold p-4 text-sm">{feed.error.message}</p>
      )}

      <div className="space-y-2">
        {!feed.isLoading && (feed.data ?? []).length === 0 && desk.data && (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            Nothing to take right now.
          </div>
        )}

        {(feed.data ?? []).map((o) => (
          <div
            key={o.orderId}
            className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-3 shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-black text-slate-900 dark:text-white block">
                  Customer {o.side === 'SELL' ? 'sells' : 'buys'} USDT
                </span>
                <span className="text-[10px] text-slate-400">
                  Expires {new Date(o.expiresAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-black font-mono text-slate-900 dark:text-white block break-all">
                  {o.usdtAmount} USDT
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ₹{o.inrAmount} at ₹{o.customerRate}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 text-[11px] flex justify-between gap-3">
              <span className="text-slate-500">
                {o.side === 'SELL' ? 'You bond' : 'You lock'}
              </span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 break-all">
                {o.obligationUsdt} USDT
              </span>
            </div>

            <Button
              type="button"
              onClick={() => void accept(o.orderId)}
              disabled={busy === o.orderId}
              className="w-full h-10 rounded-full font-semibold text-xs bg-emerald-500 text-white"
            >
              {busy === o.orderId ? 'Accepting...' : 'Accept order'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
