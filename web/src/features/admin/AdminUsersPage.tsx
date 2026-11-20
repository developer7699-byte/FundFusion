import { useState } from 'react'
import {
  Users,
  Search,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  CheckCircle2,
  AlertCircle,
  Clock,
  MoreVertical,
  X,
  ExternalLink,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import { useAdminStore, type AdminUser } from '@/lib/admin-store'
import { ToastNotification } from '@/components/ui/ToastNotification'
import { cn } from '@/lib/utils'

export function AdminUsers() {
  const { users, toggleUserStatus, verifyUserKyc, adjustUserBalance } = useAdminStore()
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CUSTOMER' | 'MERCHANT' | 'ADMIN'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [isAdjustingBalance, setIsAdjustingBalance] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && !u.roles.includes(roleFilter)) return false
    if (statusFilter !== 'ALL' && u.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
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
            <Users className="w-6 h-6 text-indigo-400" />
            <span>Platform User Directory & KYC Compliance</span>
          </h1>
          <p className="text-xs text-slate-400">
            Monitor registered traders, KYC verification states, security status, and anti-fraud sanctions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            Total Registered: <span className="text-white font-bold">{users.length}</span>
          </span>
        </div>
      </div>

      {/* 4 Summary Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Active Accounts</span>
          <p className="text-xl font-black text-white font-mono">
            {users.filter((u) => u.status === 'ACTIVE').length}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-emerald-400 font-bold uppercase text-[10px]">KYC Level 2 Verified</span>
          <p className="text-xl font-black text-emerald-400 font-mono">
            {users.filter((u) => u.kycStatus === 'VERIFIED').length}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-amber-400 font-bold uppercase text-[10px]">KYC Pending Review</span>
          <p className="text-xl font-black text-amber-400 font-mono">
            {users.filter((u) => u.kycStatus === 'PENDING').length}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-rose-400 font-bold uppercase text-[10px]">Suspended / Frozen</span>
          <p className="text-xl font-black text-rose-400 font-mono">
            {users.filter((u) => u.status === 'SUSPENDED').length}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <div className="flex p-1 rounded-2xl bg-slate-900 border border-slate-800 gap-1 text-xs font-bold">
            {(['ALL', 'CUSTOMER', 'MERCHANT', 'ADMIN'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={cn(
                  'px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs',
                  roleFilter === r ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                )}
              >
                {r === 'ALL' ? 'All Roles' : r}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex p-1 rounded-2xl bg-slate-900 border border-slate-800 gap-1 text-xs font-bold">
            {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs',
                  statusFilter === s ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, ID..."
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-950/40">
                <th className="py-3.5 pl-4">User</th>
                <th className="py-3.5">Roles</th>
                <th className="py-3.5">KYC Status</th>
                <th className="py-3.5">Wallet Balance</th>
                <th className="py-3.5">Total Volume</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 pl-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {u.displayName.slice(1, 3).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-white block">{u.displayName}</span>
                        <span className="text-[11px] text-slate-400 font-mono truncate block">{u.email}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5">
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.map((r) => (
                        <span
                          key={r}
                          className="px-2 py-0.5 rounded-md text-[9px] font-black bg-indigo-500/15 text-indigo-300 border border-indigo-500/25"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3.5">
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 w-fit',
                        u.kycStatus === 'VERIFIED' && 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                        u.kycStatus === 'PENDING' && 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
                        u.kycStatus === 'UNVERIFIED' && 'bg-slate-800 text-slate-400 border border-slate-700'
                      )}
                    >
                      {u.kycStatus === 'VERIFIED' && <ShieldCheck className="w-3 h-3" />}
                      {u.kycStatus === 'PENDING' && <Clock className="w-3 h-3" />}
                      <span>{u.kycStatus}</span>
                    </span>
                  </td>

                  <td className="py-3.5 font-mono text-white font-bold">
                    {u.walletBalanceUsdt.toFixed(2)} USDT
                  </td>

                  <td className="py-3.5 font-mono text-slate-300">
                    ₹{u.totalVolumeInr.toLocaleString('en-IN')}
                    <span className="text-[10px] text-slate-500 block font-normal">{u.totalTrades} trades</span>
                  </td>

                  <td className="py-3.5">
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-[10px] font-black',
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      )}
                    >
                      {u.status}
                    </span>
                  </td>

                  <td className="py-3.5 text-right pr-4 space-x-1.5 whitespace-nowrap">
                    {u.kycStatus === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => {
                          verifyUserKyc(u.id)
                          showToast(`KYC verified for ${u.displayName}`)
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-bold text-[11px] border border-emerald-500/30 transition-colors cursor-pointer"
                        title="Approve KYC"
                      >
                        Approve KYC
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        toggleUserStatus(u.id)
                        showToast(`Status toggled for ${u.displayName}`)
                      }}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg font-bold text-[11px] border transition-colors cursor-pointer',
                        u.status === 'ACTIVE'
                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      )}
                    >
                      {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedUser(u)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] transition-colors cursor-pointer"
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

      {/* User Inspection Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
                  {selectedUser.displayName.slice(1, 3).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">{selectedUser.displayName}</h3>
                  <p className="text-xs text-slate-400">{selectedUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[10px]">KYC Status</span>
                <p className="font-bold text-white">{selectedUser.kycStatus}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[10px]">Account Status</span>
                <p className="font-bold text-white">{selectedUser.status}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[10px]">Vault Balance</span>
                <p className="font-mono font-bold text-emerald-400">{selectedUser.walletBalanceUsdt.toFixed(2)} USDT</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[10px]">Total Settled</span>
                <p className="font-mono font-bold text-white">₹{selectedUser.totalVolumeInr.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Security Audit Details</span>
              <p className="text-slate-300">Registered on: {selectedUser.joinedDate}</p>
              <p className="text-slate-300">Assigned Roles: {selectedUser.roles.join(', ')}</p>
              <p className="text-slate-300 font-mono">User ID: {selectedUser.id}</p>
            </div>

            {/* Admin Balance Override Section */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Wallet Ledger Correction</span>
                <button
                  type="button"
                  onClick={() => setIsAdjustingBalance(!isAdjustingBalance)}
                  className="text-indigo-400 text-[11px] font-bold hover:underline"
                >
                  {isAdjustingBalance ? 'Cancel' : 'Adjust Balance'}
                </button>
              </div>

              {isAdjustingBalance && (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="USDT (+ or -)"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Reason (e.g. Refund)"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const delta = parseFloat(adjustAmount)
                      if (!delta || isNaN(delta)) {
                        showToast('Please enter a valid amount')
                        return
                      }
                      adjustUserBalance(selectedUser.id, delta, adjustReason || 'Administrative Ledger Correction')
                      showToast(`Adjusted ${delta >= 0 ? '+' : ''}${delta} USDT for ${selectedUser.displayName}`)
                      setIsAdjustingBalance(false)
                      setAdjustAmount('')
                      setAdjustReason('')
                      setSelectedUser((prev) => prev ? { ...prev, walletBalanceUsdt: Math.max(0, prev.walletBalanceUsdt + delta) } : null)
                    }}
                    className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                  >
                    Execute Balance Correction
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  showToast(`Password reset link and 2FA challenge dispatched to ${selectedUser.email}`)
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 font-bold text-xs"
              >
                Reset Password / 2FA
              </button>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

