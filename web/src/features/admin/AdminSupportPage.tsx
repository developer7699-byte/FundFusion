import { useState } from 'react'
import {
  Headphones,
  Search,
  MessageSquare,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  X,
  Send,
  ExternalLink,
  Mail,
} from 'lucide-react'
import { useAdminStore, type AdminSupportTicket } from '@/lib/admin-store'
import { ToastNotification } from '@/components/ui/ToastNotification'
import { cn } from '@/lib/utils'

export function AdminSupport() {
  const { supportTickets, updateSupportTicket, addAuditLog } = useAdminStore()
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const filteredTickets = supportTickets.filter((t) => {
    if (filter !== 'ALL' && t.status !== filter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        t.user.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      )
    }
    return true
  })

  const handleSendReply = () => {
    if (!selectedTicket || !replyMessage.trim()) return
    updateSupportTicket(selectedTicket.id, 'IN_PROGRESS', replyMessage.trim())
    showToast(`Reply sent to ${selectedTicket.user} (${selectedTicket.email})`)
    setReplyMessage('')
    setSelectedTicket((prev) =>
      prev ? { ...prev, status: 'IN_PROGRESS', lastMessage: `Admin: ${replyMessage.trim()}` } : null
    )
  }

  const handleStatusChange = (status: AdminSupportTicket['status']) => {
    if (!selectedTicket) return
    updateSupportTicket(selectedTicket.id, status)
    setSelectedTicket((prev) => (prev ? { ...prev, status } : null))
    showToast(`Ticket ${selectedTicket.id} status changed to ${status}`)
  }

  const openCount = supportTickets.filter((t) => t.status === 'OPEN').length
  const inProgressCount = supportTickets.filter((t) => t.status === 'IN_PROGRESS').length
  const resolvedCount = supportTickets.filter((t) => t.status === 'RESOLVED').length

  return (
    <div className="space-y-6">
      {toastMessage && (
        <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-nx-text">
          Customer & Desk Support Queue
        </h1>
        <p className="mt-1 text-sm text-nx-muted">
          Manage inbound trader inquiries, KYC appeals, dispute escalations, and technical tickets.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-nx-border bg-nx-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-nx-muted">Open Tickets</p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-rose-400">{openCount}</p>
            <span className="text-xs text-rose-400">Needs Response</span>
          </div>
        </div>

        <div className="rounded-2xl border border-nx-border bg-nx-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-nx-muted">In Progress</p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-sky-400">{inProgressCount}</p>
            <span className="text-xs text-sky-400">Under Review</span>
          </div>
        </div>

        <div className="rounded-2xl border border-nx-border bg-nx-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-nx-muted">Resolved</p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-emerald-400">{resolvedCount}</p>
            <span className="text-xs text-emerald-400">Closed Tickets</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                'rounded-xl px-4 py-2 text-xs font-semibold transition-colors',
                filter === tab
                  ? 'bg-emerald-600 text-white'
                  : 'bg-nx-surface text-nx-muted border border-nx-border hover:text-nx-text'
              )}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-nx-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ticket, email, user..."
            className="w-full rounded-xl border border-nx-border bg-nx-surface pl-10 pr-4 py-2 text-sm text-nx-text placeholder:text-nx-muted focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Support Tickets Table */}
      <div className="rounded-2xl border border-nx-border bg-nx-surface overflow-hidden">
        <div className="border-b border-nx-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-nx-text">Inbound Tickets</h2>
          <span className="text-xs text-nx-muted">{filteredTickets.length} tickets found</span>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-nx-muted">
            <Headphones className="mx-auto h-8 w-8 opacity-40 mb-2" />
            <p className="text-sm">No support tickets found matching criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-nx-border">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="p-5 transition-colors hover:bg-nx-border/20 cursor-pointer"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400">{ticket.id}</span>
                      <span className="font-semibold text-nx-text text-sm">{ticket.subject}</span>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-semibold',
                        ticket.priority === 'URGENT'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      )}>
                        {ticket.priority}
                      </span>
                      <span className="rounded-full bg-nx-base px-2 py-0.5 text-xs text-nx-muted border border-nx-border">
                        {ticket.category}
                      </span>
                    </div>
                    <p className="text-xs text-nx-muted">
                      From: <span className="font-medium text-nx-text">{ticket.user}</span> ({ticket.email})
                    </p>
                    <p className="text-sm text-nx-muted line-clamp-1 italic">
                      "{ticket.lastMessage}"
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <span className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-semibold border',
                      ticket.status === 'OPEN' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      ticket.status === 'IN_PROGRESS' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    )}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-nx-muted flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {ticket.createdAt}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Reply Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-nx-border bg-nx-surface p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-400">{selectedTicket.id}</span>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-semibold border',
                    selectedTicket.status === 'OPEN' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    selectedTicket.status === 'IN_PROGRESS' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  )}>
                    {selectedTicket.status.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-nx-text mt-1">{selectedTicket.subject}</h3>
                <p className="text-xs text-nx-muted">
                  Requester: <span className="text-nx-text font-medium">{selectedTicket.user}</span> ({selectedTicket.email})
                </p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-lg p-1.5 text-nx-muted hover:bg-nx-border/50 hover:text-nx-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-nx-border bg-nx-base p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-nx-muted">Last Message</p>
              <p className="text-sm text-nx-text leading-relaxed">{selectedTicket.lastMessage}</p>
            </div>

            {/* Quick Status Update */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-nx-muted">Set Status</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusChange('OPEN')}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                    selectedTicket.status === 'OPEN'
                      ? 'bg-rose-600 text-white'
                      : 'border border-nx-border text-nx-muted hover:text-nx-text'
                  )}
                >
                  Open
                </button>
                <button
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                    selectedTicket.status === 'IN_PROGRESS'
                      ? 'bg-sky-600 text-white'
                      : 'border border-nx-border text-nx-muted hover:text-nx-text'
                  )}
                >
                  In Progress
                </button>
                <button
                  onClick={() => handleStatusChange('RESOLVED')}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                    selectedTicket.status === 'RESOLVED'
                      ? 'bg-emerald-600 text-white'
                      : 'border border-nx-border text-nx-muted hover:text-nx-text'
                  )}
                >
                  Resolved
                </button>
              </div>
            </div>

            {/* Reply Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-nx-muted">
                Admin Response to User
              </label>
              <textarea
                rows={3}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type official support desk response..."
                className="w-full rounded-xl border border-nx-border bg-nx-base p-3 text-sm text-nx-text placeholder:text-nx-muted focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-xl border border-nx-border px-4 py-2 text-xs font-semibold text-nx-muted hover:text-nx-text"
              >
                Close
              </button>
              <button
                onClick={handleSendReply}
                disabled={!replyMessage.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Send Reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

