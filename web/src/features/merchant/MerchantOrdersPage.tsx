import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BackButton } from '@/components/ui/BackButton'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useMerchantOrders } from './v1'

const ACTIVE = ['ACCEPTED', 'PAYMENT_SUBMITTED']

/** The orders this desk won (PRD §6.6). */
export function MerchantOrders({
  filter: defaultFilter,
}: {
  filter?: 'active' | 'done' | string
}) {
  const [tab, setTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>(
    defaultFilter === 'active' ? 'ACTIVE' : defaultFilter === 'done' ? 'COMPLETED' : 'ALL',
  )
  const q = useMerchantOrders()

  const mine = (q.data ?? []).filter((o) => o.role === 'MERCHANT')
  const rows = mine.filter((o) =>
    tab === 'ALL'
      ? true
      : tab === 'ACTIVE'
        ? ACTIVE.includes(o.status)
        : !ACTIVE.includes(o.status),
  )

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-2">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/merchant/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              My Orders
            </h1>
            <p className="text-[11px] text-slate-500">Escrow and settlement</p>
          </div>
        </div>
        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {rows.length}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer',
              tab === t
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {q.isLoading && <Skeleton className="h-24 rounded-2xl" />}
      {q.error && <p className="text-rose-500 font-bold p-4 text-sm">{q.error.message}</p>}

      <div className="space-y-2">
        {!q.isLoading && rows.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            No orders in this view.
          </div>
        )}
        {rows.map((o) => (
          <Link
            key={o.orderId}
            to={`/merchant/orders/${o.orderId}`}
            className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs group cursor-pointer"
          >
            <div className="min-w-0">
              <span className="text-xs font-black text-slate-900 dark:text-white block group-hover:text-emerald-500 transition-colors">
                {o.side} · {o.status.replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date(o.updatedAt).toLocaleString()}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-black font-mono text-slate-900 dark:text-white block break-all">
                {o.usdtAmount} USDT
              </span>
              <span className="text-[10px] text-slate-400 font-mono">₹{o.inrAmount}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
