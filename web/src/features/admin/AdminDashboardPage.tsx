import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  Scale,
  Users,
  Store,
  Lock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Building2,
  DollarSign,
  Activity,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useAdminStore } from '@/lib/admin-store'
import { ToastNotification } from '@/components/ui/ToastNotification'
import { cn } from '@/lib/utils'

const chartData = [
  { day: 'Mon', volume: 1120000, revenue: 16800 },
  { day: 'Tue', volume: 1350000, revenue: 20250 },
  { day: 'Wed', volume: 1280000, revenue: 19200 },
  { day: 'Thu', volume: 1540000, revenue: 23100 },
  { day: 'Fri', volume: 1820000, revenue: 27300 },
  { day: 'Sat', volume: 2150000, revenue: 32250 },
  { day: 'Sun', volume: 1425000, revenue: 21375 },
]

export function AdminHome() {
  const {
    disputes,
    users,
    merchants,
    orders,
    settlements,
    settings,
    activeDisputesCount,
    pendingSettlementsCount,
    pendingMerchantsCount,
    totalVolumeInr,
    totalEscrowLockedUsdt,
  } = useAdminStore()

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const activeDisputes = disputes.filter((d) => d.status === 'PENDING')
  const pendingSettlements = settlements.filter((s) => s.status === 'PENDING')
  const recentOrders = orders.slice(0, 5)

  return (
    <div className="space-y-6">
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Hero Welcome & Emergency Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/20 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase">
              Live Production Node
            </span>
            <span className="text-xs text-slate-400">Escrow Contract: v2.4 Multi-Sig</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            FundFusion Master Platform Overview
          </h1>
          <p className="text-xs text-slate-400">
            Real-time telemetry, peer-to-peer liquidity velocity, and escrow arbitration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/disputes"
            className={cn(
              'px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-md',
              activeDisputesCount > 0
                ? 'bg-rose-500 text-white shadow-rose-500/20 animate-pulse'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            )}
          >
            <Scale className="w-4 h-4" />
            <span>{activeDisputesCount} Active Disputes</span>
          </Link>
          <Link
            to="/admin/settings"
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20"
          >
            <span>Rate: ₹{settings.baseUsdtRate}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 4 Core Platform Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Platform Volume */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-[11px]">24h Platform Volume</span>
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            ₹{totalVolumeInr.toLocaleString('en-IN')}
          </p>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-emerald-400 font-bold flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> +14.2%
            </span>
            <span className="text-slate-500">vs 7-day average</span>
          </div>
        </div>

        {/* Total Platform Revenue */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-[11px]">Platform Net Fees</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
            +{(totalVolumeInr * 0.005 / settings.baseUsdtRate).toFixed(2)} USDT
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-mono">≈ ₹{(totalVolumeInr * 0.005).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            <span>platform revenue</span>
          </div>
        </div>

        {/* Locked Smart Escrows */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-[11px]">Active Escrows Locked</span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            {totalEscrowLockedUsdt.toFixed(2)} USDT
          </p>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-amber-400 font-bold">100% Backed</span>
            <span className="text-slate-500">in multi-sig smart contract</span>
          </div>
        </div>

        {/* Verified Merchants & Desks */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-[11px]">Active Desks & Users</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            {merchants.length} Desks <span className="text-slate-500 font-normal text-lg">· {users.length} Users</span>
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-emerald-400 font-bold">{users.filter((u) => u.kycStatus === 'VERIFIED').length} KYC</span>
            <span>verified traders</span>
          </div>
        </div>
      </div>

      {/* Action Required Queue Section (Disputes & Pending Approvals) */}
      {(activeDisputesCount > 0 || pendingSettlementsCount > 0) && (
        <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/25 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
              <h2 className="text-sm font-black uppercase tracking-wider">
                Priority Action Queue ({activeDisputesCount + pendingSettlementsCount} Items Requiring Decision)
              </h2>
            </div>
            <span className="text-xs text-rose-400 font-mono">Live Escrow SLA: &lt; 15 mins</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {activeDisputes.map((disp) => (
              <div
                key={disp.id}
                className="p-3.5 rounded-2xl bg-slate-900/90 border border-rose-500/30 flex items-center justify-between gap-3 shadow-md"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-rose-400">{disp.id}</span>
                    <span className="text-slate-400 font-mono">Order #{disp.orderId}</span>
                  </div>
                  <p className="font-bold text-white truncate">{disp.buyer} vs {disp.merchant}</p>
                  <p className="text-[11px] text-slate-400 font-mono">₹{disp.inrAmount.toLocaleString('en-IN')} ({disp.usdtAmount.toFixed(2)} USDT)</p>
                </div>
                <Link
                  to="/admin/disputes"
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shrink-0 shadow-sm"
                >
                  Arbitrate
                </Link>
              </div>
            ))}

            {pendingSettlements.map((settl) => (
              <div
                key={settl.id}
                className="p-3.5 rounded-2xl bg-slate-900/90 border border-blue-500/30 flex items-center justify-between gap-3 shadow-md"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-blue-400">{settl.id}</span>
                    <span className="text-slate-400">{settl.bankName}</span>
                  </div>
                  <p className="font-bold text-white truncate">{settl.merchantName} ({settl.accountNumber})</p>
                  <p className="text-[11px] text-emerald-400 font-mono font-bold">₹{settl.amountInr.toLocaleString('en-IN')}</p>
                </div>
                <Link
                  to="/admin/settlements"
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shrink-0 shadow-sm"
                >
                  Approve
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-Day Platform Volume & Revenue Chart */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              <span>Platform Volume & Liquidity Settlement (7 Days)</span>
            </h2>
            <p className="text-xs text-slate-400">Total processed INR order flow and platform fee capture</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> INR Volume
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Revenue
            </span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '16px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(value: any, name: any) => [
                  name === 'volume' ? `₹${Number(value).toLocaleString('en-IN')}` : `₹${Number(value).toLocaleString('en-IN')}`,
                  name === 'volume' ? 'Total Volume' : 'Platform Net Fee',
                ]}
              />
              <Area type="monotone" dataKey="volume" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#volGrad)" />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders Live Activity Stream */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span>Recent Platform Orders & Escrow Operations</span>
            </h2>
            <p className="text-xs text-slate-400">Live feed of transactions moving across smart contract rails</p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>View All ({orders.length})</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="pb-3 pl-2">Order ID</th>
                <th className="pb-3">Buyer</th>
                <th className="pb-3">Merchant</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Payment Method</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {recentOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 pl-2 font-mono font-bold text-white">{o.id}</td>
                  <td className="py-3.5 font-bold text-slate-300">{o.buyerName}</td>
                  <td className="py-3.5 text-slate-300">{o.merchantName}</td>
                  <td className="py-3.5 font-mono">
                    <span className="font-bold text-white">₹{o.inrAmount.toLocaleString('en-IN')}</span>
                    <span className="text-[11px] text-slate-400 block font-normal">
                      ({o.usdtAmount.toFixed(2)} USDT)
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-400">{o.paymentMethod}</td>
                  <td className="py-3.5">
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[10px] font-black',
                        o.status === 'COMPLETED' && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                        o.status === 'DISPUTED' && 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse',
                        o.status === 'ESCROW_LOCKED' && 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                        o.status === 'UTR_SUBMITTED' && 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      )}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right pr-2">
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] transition-colors"
                    >
                      Inspect
                    </Link>
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

