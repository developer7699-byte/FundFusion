import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { inr, usdt } from '@/lib/utils'

export type WalletSnap = {
  simulated: boolean
  label: string
  usdtInrRate: string
  wallet: { availableUsdt: string; lockedUsdt: string; totalUsdt: string; inrEstimate: string }
  assets: { symbol: string; available: string; locked: string; total: string; displayOnly?: boolean }[]
  addresses: { id: string; network: string; address: string; isDefault: boolean }[]
  activity: { id: string; type: string; status: string; amount: string; asset: string; createdAt: string }[]
}

function useWallet() {
  return useQuery({ queryKey: ['wallet'], queryFn: () => api<WalletSnap>('/wallet') })
}

export function WalletHome() {
  const q = useWallet()
  if (q.isLoading) return <Skeleton className="h-40" />
  if (q.error) return <p className="text-nx-err">{q.error.message}</p>
  const d = q.data!
  return (
    <div>
      <h1 className="text-2xl font-semibold">Wallet</h1>
      <p className="text-sm text-nx-muted">{d.label}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Card>Available {d.wallet.availableUsdt} USDT</Card>
        <Card>Locked {d.wallet.lockedUsdt} USDT</Card>
        <Card>Total {d.wallet.totalUsdt} USDT</Card>
      </div>
      <p className="mt-3 text-sm text-nx-muted">INR display estimate {inr(d.wallet.inrEstimate)} at mock rate {d.usdtInrRate}</p>
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
      <Card className="mt-6">
        <p className="mb-3 text-sm">Recent (simulated ledger)</p>
        {d.activity.slice(0, 8).map((row) => (
          <Link key={row.id} to={`/customer/transactions/${row.id}`} className="flex justify-between py-2 text-sm">
            <span>{row.type}</span>
            <span>{row.amount} {row.asset}</span>
            <Badge>{row.status}</Badge>
          </Link>
        ))}
      </Card>
    </div>
  )
}

export function DepositFlow() {
  const qc = useQueryClient()
  const [network, setNetwork] = useState('TRX')
  const [deposit, setDeposit] = useState<{
    id: string
    address: string
    status: string
    confirmations: number
    requiredConfirmations: number
    mockTxHash: string | null
    amount: string
  } | null>(null)
  const [amount, setAmount] = useState('50')
  const start = useMutation({
    mutationFn: () => api<NonNullable<typeof deposit> & { qrPayload: string }>('/wallet/deposits', {
      method: 'POST',
      body: JSON.stringify({ asset: 'USDT', network }),
    }),
    onSuccess: setDeposit,
  })
  const broadcast = useMutation({
    mutationFn: () =>
      api<NonNullable<typeof deposit>>(`/wallet/deposits/${deposit!.id}/simulate-broadcast`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    onSuccess: setDeposit,
  })
  const confirm = useMutation({
    mutationFn: () => api<NonNullable<typeof deposit>>(`/wallet/deposits/${deposit!.id}/simulate-confirm`, { method: 'POST' }),
    onSuccess: (row) => {
      setDeposit(row)
      void qc.invalidateQueries({ queryKey: ['wallet'] })
      void qc.invalidateQueries({ queryKey: ['overview'] })
    },
  })
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Deposit</h1>
      <p className="text-sm text-nx-muted">Mock rail only. The address never listens on a public chain.</p>
      <label className="block text-sm">
        Network
        <select
          className="mt-1 h-11 w-full rounded-xl border border-nx-line bg-nx-bg/60 px-3"
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
        >
          <option>TRX</option>
          <option>ETH</option>
          <option>BNB</option>
        </select>
      </label>
      <Button onClick={() => start.mutate()} disabled={start.isPending}>
        Generate mock address
      </Button>
      {deposit && (
        <Card className="space-y-3">
          <p className="text-xs text-nx-muted">Mock address</p>
          <p className="break-all font-mono text-sm">{deposit.address}</p>
          <p className="text-xs">Status {deposit.status} · confirmations {deposit.confirmations}/{deposit.requiredConfirmations}</p>
          {deposit.mockTxHash && <p className="break-all text-xs text-nx-muted">{deposit.mockTxHash}</p>}
          {deposit.status === 'ADDRESS_READY' && (
            <>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Button onClick={() => broadcast.mutate()}>Simulate incoming transfer</Button>
            </>
          )}
          {(deposit.status === 'BROADCAST_SIMULATED' || deposit.status === 'CONFIRMING') && (
            <Button onClick={() => confirm.mutate()}>Simulate confirmation</Button>
          )}
          {deposit.status === 'COMPLETED' && (
            <p className="text-nx-mint">Mock deposit credited on the ledger. Available balance updated.</p>
          )}
        </Card>
      )}
    </div>
  )
}

function Outbound({ kind }: { kind: 'SEND' | 'WITHDRAW' }) {
  const qc = useQueryClient()
  const [receipt, setReceipt] = useState<Record<string, string> | null>(null)
  const [error, setError] = useState('')
  const path = kind === 'SEND' ? '/wallet/send' : '/wallet/withdrawals'
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold">{kind === 'SEND' ? 'Send crypto' : 'Withdraw'}</h1>
      <p className="text-sm text-nx-muted">Locked USDT cannot be spent. Fees are mock network fees.</p>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setError('')
          const data = new FormData(e.currentTarget)
          try {
            const row = await api<Record<string, string>>(path, {
              method: 'POST',
              body: JSON.stringify({
                asset: 'USDT',
                network: data.get('network'),
                toAddress: data.get('to'),
                amount: data.get('amount'),
              }),
            })
            setReceipt(row)
            void qc.invalidateQueries({ queryKey: ['wallet'] })
            void qc.invalidateQueries({ queryKey: ['overview'] })
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Request failed')
          }
        }}
      >
        <Input name="to" required placeholder="Recipient mock address" />
        <Input name="amount" required placeholder="Amount USDT" />
        <select name="network" className="h-11 w-full rounded-xl border border-nx-line bg-nx-bg/60 px-3">
          <option>TRX</option>
          <option>ETH</option>
          <option>BNB</option>
        </select>
        {error && <p className="text-sm text-nx-err">{error}</p>}
        <Button type="submit">Submit mock {kind.toLowerCase()}</Button>
      </form>
      {receipt && (
        <Card className="mt-4 text-sm">
          <p>Receipt {receipt.receipt}</p>
          <p>Amount {usdt(receipt.amount)} · fee {receipt.fee}</p>
          <p className="text-nx-muted">{receipt.note}</p>
        </Card>
      )}
    </div>
  )
}

export function SendFlow() {
  return <Outbound kind="SEND" />
}

export function WithdrawFlow() {
  return <Outbound kind="WITHDRAW" />
}

export function ReceiveFlow() {
  const q = useWallet()
  const addr = q.data?.addresses.find((a) => a.isDefault) ?? q.data?.addresses[0]
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold">Receive</h1>
      <p className="text-sm text-nx-muted">Share this mock address in the prototype only.</p>
      <Card className="mt-4">
        <p className="text-xs text-nx-muted">{addr?.network ?? 'TRX'}</p>
        <p className="mt-2 break-all font-mono text-sm">{addr?.address ?? 'Generate a deposit address first.'}</p>
      </Card>
    </div>
  )
}

export function AddressesFlow() {
  const q = useWallet()
  return (
    <div>
      <h1 className="text-2xl font-semibold">Addresses</h1>
      <p className="text-sm text-nx-muted">Mock identifiers. No private keys are stored.</p>
      <div className="mt-4 space-y-2">
        {q.data?.addresses.map((a) => (
          <Card key={a.id} className="flex justify-between gap-4 text-sm">
            <span>{a.network}</span>
            <span className="break-all text-nx-muted">{a.address}</span>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function QuoteFlow({ side }: { side: 'BUY' | 'SELL' | 'CONVERT' }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState(side === 'BUY' ? '1000' : '10')
  const [quote, setQuote] = useState<{
    id: string
    fromAmount: string
    toAmount: string
    fromAsset: string
    toAsset: string
    rate: string
    feeAmount: string
    expiresAt: string
    merchantLabel: string
  } | null>(null)
  const [left, setLeft] = useState(0)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!quote) return
    const tick = () => setLeft(Math.max(0, Math.ceil((new Date(quote.expiresAt).getTime() - Date.now()) / 1000)))
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [quote])

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">{side === 'BUY' ? 'Buy' : side === 'SELL' ? 'Sell' : 'Convert'}</h1>
      <p className="text-sm text-nx-muted">Quotes are calculated on the server. Nothing is a live market fill.</p>
      <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Button
        onClick={async () => {
          setMessage('')
          setQuote(await api('/wallet/quotes', { method: 'POST', body: JSON.stringify({ side, amount }) }))
        }}
      >
        Request mock quote
      </Button>
      {quote && (
        <Card className="space-y-2 text-sm">
          <p>{quote.fromAmount} {quote.fromAsset} → {quote.toAmount} {quote.toAsset}</p>
          <p>Rate {quote.rate} · fee {quote.feeAmount}</p>
          <p>{quote.merchantLabel}</p>
          <p>Expires in {left}s</p>
          <Button
            disabled={left <= 0}
            onClick={async () => {
              try {
                await api(`/wallet/quotes/${quote.id}/accept`, { method: 'POST' })
                setMessage('Mock quote accepted. Ledger updated.')
                void qc.invalidateQueries({ queryKey: ['wallet'] })
                void qc.invalidateQueries({ queryKey: ['overview'] })
              } catch (err) {
                setMessage(err instanceof Error ? err.message : 'Rejected')
              }
            }}
          >
            Accept quote
          </Button>
        </Card>
      )}
      {message && <p className="text-sm text-nx-mint">{message}</p>}
    </div>
  )
}

export function TransactionsFlow() {
  const q = useWallet()
  const [params] = [new URLSearchParams(window.location.search)]
  const filter = (params.get('q') ?? '').toLowerCase()
  const rows = (q.data?.activity ?? []).filter(
    (r) => r.type.toLowerCase().includes(filter) || r.status.toLowerCase().includes(filter),
  )
  return (
    <div>
      <h1 className="text-2xl font-semibold">Transactions</h1>
      <p className="text-sm text-nx-muted">Simulated ledger activity.</p>
      <div className="mt-4 space-y-2">
        {rows.map((r) => (
          <Link key={r.id} to={`/customer/transactions/${r.id}`}>
            <Card className="flex justify-between text-sm">
              <span>{r.type}</span>
              <span>{r.amount} {r.asset}</span>
              <Badge>{r.status}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function TransactionDetailFlow() {
  const { transactionId } = useParams()
  const q = useQuery({
    queryKey: ['activity', transactionId],
    queryFn: () => api<{ type: string; status: string; amount: string; asset: string; createdAt: string }>(`/wallet/activity/${transactionId}`),
    enabled: Boolean(transactionId),
  })
  if (q.isLoading) return <Skeleton className="h-32" />
  if (q.error) return <p className="text-nx-err">{q.error.message}</p>
  const row = q.data!
  return (
    <div>
      <h1 className="text-2xl font-semibold">{row.type}</h1>
      <Card className="mt-4 space-y-2 text-sm">
        <p>Status {row.status}</p>
        <p>Amount {row.amount} {row.asset}</p>
        <p>When {new Date(row.createdAt).toLocaleString()}</p>
        <p className="text-nx-muted">Simulated ledger row. Not a chain explorer record.</p>
      </Card>
    </div>
  )
}
