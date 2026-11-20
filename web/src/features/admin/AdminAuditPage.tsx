import { useState, useMemo } from 'react'
import {
  ShieldCheck,
  Search,
  Download,
  Filter,
  Clock,
  User,
  Activity,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lock,
} from 'lucide-react'
import { useAdminStore, type AdminAuditLog } from '@/lib/admin-store'
import { ToastNotification } from '@/components/ui/ToastNotification'
import { cn } from '@/lib/utils'

export function AdminAudit() {
  const { auditLogs } = useAdminStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAction, setFilterAction] = useState<string>('ALL')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (filterAction !== 'ALL') {
        if (filterAction === 'DISPUTES' && !log.action.includes('DISPUTE')) return false
        if (filterAction === 'USERS' && !log.action.includes('USER') && !log.action.includes('KYC')) return false
        if (filterAction === 'MERCHANTS' && !log.action.includes('MERCHANT')) return false
        if (filterAction === 'SETTLEMENTS' && !log.action.includes('SETTLEMENT')) return false
        if (filterAction === 'SETTINGS' && !log.action.includes('SETTINGS') && !log.action.includes('CONFIG')) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          log.actor.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.entity.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q) ||
          log.ipAddress.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [auditLogs, filterAction, searchQuery])

  const exportCsv = () => {
    const headers = ['ID', 'Timestamp', 'Actor', 'Action', 'Entity', 'Details', 'IP Address']
    const rows = filteredLogs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.actor}"`,
      l.action,
      `"${l.entity}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      l.ipAddress,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `fundfusion_audit_trail_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast(`Exported ${filteredLogs.length} audit trail records to CSV`)
  }

  const getActionColor = (action: string) => {
    if (action.includes('SUSPEND') || action.includes('REJECT') || action.includes('FROZEN')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    }
    if (action.includes('APPROV') || action.includes('VERIF') || action.includes('RELEASE') || action.includes('RESOLVED')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    }
    if (action.includes('DISPUTE')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    }
    if (action.includes('SETTINGS') || action.includes('TIER')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    }
    return 'bg-sky-500/10 text-sky-400 border-sky-500/20'
  }

  return (
    <div className="space-y-6">
      {toastMessage && (
        <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-nx-text">
            Security Audit Trail & Activity Logs
          </h1>
          <p className="mt-1 text-sm text-nx-muted">
            Immutable chronological record of all administrative rulings, KYC approvals, and system state transitions.
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-nx-surface border border-nx-border px-4 py-2.5 text-sm font-semibold text-nx-text shadow-sm hover:bg-nx-border/50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export Audit CSV
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {['ALL', 'DISPUTES', 'USERS', 'MERCHANTS', 'SETTLEMENTS', 'SETTINGS'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterAction(cat)}
              className={cn(
                'rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors',
                filterAction === cat
                  ? 'bg-emerald-600 text-white'
                  : 'bg-nx-surface text-nx-muted border border-nx-border hover:text-nx-text'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-nx-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search actor, action, IP..."
            className="w-full rounded-xl border border-nx-border bg-nx-surface pl-10 pr-4 py-2 text-sm text-nx-text placeholder:text-nx-muted focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Audit Log Stream */}
      <div className="rounded-2xl border border-nx-border bg-nx-surface overflow-hidden">
        <div className="border-b border-nx-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-nx-text">Real-Time Operational Log</h2>
          </div>
          <span className="text-xs text-nx-muted">
            Showing {filteredLogs.length} events
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-nx-muted">
            <FileText className="mx-auto h-8 w-8 opacity-40 mb-2" />
            <p className="text-sm">No audit logs found matching your filter criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-nx-border">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-5 transition-colors hover:bg-nx-border/20">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold border', getActionColor(log.action))}>
                        {log.action}
                      </span>
                      <span className="text-xs font-semibold text-nx-text">
                        Entity: <span className="font-mono text-emerald-400">{log.entity}</span>
                      </span>
                      <span className="text-xs text-nx-muted">by {log.actor}</span>
                    </div>
                    <p className="text-sm text-nx-text leading-relaxed">{log.details}</p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 text-xs text-nx-muted shrink-0">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {log.timestamp}
                    </span>
                    <span className="font-mono text-[11px] bg-nx-base px-2 py-0.5 rounded border border-nx-border/50">
                      {log.ipAddress}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

