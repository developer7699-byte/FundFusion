import { useState } from 'react'
import {
  Sliders,
  DollarSign,
  Percent,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Save,
  RefreshCw,
  Building2,
  CheckCircle2,
} from 'lucide-react'
import { useAdminStore } from '@/lib/admin-store'
import { ToastNotification } from '@/components/ui/ToastNotification'
import { cn } from '@/lib/utils'

export function AdminSettings() {
  const { settings, updateSettings, addAuditLog } = useAdminStore()
  const [formData, setFormData] = useState({
    baseUsdtRate: settings.baseUsdtRate,
    platformFeePercent: settings.platformFeePercent,
    merchantBaseTier: settings.merchantBaseTier,
    minTradeLimit: settings.minTradeLimit,
    maxTradeLimit: settings.maxTradeLimit,
    isMaintenanceMode: settings.isMaintenanceMode,
    isEscrowFrozen: settings.isEscrowFrozen,
  })
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setTimeout(() => {
      updateSettings(formData)
      setIsSaving(false)
      showToast('Platform parameters successfully updated & applied live!')
    }, 400)
  }

  const toggleEmergencyFreeze = () => {
    const nextVal = !formData.isEscrowFrozen
    setFormData((prev) => ({ ...prev, isEscrowFrozen: nextVal }))
    updateSettings({ isEscrowFrozen: nextVal })
    addAuditLog(
      nextVal ? 'ESCROW_SYSTEM_FROZEN' : 'ESCROW_SYSTEM_RESUMED',
      'SMART_CONTRACT',
      `Admin ${nextVal ? 'ENGAGED EMERGENCY FREEZE' : 'lifted freeze'} on P2P smart escrow contracts.`
    )
    showToast(nextVal ? 'EMERGENCY: Escrow matching is now FROZEN!' : 'Escrow contract operations resumed.')
  }

  const toggleMaintenance = () => {
    const nextVal = !formData.isMaintenanceMode
    setFormData((prev) => ({ ...prev, isMaintenanceMode: nextVal }))
    updateSettings({ isMaintenanceMode: nextVal })
    addAuditLog(
      nextVal ? 'MAINTENANCE_MODE_ENABLED' : 'MAINTENANCE_MODE_DISABLED',
      'PLATFORM',
      `Admin toggled platform maintenance mode to ${nextVal}`
    )
    showToast(nextVal ? 'Maintenance mode enabled for portal' : 'Maintenance mode disabled.')
  }

  return (
    <div className="space-y-6">
      {toastMessage && (
        <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-nx-text">
          Platform Configuration & Risk Controls
        </h1>
        <p className="mt-1 text-sm text-nx-muted">
          Adjust live USDT reference rates, fee distribution schedules, ticket limits, and emergency killswitches.
        </p>
      </div>

      {/* Emergency Killswitches Banner */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={cn(
          'rounded-2xl border p-5 transition-colors',
          formData.isEscrowFrozen
            ? 'border-rose-500 bg-rose-500/10'
            : 'border-nx-border bg-nx-surface'
        )}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-nx-text">Escrow Engine Killswitch</h3>
                <p className="text-xs text-nx-muted mt-0.5">
                  Immediately halts all new P2P trade matching and locks smart contract escrow deposits.
                </p>
                <span className={cn(
                  'mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  formData.isEscrowFrozen
                    ? 'bg-rose-500 text-white'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                )}>
                  Status: {formData.isEscrowFrozen ? 'FROZEN (HALTED)' : 'NORMAL (ACTIVE)'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleEmergencyFreeze}
              className={cn(
                'rounded-xl px-4 py-2 text-xs font-bold transition-colors shadow-sm',
                formData.isEscrowFrozen
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-rose-600 text-white hover:bg-rose-500'
              )}
            >
              {formData.isEscrowFrozen ? 'Lift Freeze' : 'Emergency Freeze'}
            </button>
          </div>
        </div>

        <div className={cn(
          'rounded-2xl border p-5 transition-colors',
          formData.isMaintenanceMode
            ? 'border-amber-500 bg-amber-500/10'
            : 'border-nx-border bg-nx-surface'
        )}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-nx-text">Platform Maintenance Mode</h3>
                <p className="text-xs text-nx-muted mt-0.5">
                  Displays a maintenance notice banner across customer and merchant frontends.
                </p>
                <span className={cn(
                  'mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  formData.isMaintenanceMode
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                )}>
                  Status: {formData.isMaintenanceMode ? 'MAINTENANCE ACTIVE' : 'LIVE'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleMaintenance}
              className={cn(
                'rounded-xl px-4 py-2 text-xs font-bold transition-colors shadow-sm',
                formData.isMaintenanceMode
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-amber-600 text-white hover:bg-amber-500'
              )}
            >
              {formData.isMaintenanceMode ? 'Disable Notice' : 'Enable Maintenance'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="rounded-2xl border border-nx-border bg-nx-surface p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-nx-text">Exchange & Rate Parameters</h2>
          <p className="text-xs text-nx-muted mt-0.5">Global baseline pricing applied to all order matching calculations</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Base USDT Rate */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-nx-muted">
              Base Reference USDT/INR Rate
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-nx-muted">₹</span>
              <input
                type="number"
                step="0.05"
                min="50"
                max="150"
                value={formData.baseUsdtRate}
                onChange={(e) => setFormData({ ...formData, baseUsdtRate: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-nx-border bg-nx-base pl-9 pr-4 py-2.5 text-sm font-semibold text-nx-text focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-nx-muted">Used as default benchmark for OTC desk rate matching.</p>
          </div>

          {/* Platform Fee % */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-nx-muted">
              Platform Trading Fee (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.05"
                min="0"
                max="5"
                value={formData.platformFeePercent}
                onChange={(e) => setFormData({ ...formData, platformFeePercent: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-nx-border bg-nx-base px-4 py-2.5 text-sm font-semibold text-nx-text focus:border-emerald-500 focus:outline-none"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-nx-muted">%</span>
            </div>
            <p className="text-[11px] text-nx-muted">Retained automatically into Platform Treasury Vault.</p>
          </div>

          {/* Merchant Base Commission */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-nx-muted">
              Default Merchant Rebate (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="5"
                value={formData.merchantBaseTier}
                onChange={(e) => setFormData({ ...formData, merchantBaseTier: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-nx-border bg-nx-base px-4 py-2.5 text-sm font-semibold text-nx-text focus:border-emerald-500 focus:outline-none"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-nx-muted">%</span>
            </div>
            <p className="text-[11px] text-nx-muted">Base rebate awarded to newly onboarded OTC desks.</p>
          </div>

          {/* Min Trade Limit */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-nx-muted">
              Min Trade Ticket (INR)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-nx-muted">₹</span>
              <input
                type="number"
                step="100"
                min="100"
                value={formData.minTradeLimit}
                onChange={(e) => setFormData({ ...formData, minTradeLimit: parseInt(e.target.value) || 0 })}
                className="w-full rounded-xl border border-nx-border bg-nx-base pl-9 pr-4 py-2.5 text-sm font-semibold text-nx-text focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-nx-muted">Minimum allowable single trade limit on the order book.</p>
          </div>

          {/* Max Trade Limit */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-nx-muted">
              Max Trade Ticket (INR)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-nx-muted">₹</span>
              <input
                type="number"
                step="10000"
                min="10000"
                value={formData.maxTradeLimit}
                onChange={(e) => setFormData({ ...formData, maxTradeLimit: parseInt(e.target.value) || 0 })}
                className="w-full rounded-xl border border-nx-border bg-nx-base pl-9 pr-4 py-2.5 text-sm font-semibold text-nx-text focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-nx-muted">Requires Level 2 Aadhaar/PAN KYC for orders above ₹1,00,000.</p>
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-nx-border">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Applying Changes...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  )
}

