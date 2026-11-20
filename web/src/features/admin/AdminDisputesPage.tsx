import { useState } from 'react'
import {
  Scale,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Store,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Sparkles,
  X,
  Search,
} from 'lucide-react'
import { useAdminStore, type AdminDispute } from '@/lib/admin-store'
import { ToastNotification } from '@/components/ui/ToastNotification'
import { cn } from '@/lib/utils'

export function AdminDisputes() {
  const { disputes, resolveDispute, activeDisputesCount } = useAdminStore()
  const [filter, setFilter] = useState<'ACTIVE' | 'RESOLVED' | 'ALL'>('ACTIVE')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDispute, setSelectedDispute] = useState<AdminDispute | null>(null)
  const [rulingAction, setRulingAction] = useState<'RELEASE_TO_BUYER' | 'REFUND_TO_MERCHANT' | null>(null)
  const [rulingNote, setRulingNote] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const filteredDisputes = disputes.filter((d) => {
    if (filter === 'ACTIVE') {
      if (d.status !== 'PENDING') return false
    } else if (filter === 'RESOLVED') {
      if (d.status === 'PENDING') return false
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        d.id.toLowerCase().includes(q) ||
        d.orderId.toLowerCase().includes(q) ||
        d.buyer.toLowerCase().includes(q) ||
        d.merchant.toLowerCase().includes(q) ||
        (d.utr && d.utr.toLowerCase().includes(q))
      )
    }
    return true
  })

  const handleConfirmRuling = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDispute || !rulingAction) return

    const note = rulingNote.trim() || (rulingAction === 'RELEASE_TO_BUYER' ? 'Bank receipt verified' : 'Payment not received')
    resolveDispute(selectedDispute.id, rulingAction, note)

    showToast(
      rulingAction === 'RELEASE_TO_BUYER'
        ? `Dispute ${selectedDispute.id} ruled in favor of Buyer. ${selectedDispute.usdtAmount} USDT released!`
        : `Dispute ${selectedDispute.id} ruled in favor of Merchant. ${selectedDispute.usdtAmount} USDT refunded!`
    )

    setSelectedDispute(null)
    setRulingAction(null)
    setRulingNote('')
  }

  return (
    <div className="space-y-6">
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-rose-500" />
            <span>P2P Escrow Arbitration & Dispute Resolution</span>
          </h1>
          <p className="text-xs text-slate-400">
            Platform judicial desk for escrow multi-sig releases, fraudulent UTR claims, and refund executions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-black flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>{activeDisputesCount} Active Disputes</span>
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex p-1 rounded-2xl bg-slate-900 border border-slate-800 gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setFilter('ACTIVE')}
            className={cn(
              'px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5',
              filter === 'ACTIVE'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <span>Active Disputes</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/40 text-white">
              {disputes.filter((d) => d.status === 'PENDING').length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('RESOLVED')}
            className={cn(
              'px-4 py-2 rounded-xl transition-all cursor-pointer',
              filter === 'RESOLVED'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Resolved ({disputes.filter((d) => d.status !== 'PENDING').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={cn(
              'px-4 py-2 rounded-xl transition-all cursor-pointer',
              filter === 'ALL'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            )}
          >
            All ({disputes.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dispute, order, buyer..."
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          />
        </div>
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {filteredDisputes.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-white">Zero Pending Disputes Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All peer-to-peer escrow trades are currently settling cleanly across verified bank and UPI channels.
            </p>
          </div>
        ) : (
          filteredDisputes.map((disp) => (
            <div
              key={disp.id}
              className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 relative overflow-hidden"
            >
              {/* Top Row: Case Meta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-black">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-white">{disp.id}</span>
                      <span className="text-slate-500">·</span>
                      <span className="font-mono text-xs text-slate-400">Order #{disp.orderId}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{disp.createdAt}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-black',
                      disp.status === 'PENDING' && 'bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse',
                      disp.status === 'RESOLVED_RELEASE' && 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                      disp.status === 'RESOLVED_REFUND' && 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    )}
                  >
                    {disp.status === 'PENDING' ? 'ARBITRATION ACTIVE' : disp.status}
                  </span>
                </div>
              </div>

              {/* Two Parties & Trade Amounts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Buyer */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px]">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>Buyer (Claiming Paid)</span>
                  </div>
                  <p className="font-bold text-white text-sm">{disp.buyer}</p>
                  <p className="text-slate-500 font-mono text-[11px]">Paid via {disp.paymentMethod}</p>
                </div>

                {/* Merchant */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px]">
                    <Store className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Merchant (Escrow Holder)</span>
                  </div>
                  <p className="font-bold text-white text-sm">{disp.merchant}</p>
                  <p className="text-slate-500 font-mono text-[11px]">UTR Claim: {disp.utr || 'None'}</p>
                </div>

                {/* Amount in Dispute */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Locked Escrow</div>
                  <p className="font-mono font-black text-emerald-400 text-sm">
                    {disp.usdtAmount.toFixed(2)} USDT
                  </p>
                  <p className="text-slate-400 font-mono text-[11px]">
                    ₹{disp.inrAmount.toLocaleString('en-IN')} (Rate: ₹{disp.rate})
                  </p>
                </div>
              </div>

              {/* Dispute Reason & Chat Transcript */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                    Dispute Reason Stated:
                  </span>
                  <p className="text-slate-200 leading-relaxed font-medium">{disp.reason}</p>
                </div>

                {disp.chatSnippet && (
                  <div className="pt-2 border-t border-slate-900 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-indigo-400" />
                      <span>Encrypted P2P Trade Chat Transcript:</span>
                    </span>
                    <p className="font-mono text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                      {disp.chatSnippet}
                    </p>
                  </div>
                )}

                {disp.resolutionNote && (
                  <div className="pt-2 border-t border-slate-900 text-emerald-400 text-xs">
                    <span className="font-black block uppercase text-[10px]">Admin Ruling Recorded:</span>
                    <p className="font-medium">{disp.resolutionNote}</p>
                    <span className="text-[10px] text-slate-500 font-mono">Resolved: {disp.resolvedAt}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons for Pending Disputes */}
              {disp.status === 'PENDING' && (
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDispute(disp)
                      setRulingAction('REFUND_TO_MERCHANT')
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-amber-500/20"
                  >
                    <XCircle className="w-4 h-4 text-amber-400" />
                    <span>Refund Escrow to Merchant</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDispute(disp)
                      setRulingAction('RELEASE_TO_BUYER')
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Force Release {disp.usdtAmount.toFixed(2)} USDT to Buyer</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Arbitration Ruling Execution Modal */}
      {selectedDispute && rulingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleConfirmRuling}
            className="w-full max-w-md bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center font-bold',
                  rulingAction === 'RELEASE_TO_BUYER' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                )}>
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Execute Arbitration Ruling</h3>
                  <p className="text-xs text-slate-400">Case {selectedDispute.id} · Order #{selectedDispute.orderId}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedDispute(null)
                  setRulingAction(null)
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <span className="text-[10px] font-black uppercase text-slate-500">Ruling Execution Summary:</span>
              <p className="text-white font-bold">
                {rulingAction === 'RELEASE_TO_BUYER'
                  ? `Release ${selectedDispute.usdtAmount.toFixed(2)} USDT to Buyer ${selectedDispute.buyer}`
                  : `Refund ${selectedDispute.usdtAmount.toFixed(2)} USDT back to Merchant ${selectedDispute.merchant}`}
              </p>
              <p className="text-[11px] text-slate-400">
                INR Transaction Amount: ₹{selectedDispute.inrAmount.toLocaleString('en-IN')} (UTR: {selectedDispute.utr || 'N/A'})
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-300">
                Official Judicial / Bank Verification Note *
              </label>
              <textarea
                value={rulingNote}
                onChange={(e) => setRulingNote(e.target.value)}
                placeholder="e.g. Bank statement reviewed, UTR credited to merchant HDFC account on 13/11. Release approved."
                rows={3}
                required
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedDispute(null)
                  setRulingAction(null)
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>

              <button
                type="submit"
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-white font-black text-xs shadow-md transition-all',
                  rulingAction === 'RELEASE_TO_BUYER'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                )}
              >
                Confirm & Execute Ruling
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

