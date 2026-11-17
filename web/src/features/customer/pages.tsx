import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useState, useEffect } from 'react'
import {
  QrCode,
  Zap,
  TrendingUp,
  Wallet,
  Plus,
  Smartphone,
  Gift,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Send,
  Navigation,
  ArrowLeft,
  Tv,
  Wifi,
  Flame,
  Droplets,
  Car,
  CreditCard,
  Building2,
  Clock,
  RefreshCw,
  Search,
  ScanLine,
  Check,
  ArrowDownCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { activity } from '@/lib/demo-data'
import { cn, inr, usdt } from '@/lib/utils'
import { BackButton } from '@/components/ui/BackButton'

type Overview = {
  simulated: boolean
  usdtInrRate: string
  wallet: { availableUsdt: string; lockedUsdt: string; totalUsdt: string; inrEstimate: string }
  totals: { transactions: number }
  recent: { id: string; type: string; status: string; amount: string; asset: string; createdAt: string }[]
}

export { CustomerDashboard } from './CustomerDashboard'

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

export function AccountPage({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <BackButton fallback="/customer/dashboard" />
        <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{title}</h1>
      </div>
      <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed shadow-2xs">
        {body}
      </div>
    </div>
  )
}

