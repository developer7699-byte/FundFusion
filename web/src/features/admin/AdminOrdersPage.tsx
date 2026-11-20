import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeftRight,
  Search,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  X,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'
import { useAdminStore, type AdminOrder } from '@/lib/admin-store'
import { ToastNotification } from '@/components/ui/ToastNotification'
import { cn } from '@/lib/utils'

export function AdminOrders() {
  const { orders, overrideOrder } = useAdminStore()
  const { orderId: paramOrderId } = useParams()
  const [filter, setFilter] = useState<'ALL' | 'ESCROW_LOCKED' | 'UTR_SUBMITTED' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(
    paramOrderId ? orders.find((o) => o.id === paramOrderId) || null : null
  )
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const filteredOrders = orders.filter((o) => {
    if (filter !== 'ALL' && o.status !== filter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        o.id.toLowerCase().includes(q) ||
        o.buyerName.toLowerCase().includes(q) ||
        o.merchantName.toLowerCase().includes(q) ||
        (o.utr && o.utr.toLowerCase().includes(q))
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
            <ArrowLeftRight className="w-6 h-6 text-blue-400" />
            <span>Platform Escrow Book & Order Lifecycle</span>
          </h1>
          <p className="text-xs text-slate-400">
            Real-time inspection of multi-sig smart contract escrows, bank UTR references, and emergency overrides.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            Total Orders Logged: <span className="text-white font-bold">{orders.length}</span>
          </span>
        </div>
      </div>

      {/* 4 Summary Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-amber-400 font-bold uppercase text-[10px]">Escrow Locked</span>
          <p className="text-xl font-black text-amber-400 font-mono">
            {orders.filter((o) => o.status === 'ESCROW_LOCKED').length} Orders
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-blue-400 font-bold uppercase text-[10px]">UTR Transferred</span>
          <p className="text-xl font-black text-blue-400 font-mono">
            {orders.filter((o) => o.status === 'UTR_SUBMITTED').length} Orders
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-rose-400 font-bold uppercase text-[10px]">Disputed</span>
          <p className="text-xl font-black text-rose-400 font-mono">
            {orders.filter((o) => o.status === 'DISPUTED').length} Orders
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-emerald-400 font-bold uppercase text-[10px]">Settled / Completed</span>
          <p className="text-xl font-black text-emerald-400 font-mono">
            {orders.filter((o) => o.status === 'COMPLETED').length} Orders
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap p-1 rounded-2xl bg-slate-900 border border-slate-800 gap-1 text-xs font-bold">
          {(['ALL', 'ESCROW_LOCKED', 'UTR_SUBMITTED', 'COMPLETED', 'DISPUTED', 'CANCELLED'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs',
                filter === s ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              )}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order ID, buyer, merchant, UTR..."
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-950/40">
                <th className="py-3.5 pl-4">Order ID</th>
                <th className="py-3.5">Buyer</th>
                <th className="py-3.5">Merchant</th>
                <th className="py-3.5">Amount (INR / USDT)</th>
                <th className="py-3.5">Payment Rail & UTR</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 pl-4 font-mono font-bold text-white">
                    {o.id}
                    <span className="text-[10px] text-slate-500 block font-normal">{o.createdAt}</span>
                  </td>

                  <td className="py-3.5 font-bold text-slate-300">{o.buyerName}</td>
                  <td className="py-3.5 text-slate-300">{o.merchantName}</td>

                  <td className="py-3.5 font-mono">
                    <span className="font-bold text-white block">₹{o.inrAmount.toLocaleString('en-IN')}</span>
                    <span className="text-[11px] text-emerald-400">{o.usdtAmount.toFixed(2)} USDT</span>
                  </td>

                  <td className="py-3.5">
                    <span className="text-slate-300 block">{o.paymentMethod}</span>
                    <span className="font-mono text-[10px] text-slate-500">UTR: {o.utr || 'Awaiting buyer transfer'}</span>
                  </td>

                  <td className="py-3.5">
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-[10px] font-black',
                        o.status === 'COMPLETED' && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                        o.status === 'DISPUTED' && 'bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse',
                        o.status === 'ESCROW_LOCKED' && 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                        o.status === 'UTR_SUBMITTED' && 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                        o.status === 'CANCELLED' && 'bg-slate-800 text-slate-400'
                      )}
                    >
                      {o.status}
                    </span>
                  </td>

                  <td className="py-3.5 text-right pr-4">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(o)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail & Emergency Override Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-black">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Order Inspector #{selectedOrder.id}</h3>
                  <p className="text-xs text-slate-400">Escrow smart contract state</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[10px]">Buyer Name</span>
                <p className="font-bold text-white">{selectedOrder.buyerName}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[10px]">Merchant OTC Desk</span>
                <p className="font-bold text-white">{selectedOrder.merchantName}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[10px]">Crypto Escrow</span>
                <p className="font-mono font-bold text-emerald-400 text-sm">{selectedOrder.usdtAmount.toFixed(2)} USDT</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[10px]">Fiat Settlement</span>
                <p className="font-mono font-bold text-white text-sm">₹{selectedOrder.inrAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Exchange Rate:</span>
                <span className="text-slate-200">₹{selectedOrder.rate} / USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Channel:</span>
                <span className="text-slate-200">{selectedOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bank UTR Reference:</span>
                <span className="text-white font-bold">{selectedOrder.utr || 'None submitted'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                <span className="text-indigo-400 font-bold">{selectedOrder.status}</span>
              </div>
            </div>

            {/* Emergency Admin Overrides */}
            {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-400 block">
                  Emergency Smart Contract Overrides
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      overrideOrder(selectedOrder.id, 'FORCE_COMPLETE')
                      showToast(`Order #${selectedOrder.id} forcefully marked as COMPLETED`)
                      setSelectedOrder(null)
                    }}
                    className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors"
                  >
                    Force Complete & Release
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      overrideOrder(selectedOrder.id, 'FORCE_CANCEL')
                      showToast(`Order #${selectedOrder.id} forcefully CANCELLED & refunded`)
                      setSelectedOrder(null)
                    }}
                    className="py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 font-bold text-xs border border-rose-500/30 transition-colors"
                  >
                    Force Cancel & Refund
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminOrderDetail() {
  return <AdminOrders />
}

