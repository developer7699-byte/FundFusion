import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api, v1 } from '@/lib/api'
import { useAuth } from '@/lib/auth'

/**
 * The admin read surface (PRD §9.2).
 *
 * Read-only by construction, exactly like `AdminReadService` behind it: SUPPORT
 * reaches every one of these and moves no money. The prototype's buttons to
 * complete or refund an order, and to suspend a user, are gone — v1 has no
 * route for any of them, and the one legitimate way to move a stuck order is
 * a dispute resolution, which is an admin screen of its own in M6.
 */
function useAdmin<T>(key: string, path: string) {
  return useQuery({
    queryKey: ['admin', key],
    queryFn: () => v1<T>(path),
    retry: false,
  })
}

function Panel({
  title,
  query,
  children,
}: {
  title: string
  query: { isLoading: boolean; error: Error | null }
  children: React.ReactNode
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {query.isLoading && <Skeleton className="mt-4 h-24 rounded-xl" />}
      {query.error && (
        <p className="mt-4 text-sm font-bold text-rose-500">{query.error.message}</p>
      )}
      {children}
    </div>
  )
}

interface Overview {
  ordersByStatus: Record<string, number>
  escrowLockedUsdt: string
  bondedUsdt: string
  revenueUsdt: string
  openDisputes: number
}

export function AdminHome() {
  const q = useAdmin<Overview>('overview', '/admin/overview')
  const d = q.data

  return (
    <Panel title="Admin" query={q}>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {[
          ['Escrow locked', d ? `${d.escrowLockedUsdt} USDT` : '—'],
          ['Bonded', d ? `${d.bondedUsdt} USDT` : '—'],
          ['Revenue', d ? `${d.revenueUsdt} USDT` : '—'],
          ['Open disputes', d ? String(d.openDisputes) : '—'],
        ].map(([k, v]) => (
          <Card key={k}>
            <p className="text-xs text-nx-muted">{k}</p>
            <p className="break-all font-mono text-lg">{v}</p>
          </Card>
        ))}
      </div>

      <h2 className="mt-6 text-sm font-semibold">Orders by status</h2>
      <div className="mt-2 grid gap-2 md:grid-cols-4">
        {Object.entries(d?.ordersByStatus ?? {}).map(([status, n]) => (
          <Card key={status} className="text-sm">
            <p className="text-xs text-nx-muted">{status.replace(/_/g, ' ')}</p>
            <p className="text-xl">{n}</p>
          </Card>
        ))}
      </div>
    </Panel>
  )
}

interface AdminUser {
  id: string
  email: string
  displayName: string
  status: string
  emailVerifiedAt: string | null
  mfaEnrolledAt: string | null
}

export function AdminUsers() {
  const q = useAdmin<AdminUser[]>('users', '/admin/users')
  return (
    <Panel title="Users" query={q}>
      {(q.data ?? []).map((u) => (
        <Card key={u.id} className="mt-2 flex items-center justify-between text-sm">
          <Link to={`/admin/users/${u.id}`} className="hover:underline">
            {u.displayName} · {u.email} · {u.status}
          </Link>
          <span className="text-xs text-nx-muted">
            {u.mfaEnrolledAt ? 'authenticator enrolled' : 'no authenticator'}
          </span>
        </Card>
      ))}
    </Panel>
  )
}

interface AdminOrder {
  orderId: string
  status: string
  side: string
  usdtAmount: string
  inrAmount: string
  customerRate: string
  customerId: string
  merchantUserId: string | null
  createdAt: string
}

export function AdminOrders() {
  const q = useAdmin<AdminOrder[]>('orders', '/admin/orders')
  return (
    <Panel title="Orders" query={q}>
      {(q.data ?? []).map((o) => (
        <Card key={o.orderId} className="mt-2 text-sm">
          <Link to={`/admin/orders/${o.orderId}`} className="hover:underline">
            {o.side} · {o.status.replace(/_/g, ' ')}
          </Link>
          <p className="break-all font-mono text-xs text-nx-muted">
            {o.usdtAmount} USDT · ₹{o.inrAmount} at ₹{o.customerRate}
          </p>
        </Card>
      ))}
    </Panel>
  )
}

/**
 * v1 has no admin route for one order — `GET /v1/p2p/orders/:id` is scoped to
 * the parties, because an order id is not a capability (PRD §13.5). The row
 * from the admin list is what an admin may see.
 */
export function AdminOrderDetail() {
  const { orderId } = useParams()
  const q = useAdmin<AdminOrder[]>('orders', '/admin/orders')
  const o = q.data?.find((r) => r.orderId === orderId)

  return (
    <Panel title="Order" query={q}>
      {!q.isLoading && !o && (
        <p className="mt-4 text-sm text-nx-muted">No order with that id.</p>
      )}
      {o && (
        <Card className="mt-4 space-y-1 text-sm">
          <p className="break-all font-mono text-xs">{o.orderId}</p>
          <p>
            {o.side} · {o.status.replace(/_/g, ' ')}
          </p>
          <p className="break-all font-mono text-xs">
            {o.usdtAmount} USDT · ₹{o.inrAmount} at ₹{o.customerRate}
          </p>
          <p className="break-all font-mono text-xs text-nx-muted">
            customer {o.customerId} · merchant {o.merchantUserId ?? 'unassigned'}
          </p>
          <p className="pt-2 text-xs text-nx-muted">
            Moving a stuck order is a dispute resolution, not an edit.
          </p>
        </Card>
      )}
    </Panel>
  )
}

interface LedgerRow {
  id: string
  accountType: string
  direction: string
  amount: string
  assetSymbol: string
  memo: string
  at: string
}

export function AdminLedger() {
  const q = useAdmin<LedgerRow[]>('ledger', '/admin/ledger')
  return (
    <Panel title="Ledger" query={q}>
      {(q.data ?? []).map((r) => (
        <Card key={r.id} className="mt-2 text-sm">
          <p>
            {r.direction} {r.accountType}
          </p>
          <p className="break-all font-mono text-xs">
            {r.amount} {r.assetSymbol} · {r.memo}
          </p>
          <p className="text-xs text-nx-muted">{new Date(r.at).toLocaleString()}</p>
        </Card>
      ))}
    </Panel>
  )
}

interface AuditRow {
  id: string
  action: string
  entity: string
  reason: string | null
  createdAt: string
}

export function AdminAudit() {
  const q = useAdmin<AuditRow[]>('audit', '/admin/audit')
  return (
    <Panel title="Audit log" query={q}>
      {(q.data ?? []).map((a) => (
        <Card key={a.id} className="mt-2 text-sm">
          <p>
            {a.action} · {a.entity}
          </p>
          <p className="text-xs text-nx-muted">{a.reason ?? 'no reason recorded'}</p>
        </Card>
      ))}
    </Panel>
  )
}

interface DisputeRow {
  id: string
  orderId: string
  status: string
  reason: string
}

export function AdminDisputes() {
  const q = useAdmin<DisputeRow[]>('disputes', '/admin/disputes')
  return (
    <Panel title="Disputes" query={q}>
      {(q.data ?? []).map((d) => (
        <Card key={d.id} className="mt-2 text-sm">
          <p>
            {d.status} · order{' '}
            <Link to={`/admin/orders/${d.orderId}`} className="hover:underline">
              {d.orderId}
            </Link>
          </p>
          <p className="text-xs text-nx-muted">{d.reason}</p>
        </Card>
      ))}
      <p className="mt-4 text-xs text-nx-muted">
        Resolving a dispute moves money, so it is not on this read surface.
      </p>
    </Panel>
  )
}

export function AdminSettings() {
  const q = useAdmin<Record<string, string>>('settings', '/admin/settings')
  return (
    <Panel title="Settings" query={q}>
      {Object.entries(q.data ?? {}).map(([k, v]) => (
        <Card key={k} className="mt-2 flex justify-between gap-3 text-sm">
          <span className="text-nx-muted">{k}</span>
          <span className="break-all font-mono">{String(v)}</span>
        </Card>
      ))}
    </Panel>
  )
}

/** Still the prototype surface; support has no v1 route until M6. */
export function AdminSupport() {
  const q = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api<{ id: string; subject: string; status: string }[]>('/support'),
    retry: false,
  })
  return (
    <Panel title="Support" query={q}>
      {(q.data ?? []).map((t) => (
        <Card key={t.id} className="mt-2 text-sm">
          {t.subject} · {t.status}
        </Card>
      ))}
    </Panel>
  )
}

export function AdminNote({ title, body }: { title: string; body: string }) {
  const { user } = useAuth()
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card className="mt-4 text-sm">
        {body} Operator: {user?.email}.
      </Card>
    </div>
  )
}

export function AdminUserDetail() {
  const { userId } = useParams()
  const q = useAdmin<AdminUser[]>('users', '/admin/users')
  const u = q.data?.find((r) => r.id === userId)

  return (
    <Panel title="User" query={q}>
      {!q.isLoading && !u && (
        <p className="mt-4 text-sm text-nx-muted">No user with that id.</p>
      )}
      {u && (
        <Card className="mt-4 space-y-1 text-sm">
          <p>{u.displayName}</p>
          <p className="text-xs text-nx-muted">{u.email}</p>
          <p className="text-xs">Status {u.status}</p>
          <p className="text-xs">
            Email {u.emailVerifiedAt ? 'verified' : 'unverified'} · authenticator{' '}
            {u.mfaEnrolledAt ? 'enrolled' : 'not enrolled'}
          </p>
        </Card>
      )}
    </Panel>
  )
}
