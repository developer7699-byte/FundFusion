import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'

type Order = {
  id: string
  kind: string
  status: string
  usdtAmount: string
  inrAmount: string
  customerId: string
  merchantId?: string
}

export function MerchantHome() {
  const q = useQuery({ queryKey: ['m-dash'], queryFn: () => api<Record<string, string | number | boolean | object>>('/merchant/dashboard') })
  const d = q.data
  return (
    <div>
      <h1 className="text-2xl font-semibold">Merchant desk</h1>
      <p className="text-sm text-nx-muted">Simulated earnings. Not a guaranteed return.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Card>Available {(d?.wallet as { available?: string })?.available} USDT</Card>
        <Card>Locked {(d?.wallet as { locked?: string })?.locked} USDT</Card>
        <Card>Active {String(d?.active)}</Card>
        <Card>Completed {String(d?.completed)}</Card>
        <Card>Available book {String(d?.available)}</Card>
        <Card>Completion {String(d?.completionRate)}%</Card>
      </div>
      <p className="mt-3 text-xs text-nx-muted">{String(d?.totalEarningsNote ?? '')}</p>
    </div>
  )
}

function OrderList({ path, title }: { path: string; title: string }) {
  const q = useQuery({ queryKey: [path], queryFn: () => api<Order[]>(path) })
  const rows = q.data ?? []
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="mt-4 space-y-2">
        {rows.map((o) => (
          <Link key={o.id} to={`/merchant/orders/${o.id}`}>
            <Card className="flex justify-between text-sm">
              <span>{o.kind}</span>
              <span>{o.usdtAmount} USDT</span>
              <Badge>{o.status}</Badge>
            </Card>
          </Link>
        ))}
        {rows.length === 0 && <p className="text-sm text-nx-muted">Empty in this mock book.</p>}
      </div>
    </div>
  )
}

export function MerchantAvailable() {
  return <OrderList path="/merchant/available-orders" title="Available orders" />
}

export function MerchantOrders({ filter }: { filter?: string }) {
  const q = useQuery({ queryKey: ['m-orders'], queryFn: () => api<Order[]>('/merchant/orders') })
  const rows = (q.data ?? []).filter((o) => {
    if (filter === 'active') return !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(o.status)
    if (filter === 'done') return o.status === 'COMPLETED'
    return true
  })
  return (
    <div>
      <h1 className="text-2xl font-semibold">Orders</h1>
      {rows.map((o) => (
        <Link key={o.id} to={`/merchant/orders/${o.id}`}>
          <Card className="mt-2 flex justify-between text-sm">
            <span>{o.kind}</span>
            <Badge>{o.status}</Badge>
          </Card>
        </Link>
      ))}
    </div>
  )
}

export function MerchantOrderDetail() {
  const { orderId } = useParams()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['order', orderId], queryFn: () => api<Order>(`/orders/${orderId}`) })
  const o = q.data
  if (!o) return null
  return (
    <div className="max-w-lg space-y-3">
      <h1 className="text-2xl font-semibold">{o.kind}</h1>
      <Badge>{o.status}</Badge>
      <p className="text-sm">{o.usdtAmount} USDT · ₹{o.inrAmount}</p>
      <Button
        onClick={async () => {
          await api(`/merchant/orders/${o.id}/accept`, { method: 'POST' })
          void qc.invalidateQueries()
        }}
      >
        Accept
      </Button>
      <form
        className="space-y-2"
        onSubmit={async (e) => {
          e.preventDefault()
          const utr = String(new FormData(e.currentTarget).get('utr'))
          await api(`/merchant/orders/${o.id}/utr`, { method: 'POST', body: JSON.stringify({ utr, note: 'mock proof' }) })
          void qc.invalidateQueries()
        }}
      >
        <Input name="utr" placeholder="Mock UTR" required />
        <Button type="submit" variant="ghost">
          Submit UTR
        </Button>
      </form>
      <Button
        variant="ghost"
        onClick={async () => {
          await api(`/merchant/orders/${o.id}/complete`, { method: 'POST' })
          void qc.invalidateQueries()
        }}
      >
        Complete eligible order
      </Button>
    </div>
  )
}

export function MerchantWallet() {
  const q = useQuery({ queryKey: ['m-dash'], queryFn: () => api<{ wallet: { available: string; locked: string } }>('/merchant/dashboard') })
  return (
    <div>
      <h1 className="text-2xl font-semibold">Merchant wallet</h1>
      <Card className="mt-4">Available {q.data?.wallet.available} · Locked {q.data?.wallet.locked} (simulated)</Card>
    </div>
  )
}

export function MerchantNote({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card className="mt-4 text-sm">{body}</Card>
    </div>
  )
}

export function MerchantNotices() {
  const q = useQuery({ queryKey: ['notices'], queryFn: () => api<{ id: string; title: string }[]>('/notifications') })
  return (
    <div>
      <h1 className="text-2xl font-semibold">Notifications</h1>
      {(q.data ?? []).map((n) => (
        <Card key={n.id} className="mt-2 text-sm">
          {n.title}
        </Card>
      ))}
    </div>
  )
}

export function MerchantProfile() {
  const { user } = useAuth()
  return (
    <div>
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card className="mt-4 text-sm">{user?.displayName} · Orbit Desk LLP (mock) · commission 1.5% of settled mock volume — not a yield product.</Card>
    </div>
  )
}
