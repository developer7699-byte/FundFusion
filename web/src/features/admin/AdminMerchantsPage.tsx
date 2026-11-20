import { useState } from 'react'
import {
  Store,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  DollarSign,
  TrendingUp,
  Clock,
  Building2,
  X,
  Play,
  Pause,
  Percent,
} from 'lucide-react'
import { useAdminStore, type AdminMerchant } from '@/lib/admin-store'
import { ToastNotification } from '@/components/ui/ToastNotification'
import { cn } from '@/lib/utils'

export function AdminMerchants() {
  const {
    merchants,
    toggleMerchantStatus,
    updateMerchantCommission,
  } = useAdminStore()

  const [selectedMerchant, setSelectedMerchant] = useState<AdminMerchant | null>(null)
  const [newCommission, setNewCommission] = useState('1.5')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const totalVault = merchants.reduce((sum, m) => sum + m.availableUsdt + m.lockedUsdt, 0)
  const totalVolume = merchants.reduce((sum, m) => sum + m.totalVolumeInr, 0)

  const handleSaveCommission = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMerchant) return

    const rate = parseFloat(newCommission) / 100
    if (isNaN(rate) || rate <= 0) return

    updateMerchantCommission(selectedMerchant.id, rate)
    showToast(`Commission tier updated to ${newCommission}% for ${selectedMerchant.deskName}`)
    setSelectedMerchant(null)
  }

  return (
    <div className="space-y-6">
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Store className="w-6 h-6 text-emerald-400" />
            <span>OTC Liquidity Partner Desks & Commission Tiers</span>
          </h1>
          <p className="text-xs text-slate-400">
            Control registered merchant desks, escrow vault balances, commission fee tiers, and desk liquidity rails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            Active Desks: <span className="text-emerald-400 font-bold">{merchants.filter((m) => m.status === 'ACTIVE').length}</span>
          </span>
        </div>
      </div>

      {/* 4 Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Total Desk Liquidity</span>
          <p className="text-xl font-black text-white font-mono">
            {totalVault.toFixed(2)} USDT
          </p>
          <span className="text-[10px] text-slate-500 font-mono">across all partner vaults</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-emerald-400 font-bold uppercase text-[10px]">Total Settled Volume</span>
          <p className="text-xl font-black text-emerald-400 font-mono">
            ₹{totalVolume.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-500">cumulative OTC volume</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-amber-400 font-bold uppercase text-[10px]">Active Partner Desks</span>
          <p className="text-xl font-black text-amber-400 font-mono">
            {merchants.filter((m) => m.status === 'ACTIVE').length} Active
          </p>
          <span className="text-[10px] text-slate-500 font-mono">providing order liquidity</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-indigo-400 font-bold uppercase text-[10px]">Pending Applications</span>
          <p className="text-xl font-black text-indigo-400 font-mono">
            {merchants.filter((m) => m.status === 'PENDING').length} Desks
          </p>
          <span className="text-[10px] text-slate-500">awaiting compliance approval</span>
        </div>
      </div>

      {/* Merchants Table */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-950/40">
                <th className="py-3.5 pl-4">Merchant Desk</th>
                <th className="py-3.5">Available Vault</th>
                <th className="py-3.5">Locked Escrow</th>
                <th className="py-3.5">Settled Volume</th>
                <th className="py-3.5">Commission Tier</th>
                <th className="py-3.5">Default Bank Rail</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {merchants.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 pl-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black text-xs flex items-center justify-center shrink-0">
                        <Store className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-white block">{m.deskName}</span>
                        <span className="text-[11px] text-slate-400 font-mono block">{m.ownerEmail}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 font-mono text-emerald-400 font-bold">
                    {m.availableUsdt.toFixed(2)} USDT
                  </td>

                  <td className="py-3.5 font-mono text-amber-400 font-bold">
                    {m.lockedUsdt.toFixed(2)} USDT
                  </td>

                  <td className="py-3.5 font-mono text-slate-300">
                    ₹{m.totalVolumeInr.toLocaleString('en-IN')}
                    <span className="text-[10px] text-slate-500 block font-normal">{m.totalTrades} completed trades</span>
                  </td>

                  <td className="py-3.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMerchant(m)
                        setNewCommission(String(m.commissionRate * 100))
                      }}
                      className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-black hover:bg-amber-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>{(m.commissionRate * 100).toFixed(2)}% Tier</span>
                      <Sliders className="w-2.5 h-2.5" />
                    </button>
                  </td>

                  <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                    {m.defaultBank}
                  </td>

                  <td className="py-3.5">
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-[10px] font-black',
                        m.status === 'ACTIVE' && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                        m.status === 'PAUSED' && 'bg-slate-700 text-slate-300',
                        m.status === 'PENDING' && 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                      )}
                    >
                      {m.status}
                    </span>
                  </td>

                  <td className="py-3.5 text-right pr-4 space-x-1.5 whitespace-nowrap">
                    {m.status === 'PENDING' ? (
                      <button
                        type="button"
                        onClick={() => {
                          toggleMerchantStatus(m.id, 'ACTIVE')
                          showToast(`Merchant desk ${m.deskName} approved and live!`)
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] shadow-sm transition-colors cursor-pointer"
                      >
                        Approve Desk
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          toggleMerchantStatus(m.id)
                          showToast(`Desk ${m.deskName} status toggled`)
                        }}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg font-bold text-[11px] border transition-colors cursor-pointer inline-flex items-center gap-1',
                          m.status === 'ACTIVE'
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-500/30'
                        )}
                      >
                        {m.status === 'ACTIVE' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        <span>{m.status === 'ACTIVE' ? 'Pause Desk' : 'Resume Desk'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Commission Tier Modal */}
      {selectedMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleSaveCommission}
            className="w-full max-w-sm bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Adjust Commission Tier</h3>
                  <p className="text-xs text-slate-400">{selectedMerchant.deskName}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMerchant(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-300">Desk Rebate Commission Rate (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  min="0.5"
                  max="5.0"
                  value={newCommission}
                  onChange={(e) => setNewCommission(e.target.value)}
                  className="w-full p-3 pr-8 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">%</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Current default tier is 1.50% volume spread per settled P2P trade.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedMerchant(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md"
              >
                Save New Tier
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

