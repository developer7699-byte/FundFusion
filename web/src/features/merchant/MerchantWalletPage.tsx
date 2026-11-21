import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, Lock } from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useActivity, useWalletSummary } from '@/features/customer/wallet-flows'

/**
 * The desk's USDT (PRD §5.2, §6.5).
 *
 * A merchant's wallet is the same wallet as anyone else's — the same ledger,
 * the same four buckets. What is particular to a desk is that BONDED is the
 * guarantee behind its rupee promises, so it is shown beside the spendable
 * balance rather than folded into a total.
 */
export function MerchantWallet() {
  const q = useWalletSummary()
  const activity = useActivity()

  if (q.isLoading) return <Skeleton className="h-40 rounded-3xl" />
  if (q.error) return <p className="text-rose-500 font-bold p-4 text-sm">{q.error.message}</p>
  const d = q.data!

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/merchant/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Desk Wallet
            </h1>
            <p className="text-[11px] text-slate-500">Liquidity and bonds</p>
          </div>
        </div>
        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          {d.network}
        </span>
      </div>

      <div className="rounded-[28px] bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950 text-white p-5 space-y-3 shadow-xl border border-emerald-500/30">
        <div>
          <span className="text-xs text-slate-400 font-medium">Available to bond</span>
          <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight mt-0.5 break-all">
            {d.balances.AVAILABLE} <span className="text-base">USDT</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
          {[
            ['BONDED', 'Bonded against orders', 'text-sky-300'],
            ['LOCKED', 'Locked in escrow', 'text-amber-300'],
          ].map(([key, label, tone]) => (
            <div key={key}>
              <span className="text-[10px] text-slate-400 block uppercase">{label}</span>
              <span className={cn('font-mono font-bold break-all', tone)}>
                {d.balances[key]} USDT
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/customer/wallet/deposit"
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-[#22c55e] text-white"
        >
          <ArrowDown className="w-4 h-4" /> Add liquidity
        </Link>
        <Link
          to="/customer/wallet/withdraw"
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900"
        >
          <ArrowUp className="w-4 h-4" /> Withdraw
        </Link>
      </div>

      <div className="rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-4 space-y-3 shadow-xs">
        <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" /> Ledger history
        </h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {(activity.data ?? []).slice(0, 10).map((row) => (
            <div key={row.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-black text-slate-900 dark:text-white block">
                  {row.kind}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(row.at).toLocaleString()}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-black font-mono text-slate-900 dark:text-white block break-all">
                  {row.direction === 'DEBIT' ? '−' : '+'}
                  {row.amount} {row.assetSymbol}
                </span>
                <span className="text-[9px] font-extrabold px-1.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {row.bucket}
                </span>
              </div>
            </div>
          ))}
          {activity.data?.length === 0 && (
            <p className="py-3 text-xs text-slate-400">Nothing has moved yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
