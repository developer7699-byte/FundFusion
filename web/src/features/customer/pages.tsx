import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { activity } from '@/lib/demo-data'
import { inr, usdt } from '@/lib/utils'

type Overview = {
  simulated: boolean
  usdtInrRate: string
  wallet: { availableUsdt: string; lockedUsdt: string; totalUsdt: string; inrEstimate: string }
  totals: { transactions: number }
  recent: { id: string; type: string; status: string; amount: string; asset: string; createdAt: string }[]
}

export function CustomerDashboard() {
  const q = useQuery({
    queryKey: ['overview'],
    queryFn: () => api<Overview>('/customer/overview'),
  })
  if (q.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    )
  }
  if (q.error) {
    return <p className="text-nx-err">{q.error.message}</p>
  }
  const d = q.data!
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Good to see you</h1>
        <p className="text-sm text-nx-muted">All figures below are simulated prototype balances.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs text-nx-muted">Total (sim.)</p>
          <p className="mt-2 text-2xl font-semibold">{usdt(d.wallet.totalUsdt)}</p>
        </Card>
        <Card>
          <p className="text-xs text-nx-muted">USDT available</p>
          <p className="mt-2 text-2xl font-semibold">{d.wallet.availableUsdt}</p>
        </Card>
        <Card>
          <p className="text-xs text-nx-muted">INR estimate</p>
          <p className="mt-2 text-2xl font-semibold">{inr(d.wallet.inrEstimate)}</p>
          <p className="text-xs text-nx-muted">Rate {d.usdtInrRate} (display)</p>
        </Card>
        <Card>
          <p className="text-xs text-nx-muted">Transactions</p>
          <p className="mt-2 text-2xl font-semibold">{d.totals.transactions}</p>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="mb-3 text-sm">Activity (sample series)</p>
          <div className="h-52">
            <ResponsiveContainer>
              <AreaChart data={activity}>
                <XAxis dataKey="t" stroke="#A5AEC2" />
                <Tooltip />
                <Area dataKey="v" stroke="#8B7CFF" fill="#8B7CFF33" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <p className="text-sm">Quick actions</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              ['/customer/buy', 'Buy'],
              ['/customer/sell', 'Sell'],
              ['/customer/wallet/send', 'Send'],
              ['/customer/wallet/receive', 'Receive'],
              ['/customer/pay', 'Pay QR'],
              ['/customer/wallet/deposit', 'Deposit'],
              ['/customer/wallet/withdraw', 'Withdraw'],
              ['/customer/security', 'Security'],
            ].map(([to, label]) => (
              <Link key={to} to={to}>
                <Button variant="ghost" className="w-full" size="sm">
                  {label}
                </Button>
              </Link>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <p>Recent transactions</p>
          <Link to="/customer/transactions" className="text-sm text-nx-mint">
            View all
          </Link>
        </div>
        <div className="space-y-2">
          {d.recent.map((row) => (
            <Link
              key={row.id}
              to={`/customer/transactions/${row.id}`}
              className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"
            >
              <span>{row.type}</span>
              <span>
                {row.amount} {row.asset}
              </span>
              <Badge>{row.status}</Badge>
            </Link>
          ))}
          {d.recent.length === 0 && <p className="text-sm text-nx-muted">No movements yet.</p>}
        </div>
      </Card>
    </div>
  )
}

function FilterBar() {
  const [params, setParams] = useSearchParams()
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Input
        placeholder="Search"
        defaultValue={params.get('q') ?? ''}
        onChange={(e) => {
          params.set('q', e.target.value)
          setParams(params)
        }}
        className="max-w-xs"
      />
    </div>
  )
}

export function WalletHome() {
  const q = useQuery({ queryKey: ['overview'], queryFn: () => api<Overview>('/customer/overview') })
  return (
    <div>
      <h1 className="text-2xl font-semibold">Wallet</h1>
      <p className="text-sm text-nx-muted">Simulated accounts. Locked funds cannot be spent in later engine phases.</p>
      {q.data && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Card>Available {q.data.wallet.availableUsdt} USDT</Card>
          <Card>Locked {q.data.wallet.lockedUsdt} USDT</Card>
          <Card>Total {q.data.wallet.totalUsdt} USDT</Card>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ['deposit', 'Deposit'],
          ['withdraw', 'Withdraw'],
          ['send', 'Send'],
          ['receive', 'Receive'],
          ['addresses', 'Addresses'],
        ].map(([p, l]) => (
          <Link key={p} to={`/customer/wallet/${p}`}>
            <Button variant="ghost">{l}</Button>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function FlowPage({
  title,
  fields,
  action,
}: {
  title: string
  fields: { name: string; label: string; type?: string }[]
  action: string
}) {
  const [state, setState] = useState('idle')
  const [receipt, setReceipt] = useState('')
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-nx-muted">Prototype form. Submits a local confirmation, not a chain or bank payment.</p>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          setState('processing')
          window.setTimeout(() => {
            setState('done')
            setReceipt(`SIM-${Date.now()}`)
          }, 600)
        }}
      >
        {fields.map((f) => (
          <label key={f.name} className="block text-sm">
            {f.label}
            <Input name={f.name} type={f.type ?? 'text'} required className="mt-1" />
          </label>
        ))}
        <Button type="submit" disabled={state === 'processing'}>
          {action}
        </Button>
      </form>
      {state === 'done' && (
        <Card className="mt-4">
          Mock receipt {receipt}. No funds left this device. Wallet updates require the ledger APIs in
          later phases.
        </Card>
      )}
    </div>
  )
}

export function ListPage({
  title,
  rows,
  to,
}: {
  title: string
  rows: { id: string; title: string; meta: string }[]
  to: (id: string) => string
}) {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').toLowerCase()
  const filtered = rows.filter((r) => r.title.toLowerCase().includes(q) || r.meta.toLowerCase().includes(q))
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <FilterBar />
      <div className="space-y-2">
        {filtered.map((r) => (
          <Link key={r.id} to={to(r.id)}>
            <Card className="flex justify-between">
              <span>{r.title}</span>
              <span className="text-sm text-nx-muted">{r.meta}</span>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && <p className="text-sm text-nx-muted">Nothing matches that filter.</p>}
      </div>
    </div>
  )
}

export function DetailPage({ label }: { label: string }) {
  const { orderId, transactionId, ticketId, brandId } = useParams()
  const id = orderId ?? transactionId ?? ticketId ?? brandId
  return (
    <div>
      <h1 className="text-2xl font-semibold">{label}</h1>
      <Card className="mt-4">
        <p>Record {id}</p>
        <p className="mt-2 text-sm text-nx-muted">
          Detail views will bind to API entities in later phases. This shell is routable and labelled as
          simulated.
        </p>
      </Card>
    </div>
  )
}

export function CatalogPage() {
  const brands = [
    { id: 'northline-audio', title: 'Northline Audio', meta: 'Entertainment' },
    { id: 'paper-trail', title: 'Paper Trail Books', meta: 'Retail' },
  ]
  return <ListPage title="Gift cards" rows={brands} to={(id) => `/customer/gift-cards/${id}`} />
}

export function UtilitiesHub() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Utilities</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {[
          ['mobile-recharge', 'Mobile recharge'],
          ['dth', 'DTH'],
          ['electricity', 'Electricity'],
          ['bill-payment', 'Bill payment'],
        ].map(([p, l]) => (
          <Link key={p} to={`/customer/utilities/${p}`}>
            <Card>{l}</Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function AccountPage({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card className="mt-4">{body}</Card>
    </div>
  )
}

export function PayHome() {
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Pay</h1>
      <p className="text-sm text-nx-muted">
        Mock UPI only. Scan an image or type an ID. No bank transfer is executed.
      </p>
      <Link to="/customer/pay/scan">
        <Button>Scan QR</Button>
      </Link>
      <Link to="/customer/pay/confirm">
        <Button variant="ghost">Enter UPI ID</Button>
      </Link>
    </div>
  )
}

export function PayScan() {
  const [parsed, setParsed] = useState('')
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold">Scan QR</h1>
      <p className="text-sm text-nx-muted">Mock parser only. Upload any image to simulate a UPI payload.</p>
      <input
        type="file"
        accept="image/*"
        className="mt-4 text-sm"
        onChange={(e) => {
          const file = e.target.files?.[0]
          setParsed(file ? `upi://pay?pa=demo@nexora&pn=Sample%20Shop&file=${file.name}` : '')
        }}
      />
      {parsed && (
        <Card className="mt-4">
          <p>Parsed (mock): {parsed}</p>
          <Link to="/customer/pay/confirm">
            <Button className="mt-3">Continue</Button>
          </Link>
        </Card>
      )}
    </div>
  )
}

