import { useState } from 'react'
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ArrowDownRight,
  ShieldCheck,
  Search,
} from 'lucide-react'
import { useAdminStore, type AdminSettlement } from '@/lib/admin-store'
import { ToastNotification } from '@/components/ui/ToastNotification'
import { cn } from '@/lib/utils'

export function AdminSettlements() {
  const { settlements, approveSettlement, rejectSettlement, pendingSettlementsCount } = useAdminStore()
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const filteredSettlements = settlements.filter((s) => {
    if (filter !== 'ALL' && s.status !== filter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        s.id.toLowerCase().includes(q) ||
        s.merchantName.toLowerCase().includes(q) ||
        s.bankName.toLowerCase().includes(q) ||
        (s.utr && s.utr.toLowerCase().includes(q))
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-blue-400" />
            <span>Merchant Bank Payouts & Fiat Settlement Queue</span>
          </h1>
          <p className="text-xs text-slate-400">
            Process outbound RTGS, IMPS, and NEFT fiat withdrawals requested by OTC liquidity providers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            Pending Approval: <span className="text-blue-400 font-bold">{pendingSettlementsCount}</span>
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex p-1 rounded-2xl bg-slate-900 border border-slate-800 gap-1 text-xs font-bold">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilter(st)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl transition-all cursor-pointer text-xs',
                filter === st ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              )}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search settlement, merchant, bank..."
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Settlements Table */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-950/40">
                <th className="py-3.5 pl-4">Settlement ID</th>
                <th className="py-3.5">Merchant Partner</th>
                <th className="py-3.5">Payout Amount (INR)</th>
                <th className="py-3.5">USDT Deducted</th>
                <th className="py-3.5">Target Bank Account</th>
                <th className="py-3.5">Bank UTR Ref</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredSettlements.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 pl-4 font-mono font-bold text-white">
                    {s.id}
                    <span className="text-[10px] text-slate-500 block font-normal">{s.requestedAt}</span>
                  </td>

                  <td className="py-3.5 font-bold text-white">{s.merchantName}</td>

                  <td className="py-3.5 font-mono text-emerald-400 font-bold text-sm">
                    ₹{s.amountInr.toLocaleString('en-IN')}
                  </td>

                  <td className="py-3.5 font-mono text-slate-300">
                    -{s.usdtDeducted.toFixed(2)} USDT
                  </td>

                  <td className="py-3.5">
                    <span className="text-white font-bold block">{s.bankName}</span>
                    <span className="font-mono text-slate-400 text-[11px] block">{s.accountNumber} · {s.ifsc}</span>
                  </td>

                  <td className="py-3.5 font-mono text-[11px] text-slate-300">
                    {s.utr || 'Pending bank batch transfer'}
                  </td>

                  <td className="py-3.5">
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-[10px] font-black',
                        s.status === 'APPROVED' && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                        s.status === 'PENDING' && 'bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse',
                        s.status === 'REJECTED' && 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      )}
                    >
                      {s.status}
                    </span>
                  </td>

                  <td className="py-3.5 text-right pr-4 space-x-1.5 whitespace-nowrap">
                    {s.status === 'PENDING' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            approveSettlement(s.id)
                            showToast(`Settlement ${s.id} approved! IMPS UTR generated.`)
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] shadow-sm transition-colors cursor-pointer"
                        >
                          Execute Transfer
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            rejectSettlement(s.id, 'Bank details mismatch')
                            showToast(`Settlement ${s.id} rejected and refunded to merchant vault`)
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-500 text-[11px] font-mono">Completed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

