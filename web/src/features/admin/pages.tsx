import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'

export function AdminHome() {
  const q = useQuery({ queryKey: ['a-dash'], queryFn: () => api<Record<string, string | number>>('/admin/overview') })
  const d = q.data ?? {}
  return (
    <div>
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-sm text-nx-muted">{String(d.volumeNote ?? 'Simulated')}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {['users', 'activeUsers', 'merchants', 'orders', 'completed', 'pending', 'failed', 'lockedUsdt'].map((k) => (
          <Card key={k}>
            <p className="text-xs text-nx-muted">{k}</p>
            <p className="text-xl">{String(d[k] ?? '—')}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function AdminUsers() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['a-users'],
    queryFn: () => api<{ id: string; email: string; displayName: string; status: string; roles: string[] }[]>('/admin/users'),
  })
  return (
    <div>
      <h1 className="text-2xl font-semibold">Users</h1>
      {(q.data ?? []).map((u) => (
        <Card key={u.id} className="mt-2 flex items-center justify-between text-sm">
          <span>
            {u.displayName} · {u.email} · {u.roles.join(', ')} · {u.status}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await api(`/admin/users/${u.id}/status`, {
                method: 'POST',
                body: JSON.stringify({ status: u.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED' }),
              })
              void qc.invalidateQueries({ queryKey: ['a-users'] })
            }}
          >
            {u.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
          </Button>
        </Card>
      ))}
    </div>
  )
}

export function AdminOrders() {
  const q = useQuery({ queryKey: ['a-orders'], queryFn: () => api<{ id: string; status: string; kind: string }[]>('/admin/orders') })
  return (
    <div>
      <h1 className="text-2xl font-semibold">All orders</h1>
      {(q.data ?? []).map((o) => (
        <Link key={o.id} to={`/admin/orders/${o.id}`}>
          <Card className="mt-2 flex justify-between text-sm">
            <span>{o.kind}</span>
            <Badge>{o.status}</Badge>
          </Card>
        </Link>
      ))}
    </div>
  )
}

export function AdminOrderDetail() {
  const { orderId } = useParams()
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api<{ id: string; status: string; kind: string; usdtAmount: string }>(`/orders/${orderId}`),
  })
  const o = q.data
  if (!o) return null
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{o.kind}</h1>
      <Badge>{o.status}</Badge>
      <p>{o.usdtAmount} USDT locked/settled on mock ledger</p>
      <Button
        onClick={async () => {
          await api(`/admin/orders/${o.id}/complete`, { method: 'POST' })
          void qc.invalidateQueries()
        }}
      >
        Authorized complete
      </Button>
      <Button
        variant="ghost"
        onClick={async () => {
          await api(`/admin/orders/${o.id}/refund`, { method: 'POST' })
          void qc.invalidateQueries()
        }}
      >
        Authorized refund
      </Button>
    </div>
  )
}

export function AdminLedger() {
  const q = useQuery({
    queryKey: ['a-ledger'],
    queryFn: () => api<{ id: string; memo: string; reference: string }[]>('/admin/ledger'),
  })
  return (
    <div>
      <h1 className="text-2xl font-semibold">Ledger</h1>
      <p className="text-sm text-nx-muted">No silent balance edits. These are mock journal rows.</p>
      {(q.data ?? []).map((r) => (
        <Card key={r.id} className="mt-2 text-sm">
          {r.reference} · {r.memo}
        </Card>
      ))}
    </div>
  )
}

export function AdminAudit() {
  const q = useQuery({
    queryKey: ['a-audit'],
    queryFn: () => api<{ id: string; action: string; entity: string; reason: string }[]>('/admin/audit-logs'),
  })
  return (
    <div>
      <h1 className="text-2xl font-semibold">Audit logs</h1>
      {(q.data ?? []).map((r) => (
        <Card key={r.id} className="mt-2 text-sm">
          {r.action} · {r.entity} · {r.reason}
        </Card>
      ))}
    </div>
  )
}

export function AdminDisputes() {
  const q = useQuery({
    queryKey: ['a-disp'],
    queryFn: () => api<{ id: string; orderId: string; status: string; reason: string }[]>('/admin/disputes'),
  })
  return (
    <div>
      <h1 className="text-2xl font-semibold">Disputes</h1>
      {(q.data ?? []).map((d) => (
        <Card key={d.id} className="mt-2 text-sm">
          {d.status} · {d.orderId} · {d.reason}
        </Card>
      ))}
    </div>
  )
}

export function AdminSettings() {
  const q = useQuery({ queryKey: ['a-set'], queryFn: () => api<Record<string, string>>('/admin/settings') })
  return (
    <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card className="mt-4 text-sm">{JSON.stringify(q.data)}</Card>
    </div>
  )
}

export function AdminSupport() {
  const q = useQuery({ queryKey: ['tickets'], queryFn: () => api<{ id: string; subject: string; status: string }[]>('/support') })
  return (
    <div>
      <h1 className="text-2xl font-semibold">Support</h1>
      {(q.data ?? []).map((t) => (
        <Card key={t.id} className="mt-2 text-sm">
          {t.subject} · {t.status}
        </Card>
      ))}
    </div>
  )
}

export function AdminNote({ title, body }: { title: string; body: string }) {
  const { user } = useAuth()
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card className="mt-4 text-sm">
        {body} Operator: {user?.email}. All monitoring here is simulated.
      </Card>
    </div>
  )
}

export function AdminUserDetail() {
  const { userId } = useParams()
  return <AdminNote title="User" body={`Profile ${userId}. Transactions appear in the ledger list.`} />
}
