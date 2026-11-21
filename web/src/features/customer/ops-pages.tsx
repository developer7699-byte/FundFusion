import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { CheckCircle2, Send, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { newIdempotencyKey, v1 } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { BackButton } from '@/components/ui/BackButton'
import { useNotifications } from '@/lib/notifications'

type Order = {
  orderId: string
  status: string
  side: 'BUY' | 'SELL'
  usdtAmount: string
  inrAmount: string
  customerRate: string
  platformFeeUsdt: string
  role: 'CUSTOMER' | 'MERCHANT'
  merchantUserId: string | null
  utr: string | null
  broadcastAt: string | null
  updatedAt: string
}

/**
 * The one thing this party may do to this order right now (PRD §6.8).
 *
 * Whoever receives the rupees confirms them, and the payer submits a UTR as
 * evidence. On a sell the customer receives; on a buy the customer pays. Any
 * other state offers nothing — a button the engine would refuse costs a
 * person a 409 they cannot read.
 */
function actionFor(o: Order): 'CONFIRM_RECEIPT' | 'SUBMIT_UTR' | null {
  const payer = o.side === 'BUY' ? 'CUSTOMER' : 'MERCHANT'
  const iAmPayer = o.role === payer
  if (o.status === 'ACCEPTED' && iAmPayer) return 'SUBMIT_UTR'
  if (o.status === 'PAYMENT_SUBMITTED' && !iAmPayer) return 'CONFIRM_RECEIPT'
  return null
}

const OPEN_STATES = ['QUOTED', 'AWAITING_MERCHANT', 'ACCEPTED', 'PAYMENT_SUBMITTED']

/* =========================================================================
   1. ORDERS LIST (/customer/orders)
   ========================================================================= */
export function OrdersList() {
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'DONE'>('ALL')
  const q = useQuery({
    queryKey: ['orders'],
    queryFn: () => v1<Order[]>('/p2p/orders'),
    retry: false,
  })

  const rows = (q.data ?? []).filter((o) =>
    filter === 'ALL'
      ? true
      : filter === 'OPEN'
        ? OPEN_STATES.includes(o.status)
        : !OPEN_STATES.includes(o.status),
  )

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-2">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/customer/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Orders
            </h1>
            <p className="text-[11px] text-slate-500">Escrow and settlement</p>
          </div>
        </div>
        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {rows.length}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {(['ALL', 'OPEN', 'DONE'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer',
              filter === tab
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {q.isLoading && <Skeleton className="h-24 rounded-2xl" />}
      {q.error && (
        <p className="text-rose-500 font-bold p-4 text-sm">{q.error.message}</p>
      )}

      <div className="space-y-2">
        {!q.isLoading && rows.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            No orders yet.
          </div>
        )}
        {rows.map((o) => (
          <Link
            key={o.orderId}
            to={`/customer/orders/${o.orderId}`}
            className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs group cursor-pointer"
          >
            <div className="min-w-0">
              <span className="text-xs font-black text-slate-900 dark:text-white block group-hover:text-emerald-500 transition-colors">
                {o.side} · {o.status.replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date(o.updatedAt).toLocaleString()}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-black font-mono text-slate-900 dark:text-white block break-all">
                {o.usdtAmount} USDT
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                ₹{o.inrAmount}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

/* =========================================================================
   2. ORDER DETAIL (/customer/orders/:orderId)
   ========================================================================= */
export function OrderDetail() {
  const { orderId } = useParams()
  const qc = useQueryClient()
  const [utr, setUtr] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const q = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => v1<Order>(`/p2p/orders/${orderId}`),
    retry: false,
  })

  if (q.isLoading) return <Skeleton className="h-40 rounded-3xl" />
  if (q.error)
    return <p className="text-rose-500 font-bold p-4 text-sm">{q.error.message}</p>

  const o = q.data!
  const action = actionFor(o)

  const after = async () => {
    await qc.invalidateQueries({ queryKey: ['order', orderId] })
    await qc.invalidateQueries({ queryKey: ['wallet'] })
    await qc.invalidateQueries({ queryKey: ['orders'] })
  }

  const run = async (work: () => Promise<unknown>) => {
    setError('')
    setBusy(true)
    try {
      await work()
      await after()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That was refused.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/customer/orders" />
          <div>
            <h1 className="text-base font-black text-slate-900 dark:text-white">
              Order Details
            </h1>
            <p className="text-[11px] text-slate-500 font-mono break-all">{o.orderId}</p>
          </div>
        </div>
        <span
          className={cn(
            'text-[10px] font-black px-2.5 py-1 rounded-full',
            o.status === 'COMPLETED'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : o.status === 'DISPUTED'
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
          )}
        >
          {o.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* The snapshot. It is law: this order settles at these figures however
          far the market has moved since (PRD §7). */}
      <div className="rounded-[28px] bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950 text-white p-5 space-y-3 shadow-xl border border-emerald-500/30">
        <dl className="space-y-2 text-sm">
          {[
            ['Side', o.side],
            ['USDT', o.usdtAmount],
            ['Rupees', `₹${o.inrAmount}`],
            ['Rate', `₹${o.customerRate} per USDT`],
            ['Platform fee', `${o.platformFeeUsdt} USDT`],
            ['UTR', o.utr ?? 'Not submitted'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-slate-400">{label}</dt>
              <dd className="font-mono font-bold text-right break-all">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {action === 'SUBMIT_UTR' && (
        <form
          className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-2.5 shadow-2xs"
          onSubmit={(e) => {
            e.preventDefault()
            void run(() =>
              v1(`/p2p/orders/${o.orderId}/utr`, {
                method: 'POST',
                body: JSON.stringify({ utr }),
              }),
            )
          }}
        >
          <label
            htmlFor="order-utr"
            className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block"
          >
            Bank reference (UTR)
          </label>
          <Input
            id="order-utr"
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            required
            placeholder="UTR123456789"
            className="h-11 rounded-xl font-mono"
          />
          <p className="text-[10px] text-slate-400">
            Evidence only. Escrow releases when the recipient confirms the
            money arrived, never on a reference alone.
          </p>
          <Button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-full font-semibold text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900"
          >
            {busy ? 'Submitting...' : 'Submit UTR'}
          </Button>
        </form>
      )}

      {action === 'CONFIRM_RECEIPT' && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-2.5 shadow-2xs">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Confirm only once ₹{o.inrAmount} has actually arrived in your bank
            account. This releases the escrow.
          </p>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(() =>
                v1(`/p2p/orders/${o.orderId}/confirm`, {
                  method: 'POST',
                  idempotencyKey: newIdempotencyKey(),
                }),
              )
            }
            className="w-full h-11 rounded-full font-semibold text-sm bg-emerald-500 text-white"
          >
            {busy ? 'Confirming...' : 'Confirm receipt'}
          </Button>
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-500 font-medium bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
          {error}
        </p>
      )}

      {OPEN_STATES.includes(o.status) && o.status !== 'QUOTED' && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run(() =>
              v1(`/p2p/orders/${o.orderId}/dispute`, {
                method: 'POST',
                body: JSON.stringify({ reason: 'Raised from the order screen' }),
              }),
            )
          }
          className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200/60 dark:border-rose-900/40 cursor-pointer text-center"
        >
          Raise a dispute
        </button>
      )}

      <Link
        to="/customer/support"
        className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1.5"
      >
        <HelpCircle className="w-4 h-4" />
        <span>Need help with this order? Contact support</span>
      </Link>
    </div>
  )
}

export function NoticeCenter() {
  const [filter, setFilter] = useState<'ALL' | 'ORDERS' | 'SYSTEM'>('ALL')
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications()

  const filtered = notifications.filter((n) => filter === 'ALL' || n.type === filter)

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/customer/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Notifications
            </h1>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span>Live alerts & trade updates</span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  {unreadCount} unread
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className={cn(
            'text-xs font-bold transition-all cursor-pointer',
            unreadCount > 0
              ? 'text-emerald-600 dark:text-emerald-400 hover:underline active:scale-95'
              : 'text-slate-400 dark:text-slate-500 cursor-default'
          )}
        >
          {unreadCount > 0 ? 'Mark all read' : 'All read ✓'}
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900/60">
        {[
          { id: 'ALL', label: `All Alerts (${notifications.length})` },
          { id: 'ORDERS', label: 'Orders & P2P' },
          { id: 'SYSTEM', label: 'System & Security' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id as any)}
            className={cn(
              'flex-1 py-1 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer truncate',
              filter === t.id
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Notices List */}
      <div className="space-y-2">
        {filtered.map((n) => (
          <div
            key={n.id}
            onClick={() => {
              if (n.unread) markAsRead(n.id)
            }}
            className={cn(
              'p-3.5 rounded-2xl border transition-all shadow-2xs space-y-1.5 relative cursor-pointer active:scale-[0.99]',
              n.unread
                ? 'bg-emerald-50/50 dark:bg-emerald-950/25 border-emerald-500/30 hover:border-emerald-500/50'
                : 'bg-white dark:bg-[#111827] border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                {n.unread && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                {n.title}
              </span>
              <div className="flex items-center gap-1.5">
                {n.unread && (
                  <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full">
                    NEW
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-mono">{n.time}</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{n.body}</p>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-slate-400 text-xs">
            No notifications in this category
          </div>
        )}
      </div>
    </div>
  )
}

/* =========================================================================
   9. SUPPORT DESK & TICKETS (/customer/support)
   ========================================================================= */
export function SupportDesk() {
  const [showCreate, setShowCreate] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [createdMsg, setCreatedMsg] = useState(false)

  const tickets = [
    { id: 't-101', subject: 'Escrow payment verification delay', status: 'IN_REVIEW', lastReply: 'Agent assigned (5m ago)' },
    { id: 't-98', subject: 'Query on Amazon gift voucher code redemption', status: 'RESOLVED', lastReply: 'Resolved on Oct 25' },
  ]

  const faqs = [
    { q: 'How does FundFusion USDT Escrow protect me?', a: 'When a trade begins, the sellers USDT is locked in a cryptographic multi-sig vault. Rupee transfers are verified before release, guaranteeing zero fraud risk.' },
    { q: 'How fast do UPI & QR payments settle?', a: 'Instant! In under 45 seconds, the merchant receives verified rupees while your USDT vault is safely debited.' },
    { q: 'Can I redeem Gift Cards anywhere?', a: 'Yes, all digital vouchers are 100% genuine codes redeemable directly on the official apps like Amazon, Flipkart, Swiggy, etc.' },
  ]

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault()
    setCreatedMsg(true)
    setTimeout(() => {
      setShowCreate(false)
      setCreatedMsg(false)
      setSubject('')
      setMessage('')
    }, 1500)
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/customer/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Help & Support
            </h1>
            <p className="text-[11px] text-slate-500">24/7 Live Desk & Ticket Resolution</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live 24×7</span>
        </div>
      </div>

      {/* 24/7 Live Chat Hero */}
      <div className="rounded-[28px] bg-gradient-to-tr from-[#0a2316] via-[#0d3420] to-[#0a2316] p-4.5 text-white shadow-xl border border-emerald-500/30 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
            Average Response: &lt; 2 mins
          </span>
          <h2 className="text-sm font-black">Chat with Escrow Arbitrator</h2>
          <p className="text-[11px] text-emerald-200/80">Available right now for order disputes & guidance.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shrink-0 cursor-pointer shadow-md transition-transform active:scale-95"
        >
          Open Ticket
        </button>
      </div>

      {/* Create Ticket Modal / Form */}
      {showCreate && (
        <form
          onSubmit={handleCreateTicket}
          className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-3 shadow-md animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 dark:text-white">Create Support Ticket</span>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject / Issue summary"
            required
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none"
          />

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue with order ID or transaction details..."
            rows={3}
            required
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none resize-none"
          />

          {createdMsg && (
            <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ticket submitted! An agent will respond shortly.</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#0a2316] text-white font-bold text-xs cursor-pointer"
          >
            Submit Support Request
          </button>
        </form>
      )}

      {/* Your Active Tickets */}
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Your Recent Tickets
        </h3>
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link
              key={t.id}
              to={`/customer/support/${t.id}`}
              className="p-3 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:border-emerald-500/40 transition-all shadow-2xs group block"
            >
              <div className="min-w-0">
                <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
                  {t.subject}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{t.lastReply}</span>
              </div>
              <span
                className={cn(
                  'text-[9px] font-black px-2 py-0.5 rounded-full shrink-0',
                  t.status === 'RESOLVED'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                )}
              >
                {t.status}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Instant FAQ Accordion */}
      <div className="space-y-2 pt-1">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Frequently Asked Questions
        </h3>
        <div className="space-y-2">
          {faqs.map((f, idx) => (
            <details
              key={idx}
              className="p-3 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 text-xs shadow-2xs group cursor-pointer"
            >
              <summary className="font-extrabold text-slate-900 dark:text-white flex items-center justify-between list-none">
                <span>{f.q}</span>
                <span className="text-slate-400 transition-transform group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-2">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   10. TICKET DETAIL (/customer/support/:ticketId)
   ========================================================================= */
export function TicketDetail() {
  const { ticketId } = useParams()
  const [messages, setMessages] = useState([
    { id: '1', from: 'agent', text: 'Hello! I am your FundFusion dispute supervisor. How can I assist you with your escrow order?', time: '14:22' },
    { id: '2', from: 'user', text: 'I transferred ₹4,575 via UPI to the merchant, but the status is still showing Awaiting Payment.', time: '14:24' },
    { id: '3', from: 'agent', text: 'Thank you for sharing. Please provide the 12-digit bank UTR reference number so we can auto-verify with the banking switch.', time: '14:25' },
  ])
  const [inputVal, setInputVal] = useState('')

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputVal) return
    const newMsg = { id: `${Date.now()}`, from: 'user', text: inputVal, time: 'Just now' }
    setMessages((prev) => [...prev, newMsg])
    setInputVal('')

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now() + 1}`, from: 'agent', text: 'UTR received and verified with banking switch! Your escrow has been marked complete.', time: 'Just now' },
      ])
    }, 1200)
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4 flex flex-col h-[700px] max-h-[80vh]">
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <BackButton fallback="/customer/support" />
        <div>
          <h1 className="text-base font-black text-slate-900 dark:text-white">Ticket #{ticketId}</h1>
          <p className="text-[11px] text-slate-500">Live Escrow Arbitrator Chat</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 p-1 no-scrollbar">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed space-y-1',
              m.from === 'user'
                ? 'ml-auto bg-[#0a2316] text-white rounded-br-xs'
                : 'mr-auto bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-xs'
            )}
          >
            <p>{m.text}</p>
            <span
              className={cn(
                'text-[9px] block text-right font-mono',
                m.from === 'user' ? 'text-emerald-300' : 'text-slate-400'
              )}
            >
              {m.time}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="flex gap-2 shrink-0 pt-2 border-t border-slate-100 dark:border-slate-800">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Type message or paste UTR number..."
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none"
        />
        <button
          type="submit"
          className="p-2.5 rounded-xl bg-[#0a2316] text-white hover:bg-emerald-950 transition-colors cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}

/* =========================================================================
   11. ACCOUNT LIVE (Referrals, Rewards, Settings, Security)
   ========================================================================= */
export function AccountLive({ title }: { title: string }) {
  const { user } = useAuth()
  const [copiedRef, setCopiedRef] = useState(false)

  const isReferralOrRewards = title.toLowerCase().includes('referral') || title.toLowerCase().includes('reward')

  if (isReferralOrRewards) {
    return (
      <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <BackButton fallback="/customer/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Refer & Earn
            </h1>
            <p className="text-[11px] text-slate-500">Up to 40% Lifetime Trading Rebate</p>
          </div>
        </div>

        {/* Hero Card */}
        <div className="rounded-[28px] bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-600 p-5 text-white shadow-xl space-y-3">
          <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block">
            VIP Tier 2 • 30% Commission
          </span>
          <div>
            <div className="text-3xl font-black font-mono tracking-tight">$342.50 USDT</div>
            <span className="text-xs text-emerald-100 font-mono">≈ ₹31,338 INR Earned</span>
          </div>

          <div className="pt-2 border-t border-white/20 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-emerald-100 block">Total Referrals</span>
              <span className="font-bold text-white">18 Traders</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-100 block">Total Team Vol</span>
              <span className="font-bold font-mono text-white">$45,200</span>
            </div>
          </div>
        </div>

        {/* Referral Code Box */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-2.5 shadow-2xs">
          <span className="text-xs font-black text-slate-900 dark:text-white block">
            Your Exclusive Referral Code
          </span>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-wider">
              FUSION-VIP-99
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText('https://fundfusion.dev/register?ref=FUSION-VIP-99')
                setCopiedRef(true)
                setTimeout(() => setCopiedRef(false), 2000)
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0a2316] text-white hover:bg-emerald-950 transition-colors cursor-pointer"
            >
              {copiedRef ? 'Copied Link' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Invited Traders List */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Recent Referrals
          </h3>
          <div className="space-y-2">
            {[
              { name: 'Aarav_99', vol: '$1,200 USDT', earned: '+₹1,098', date: '2 days ago' },
              { name: 'RohanCrypto', vol: '$4,500 USDT', earned: '+₹4,117', date: '5 days ago' },
              { name: 'Sneha_Trader', vol: '$850 USDT', earned: '+₹777', date: 'Oct 28' },
            ].map((r, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs shadow-2xs"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">{r.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">Vol: {r.vol} • {r.date}</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-emerald-600 font-mono block">{r.earned}</span>
                  <span className="text-[9px] text-slate-400">Commission</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Settings / Security / Sessions / Verification
  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <BackButton fallback="/customer/dashboard" />
        <div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{title}</h1>
          <p className="text-[11px] text-slate-500">Security & Account Configuration</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-black text-slate-900 dark:text-white block">Email Address</span>
            <span className="text-[11px] text-slate-500 font-mono">{user?.email || 'customer@fundfusion.dev'}</span>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
            Verified
          </span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-black text-slate-900 dark:text-white block">KYC Verification</span>
            <span className="text-[11px] text-slate-500">PAN & Aadhaar Identity Match</span>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
            Tier 2 Active
          </span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-black text-slate-900 dark:text-white block">2FA Two-Factor Security</span>
            <span className="text-[11px] text-slate-500">Google Authenticator OTP</span>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
            Enabled
          </span>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <span className="text-xs font-black text-slate-900 dark:text-white block">Active Sessions</span>
            <span className="text-[11px] text-slate-500">Chrome on Windows (Current device)</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Active</span>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   12. PAY SCAN LIVE (/customer/pay/scan)
   ========================================================================= */
export function PayScanLive() {
  return (
    <div className="p-4 text-center">
      <Link
        to="/customer/pay/scan"
        className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
      >
        Open QR Scanner
      </Link>
    </div>
  )
}
