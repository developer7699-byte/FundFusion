import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
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
  timeline: { at: string; status: string; note: string }[]
  utr?: string
  upiId?: string
}

export function OrdersList() {
  const q = useQuery({ queryKey: ['orders'], queryFn: () => api<Order[]>('/orders') })
  return (
    <div>
      <h1 className="text-2xl font-semibold">Orders</h1>
      <p className="text-sm text-nx-muted">Mock P2P / UPI escrow. Locked USDT is not spendable.</p>
      <div className="mt-4 space-y-2">
        {(q.data ?? []).map((o) => (
          <Link key={o.id} to={`/customer/orders/${o.id}`}>
            <Card className="flex justify-between text-sm">
              <span>{o.kind}</span>
              <span>{o.usdtAmount} USDT</span>
              <Badge>{o.status}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function OrderDetail() {
  const { orderId } = useParams()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['order', orderId], queryFn: () => api<Order>(`/orders/${orderId}`) })
  if (!q.data) return <p className="text-nx-muted">Loading mock order…</p>
  const o = q.data
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Order {o.kind}</h1>
      <Badge>{o.status}</Badge>
      <Card>
        {o.timeline.map((t) => (
          <p key={t.at + t.status} className="py-1 text-sm">
            {t.status} — {t.note}
          </p>
        ))}
      </Card>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={async () => {
            await api(`/orders/${o.id}/cancel`, { method: 'POST' })
            void qc.invalidateQueries()
          }}
        >
          Cancel / unlock
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            await api(`/orders/${o.id}/dispute`, { method: 'POST', body: JSON.stringify({ reason: 'Mock dispute' }) })
            void qc.invalidateQueries()
          }}
        >
          Dispute
        </Button>
      </div>
    </div>
  )
}

export function PayConfirm() {
  const navigate = useNavigate()
  const [amount, setAmount] = useState('500')
  const [upi, setUpi] = useState('demo.shop@nexora')
  return (
    <div className="max-w-lg space-y-3">
      <h1 className="text-2xl font-semibold">Confirm mock UPI pay</h1>
      <p className="text-sm text-nx-muted">Locks USDT on the ledger. No rupee leaves a bank.</p>
      <Input value={upi} onChange={(e) => setUpi(e.target.value)} />
      <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Button
        onClick={async () => {
          const order = await api<Order>('/orders', {
            method: 'POST',
            body: JSON.stringify({ kind: 'UPI_PAY', inrAmount: amount, upiId: upi, beneficiary: 'Sample shop' }),
          })
          navigate(`/customer/orders/${order.id}`)
        }}
      >
        Lock funds & create order
      </Button>
    </div>
  )
}

export function GiftHub() {
  const q = useQuery({ queryKey: ['gifts'], queryFn: () => api<{ id: string; name: string; slug: string; category: string }[]>('/gift-cards') })
  return (
    <div>
      <h1 className="text-2xl font-semibold">Gift cards</h1>
      <Link to="/customer/gift-cards/orders" className="text-sm text-nx-mint">
        Order history
      </Link>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {(q.data ?? []).map((b) => (
          <Link key={b.id} to={`/customer/gift-cards/${b.slug}`}>
            <Card>
              <p>{b.name}</p>
              <p className="text-sm text-nx-muted">{b.category}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function GiftBrand() {
  const { brandId } = useParams()
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['gift', brandId],
    queryFn: () =>
      api<{ name: string; products: { id: string; denominationInr: string; usdtPrice: string }[] }>(
        `/gift-cards/brands/${brandId}`,
      ),
  })
  const [code, setCode] = useState('')
  return (
    <div className="max-w-lg space-y-3">
      <h1 className="text-2xl font-semibold">{q.data?.name ?? 'Brand'}</h1>
      {(q.data?.products ?? []).map((p) => (
        <Card key={p.id} className="flex items-center justify-between">
          <span>₹{p.denominationInr} · {p.usdtPrice} USDT</span>
          <Button
            size="sm"
            onClick={async () => {
              const row = await api<{ mockCode: string }>('/gift-cards/orders', {
                method: 'POST',
                body: JSON.stringify({ productId: p.id }),
              })
              setCode(row.mockCode)
              void qc.invalidateQueries({ queryKey: ['wallet'] })
            }}
          >
            Buy mock card
          </Button>
        </Card>
      ))}
      {code && <p className="text-nx-mint">Mock code {code}</p>}
    </div>
  )
}

export function GiftHistory() {
  const q = useQuery({ queryKey: ['gift-history'], queryFn: () => api<{ id: string; status: string; mockCode: string }[]>('/gift-cards/history') })
  return (
    <div>
      <h1 className="text-2xl font-semibold">Gift card orders</h1>
      {(q.data ?? []).map((o) => (
        <Card key={o.id} className="mt-2 text-sm">
          {o.status} · {o.mockCode}
        </Card>
      ))}
    </div>
  )
}

export function UtilityFlow({ service }: { service: string }) {
  const [id, setId] = useState('9988776655')
  const [amount, setAmount] = useState('199')
  const [receipt, setReceipt] = useState('')
  return (
    <div className="max-w-lg space-y-3">
      <h1 className="text-2xl font-semibold">{service}</h1>
      <p className="text-sm text-nx-muted">Mock biller. No operator API is called.</p>
      <Input value={id} onChange={(e) => setId(e.target.value)} />
      <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Button
        onClick={async () => {
          const row = await api<{ id: string; status: string }>(`/utilities/orders`, {
            method: 'POST',
            body: JSON.stringify({ service, consumerId: id, amountInr: amount }),
          })
          setReceipt(`${row.status} ${row.id}`)
        }}
      >
        Pay with mock USDT
      </Button>
      {receipt && <p className="text-nx-mint">{receipt}</p>}
    </div>
  )
}

export function NoticeCenter() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['notices'],
    queryFn: () => api<{ id: string; title: string; body: string; readAt: string | null }[]>('/notifications'),
  })
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <Button
          variant="ghost"
          onClick={async () => {
            await api('/notifications/read', { method: 'POST', body: '{}' })
            void qc.invalidateQueries({ queryKey: ['notices'] })
          }}
        >
          Mark all read
        </Button>
      </div>
      {(q.data ?? []).map((n) => (
        <Card key={n.id} className="mt-2">
          <p>{n.title}</p>
          <p className="text-sm text-nx-muted">{n.body}</p>
          <p className="text-xs">{n.readAt ? 'Read' : 'Unread'}</p>
        </Card>
      ))}
    </div>
  )
}

export function SupportDesk() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['tickets'], queryFn: () => api<{ id: string; subject: string; status: string }[]>('/support') })
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Support</h1>
      <form
        className="space-y-2"
        onSubmit={async (e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          await api('/support', {
            method: 'POST',
            body: JSON.stringify({
              category: data.get('category'),
              subject: data.get('subject'),
              body: data.get('body'),
            }),
          })
          void qc.invalidateQueries({ queryKey: ['tickets'] })
        }}
      >
        <Input name="category" placeholder="Category" required />
        <Input name="subject" placeholder="Subject" required />
        <Input name="body" placeholder="Description" required />
        <Button type="submit">Open ticket</Button>
      </form>
      {(q.data ?? []).map((t) => (
        <Link key={t.id} to={`/customer/support/${t.id}`}>
          <Card className="mt-2 flex justify-between text-sm">
            <span>{t.subject}</span>
            <Badge>{t.status}</Badge>
          </Card>
        </Link>
      ))}
    </div>
  )
}

export function TicketDetail() {
  const { ticketId } = useParams()
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () =>
      api<{ subject: string; status: string; messages: { id: string; body: string; authorId: string }[] }>(
        `/support/${ticketId}`,
      ),
  })
  return (
    <div className="max-w-lg space-y-3">
      <h1 className="text-2xl font-semibold">{q.data?.subject}</h1>
      <Badge>{q.data?.status}</Badge>
      {(q.data?.messages ?? []).map((m) => (
        <Card key={m.id} className="text-sm">
          {m.body}
        </Card>
      ))}
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const body = new FormData(e.currentTarget).get('body')
          await api(`/support/${ticketId}/reply`, { method: 'POST', body: JSON.stringify({ body }) })
          void qc.invalidateQueries({ queryKey: ['ticket', ticketId] })
        }}
      >
        <Input name="body" required placeholder="Reply" />
        <Button className="mt-2" type="submit">
          Send
        </Button>
      </form>
    </div>
  )
}

export function AccountLive({ title }: { title: string }) {
  const { user } = useAuth()
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card className="mt-4 space-y-2 text-sm">
        <p>{user?.displayName} · {user?.email}</p>
        <p>Roles {user?.roles.join(', ')}</p>
        <p>Status {user?.status} · KYC UNVERIFIED (mock)</p>
        <p>Referral NX-AANYA1 (simulated)</p>
        <p>No live rewards. Prototype only.</p>
      </Card>
    </div>
  )
}

export function PayScanLive() {
  const navigate = useNavigate()
  const parse = useMutation({
    mutationFn: (payload: string) => api<{ upiId: string; beneficiary: string }>('/upi/parse', {
      method: 'POST',
      body: JSON.stringify({ payload }),
    }),
    onSuccess: () => navigate('/customer/pay/confirm'),
  })
  return (
    <div className="max-w-lg space-y-3">
      <h1 className="text-2xl font-semibold">Scan QR</h1>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) parse.mutate(file.name)
        }}
      />
      {parse.data && <p className="text-sm">{parse.data.beneficiary}</p>}
    </div>
  )
}
