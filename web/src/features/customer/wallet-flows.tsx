import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Copy,
  Check,
  QrCode,
  CheckCircle2,
} from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import {} from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ParkedAction } from '@/components/ui/ParkedAction'
import {} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { newIdempotencyKey, v1 } from '@/lib/api'
import { cn, usdt2dp } from '@/lib/utils'

/** `GET /v1/wallet/summary`. Every figure is a string (PRD §5.1). */
export interface WalletSummary {
  balances: Record<string, string>
  address: string | null
  network: string
}

/** `GET /v1/wallet/activity`. One row per ledger entry. */
export interface ActivityRow {
  id: string
  kind: string
  bucket: string
  direction: 'DEBIT' | 'CREDIT'
  amount: string
  assetSymbol: string
  memo: string
  at: string
}

/**
 * The wallet, as the ledger has it.
 *
 * No fallback. The prototype invented balances and addresses when the request
 * failed, and an invented deposit address is the worst thing this screen can
 * show: money sent to it is gone.
 */
export function useWalletSummary() {
  return useQuery({
    queryKey: ['wallet', 'summary'],
    queryFn: () => v1<WalletSummary>('/wallet/summary'),
    retry: false,
  })
}

export function useActivity() {
  return useQuery({
    queryKey: ['wallet', 'activity'],
    queryFn: () => v1<ActivityRow[]>('/wallet/activity'),
    retry: false,
  })
}

/** The buckets PRD §5.2 defines, in the order a person cares about them. */
const BUCKETS: [string, string, string][] = [
  ['AVAILABLE', 'Available to spend', 'text-emerald-300'],
  ['LOCKED', 'Locked in escrow', 'text-amber-300'],
  ['BONDED', 'Bonded against orders', 'text-sky-300'],
  ['PENDING', 'Pending confirmation', 'text-slate-300'],
]

export function WalletHome() {
  const q = useWalletSummary()
  const activity = useActivity()
  if (q.isLoading) return <Skeleton className="h-40 rounded-3xl" />
  if (q.error) return <p className="text-rose-500 font-bold p-4">{q.error.message}</p>
  const d = q.data!

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-2">
      {/* Top Header with Back to Dashboard / Previous Page */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/customer/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              My Wallet Vault
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Ledger & Escrow Assets</p>
          </div>
        </div>

        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          {d.network}
        </span>
      </div>

      {/* Main Balance Card. No total and no rupee estimate: adding buckets
          together, or multiplying by a rate, would be money arithmetic in a
          JavaScript number (PRD §5.1). The ledger states each bucket. */}
      <div className="rounded-[28px] bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950 text-white p-5 sm:p-6 shadow-xl border border-emerald-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div>
            <span className="text-xs text-slate-400 font-medium">Available to Spend</span>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight mt-0.5 break-all">
              {usdt2dp(d.balances.AVAILABLE)} <span className="text-base">USDT</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
            {BUCKETS.slice(1).map(([key, label, tone]) => (
              <div key={key}>
                <span className="text-[10px] text-slate-400 block uppercase">{label}</span>
                <span className={cn('font-mono font-bold break-all', tone)}>
                  {usdt2dp(d.balances[key])} USDT
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3 Wallet Quick Actions */}
      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
        {[
          { label: 'Deposit', to: '/customer/wallet/deposit', icon: '↓', bg: 'bg-[#22c55e] text-white' },
          { label: 'Withdraw', to: '/customer/wallet/withdraw', icon: '↑', bg: 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' },
          { label: 'Receive', to: '/customer/wallet/receive', icon: '↙', bg: 'bg-purple-600 text-white' },
        ].map((btn) => (
          <Link
            key={btn.label}
            to={btn.to}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm group-hover:scale-105 active:scale-95 transition-all', btn.bg)}>
              {btn.icon}
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              {btn.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
            Recent Ledger History
          </h3>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {(activity.data ?? []).slice(0, 5).map((row) => (
            <div
              key={row.id}
              className="py-2.5 flex items-center justify-between rounded-xl px-1.5"
            >
              <div>
                <span className="text-xs font-black text-slate-900 dark:text-white block">
                  {row.kind}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(row.at).toLocaleDateString()}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs font-black font-mono text-slate-900 dark:text-white block break-all">
                  {row.direction === 'DEBIT' ? '−' : '+'}
                  {usdt2dp(row.amount)} {row.assetSymbol}
                </span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {row.bucket}
                </span>
              </div>
            </div>
          ))}
          {activity.data?.length === 0 && (
            <p className="py-3 text-xs text-slate-400">Nothing has moved yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Depositing (PRD §8.2).
 *
 * There is nothing to submit. The address is derived once and kept, the
 * person sends USDT to it on chain, and the watcher credits the ledger after
 * fifteen confirmations. The prototype's amount step and its two
 * simulate-the-chain buttons have no v1 route behind them, and a button that
 * conjures a balance is the one thing a wallet must never have.
 */
export function DepositFlow() {
  return <AddressScreen title="Add Money" />
}

/** `GET /v1/wallet/address`. */
interface WalletAddress {
  address: string
  network: string
}

/**
 * Deposit and Receive are the same thing: the one address the ledger knows
 * this person by. It is read from `/wallet/address` and nothing else; there is
 * no fallback, because money sent to an invented address is gone.
 *
 * The ledger posts a deposit only once, at fifteen confirmations, so the
 * activity feed has no half-way row. The deposits already in the feed when the
 * screen opens are a baseline and never count: the screen says it is waiting
 * until a deposit row that was not in that baseline arrives on a later poll,
 * and only then says it was credited.
 */
function AddressScreen({ title }: { title: string }) {
  const q = useQuery({
    queryKey: ['wallet', 'address'],
    queryFn: () => v1<WalletAddress>('/wallet/address'),
    retry: false,
  })
  const activity = useQuery({
    queryKey: ['wallet', 'activity'],
    queryFn: () => v1<ActivityRow[]>('/wallet/activity'),
    retry: false,
    refetchInterval: 10_000,
  })
  const [copied, setCopied] = useState(false)

  const copy = async (address: string) => {
    await navigator.clipboard?.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const isDeposit = (r: ActivityRow) =>
    r.kind === 'DEPOSIT' && r.direction === 'CREDIT' && r.bucket === 'AVAILABLE'
  // Captured once, from the first successful response.
  const baseline = useRef<Set<string> | null>(null)
  if (baseline.current === null && activity.data) {
    baseline.current = new Set(activity.data.filter(isDeposit).map((r) => r.id))
  }
  const credited = activity.data?.find(
    (r) => isDeposit(r) && baseline.current !== null && !baseline.current.has(r.id),
  )

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-4 w-full overflow-x-hidden min-w-0">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <BackButton fallback="/customer/wallet" />
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>
        </div>

        {q.data && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{q.data.network}</span>
          </div>
        )}
      </div>

      {q.isLoading && <Skeleton className="h-56 rounded-3xl" />}

      {q.error && (
        <p className="text-rose-500 font-bold p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-sm">
          {q.error.message}
        </p>
      )}

      {q.data && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-[1.5px] rounded-[28px] bg-gradient-to-br from-[#3b59f8] via-[#10b981] to-[#3b59f8] shadow-lg shadow-blue-500/10">
            <div className="rounded-[26px] bg-white dark:bg-[#121829] p-4.5 space-y-4 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <QrCode className="h-7 w-7 text-slate-700 dark:text-slate-200" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Your {q.data.network} deposit address
                </span>
                <p className="mt-2 font-mono text-xs sm:text-sm break-all text-slate-900 dark:text-white">
                  {q.data.address}
                </p>
              </div>

              <Button
                type="button"
                onClick={() => void copy(q.data.address)}
                className="w-full h-11 rounded-full font-bold text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900"
              >
                {copied ? (
                  <span className="flex items-center gap-2 justify-center">
                    <Check className="h-4 w-4" /> Copied
                  </span>
                ) : (
                  <span className="flex items-center gap-2 justify-center">
                    <Copy className="h-4 w-4" /> Copy address
                  </span>
                )}
              </Button>
            </div>
          </div>

          <div
            role="status"
            data-testid="deposit-status"
            className="rounded-2xl border border-slate-100 dark:border-slate-800 p-3 text-xs flex items-start gap-2"
          >
            {credited ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-200">
                  Deposit credited: {usdt2dp(credited.amount)} USDT
                </span>
              </>
            ) : (
              <>
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="text-slate-600 dark:text-slate-300">
                  Waiting for your deposit. It is credited after fifteen
                  confirmations.
                </span>
              </>
            )}
          </div>

          <div className="rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-4 space-y-2 shadow-xs">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">
              Before you send
            </h3>
            <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 list-disc pl-4">
              <li>Send USDT on {q.data.network} only. Anything else is lost.</li>
              <li>
                Your balance moves after fifteen confirmations, not when the
                transaction is broadcast.
              </li>
              <li>The address is yours and does not change. Reuse it.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Withdrawing (PRD §8.4).
 *
 * Three conditions, all of them the server's: the address is on the
 * allowlist, its cooldown has elapsed, and a *fresh* authenticator code rides
 * on this request — the session is never sufficient. None of them is checked
 * here. This screen collects what the server needs and shows, word for word,
 * whichever refusal comes back; a second copy of the rules in the browser is
 * a second thing to keep in step, and the browser's copy cannot be trusted
 * anyway.
 */
export function WithdrawFlow() {
  const qc = useQueryClient()
  const summary = useWalletSummary()
  const allowlist = useQuery({
    queryKey: ['wallet', 'allowlist'],
    queryFn: () =>
      v1<{ address: string; label: string | null; usableAt: string }[]>(
        '/wallet/allowlist',
      ),
    retry: false,
  })

  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [code, setCode] = useState('')
  const [receipt, setReceipt] = useState<{ id: string } | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const row = await v1<{ id: string }>('/wallet/withdrawals', {
        method: 'POST',
        // A retry of this request must not become a second withdrawal
        // (PRD §5 rule 2).
        idempotencyKey: newIdempotencyKey(),
        body: JSON.stringify({ address, amount, code }),
      })
      setReceipt(row)
      await qc.invalidateQueries({ queryKey: ['wallet'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That withdrawal was refused.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/customer/wallet" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Withdraw USDT
            </h1>
            <p className="text-[11px] text-slate-500">
              To an allowlisted address, on {summary.data?.network ?? 'chain'}
            </p>
          </div>
        </div>
      </div>

      {receipt ? (
        <div className="rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-5 space-y-3 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            Withdrawal requested
          </p>
          <p className="text-[11px] text-slate-500 font-mono break-all">{receipt.id}</p>
          <p className="text-[11px] text-slate-500">
            It is paid out by the payout job, and appears in your activity when
            the chain confirms it.
          </p>
          <Link to="/customer/wallet">
            <Button className="w-full h-11 rounded-full font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900">
              Back to wallet
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3.5">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-3 shadow-2xs">
            <div className="space-y-1.5">
              <label
                htmlFor="withdraw-address"
                className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block"
              >
                Destination address
              </label>
              <Input
                id="withdraw-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                placeholder="0x..."
                className="h-11 rounded-xl font-mono text-xs"
              />
              {allowlist.data && allowlist.data.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {allowlist.data.map((a) => (
                    <button
                      key={a.address}
                      type="button"
                      onClick={() => setAddress(a.address)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono hover:bg-indigo-500/20 transition cursor-pointer"
                    >
                      {a.label ?? `${a.address.slice(0, 10)}…`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="withdraw-amount"
                className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block"
              >
                Amount (USDT)
              </label>
              <Input
                id="withdraw-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                inputMode="decimal"
                placeholder="0.00"
                className="h-11 rounded-xl font-mono"
              />
              {summary.data && (
                <p className="text-[10px] text-slate-400 font-mono break-all">
                  Available: {summary.data.balances.AVAILABLE} USDT
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="withdraw-code"
                className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block"
              >
                Authenticator code
              </label>
              <Input
                id="withdraw-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                inputMode="numeric"
                placeholder="000000"
                className="h-11 rounded-xl font-mono tracking-widest"
              />
              <p className="text-[10px] text-slate-400">
                A fresh code, on this withdrawal. Being signed in is not enough.
              </p>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-500 font-medium bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-full font-semibold text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-lg"
          >
            {submitting ? 'Requesting...' : 'Request withdrawal'}
          </Button>
        </form>
      )}
    </div>
  )
}

/**
 * v1 has no route that sends USDT between two accounts on this platform.
 * PRD §3 lists it as a goal, so the screen stays and says where it is rather
 * than quietly becoming a withdrawal, which moves money somewhere else
 * entirely.
 */
export function SendFlow() {
  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <BackButton fallback="/customer/wallet" />
        <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
          Send USDT
        </h1>
      </div>
      <div className="rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-5 space-y-3 text-center shadow-xs">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Sending to another account on this platform is not part of this
          release.
        </p>
        <ParkedAction
          label="Send USDT"
          className="w-full h-11 rounded-full font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900"
          labelClassName=""
        />
      </div>
    </div>
  )
}

export function ReceiveFlow() {
  return <AddressScreen title="Receive USDT" />
}

export function AddressesFlow() {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const addresses = [
    { id: 'addr-1', label: 'Primary TRC20 Vault', network: 'TRC20 (Tron)', address: 'TLvM8vPq7uN9eX2xK92bA8m1pQ4rT9vW', isDefault: true },
    { id: 'addr-2', label: 'Secondary BEP20 Vault', network: 'BEP20 (BNB)', address: '0x71C889e2F1d46788B2c99aF0394A723eF10', isDefault: false },
    { id: 'addr-3', label: 'Cold Storage Vault', network: 'ERC20 (ETH)', address: '0x992Bcd12E8a8b191c77F142A9e89d02E1B', isDefault: false },
  ]

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <BackButton fallback="/customer/wallet" />
        <div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            Whitelisted Addresses
          </h1>
          <p className="text-[11px] text-slate-500">Your verified crypto vault endpoints</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {addresses.map((a) => (
          <div
            key={a.id}
            className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-2 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 dark:text-white">{a.label}</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {a.network}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all flex items-center justify-between">
              <span>{a.address}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(a.address)
                  setCopiedId(a.id)
                  setTimeout(() => setCopiedId(null), 2000)
                }}
                className="ml-2 text-xs font-bold text-emerald-600 hover:underline shrink-0 cursor-pointer"
              >
                {copiedId === a.id ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** `POST /v1/p2p/quotes`. The snapshot an order settles against (PRD §7). */
interface Quote {
  id: string
  side: 'BUY' | 'SELL'
  usdtAmount: string
  inrAmount: string
  customerRate: string
  platformFeeUsdt: string
  expiresAt: string
}

/**
 * Buying and selling (PRD §6.2, §7).
 *
 * The customer types one side and the server solves for the other. Nothing
 * here multiplies an amount by a rate: the snapshot the server returned *is*
 * the price, and a figure this screen worked out would be a second answer to
 * a question already answered — one that would disagree the moment rounding
 * differed.
 */
export function QuoteFlow({ side }: { side: 'BUY' | 'SELL' | 'CONVERT' }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (side === 'CONVERT') {
    return (
      <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <BackButton fallback="/customer/dashboard" />
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            Convert
          </h1>
        </div>
        <p className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          v1 settles USDT against rupees only. Use Buy or Sell.
        </p>
      </div>
    )
  }

  const priced = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      // The side the customer typed is the authoritative one (PRD §6.2).
      setQuote(
        await v1<Quote>('/p2p/quotes', {
          method: 'POST',
          body: JSON.stringify({ side, usdtAmount: amount }),
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No price is available.')
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    if (!quote) return
    setError('')
    setBusy(true)
    try {
      const order = await v1<{ id: string }>('/p2p/orders', {
        method: 'POST',
        idempotencyKey: newIdempotencyKey(),
        body: JSON.stringify({ quoteId: quote.id }),
      })
      await qc.invalidateQueries({ queryKey: ['wallet'] })
      await qc.invalidateQueries({ queryKey: ['orders'] })
      navigate(`/customer/orders/${order.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That order was refused.')
      // The quote is spent either way; a second confirm would only repeat it.
      setQuote(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <BackButton fallback="/customer/dashboard" />
        <div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            {side === 'BUY' ? 'Buy USDT' : 'Sell USDT'}
          </h1>
          <p className="text-[11px] text-slate-500">
            {side === 'BUY'
              ? 'You pay rupees to a merchant bank account'
              : 'A merchant pays rupees to your bank account'}
          </p>
        </div>
      </div>

      <form onSubmit={priced} className="space-y-3.5">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-2 shadow-2xs">
          <label
            htmlFor="quote-amount"
            className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block"
          >
            Amount (USDT)
          </label>
          <Input
            id="quote-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            inputMode="decimal"
            placeholder="0.00"
            className="h-11 rounded-xl font-mono"
          />
        </div>

        <Button
          type="submit"
          disabled={busy}
          className="w-full h-11 rounded-full font-semibold text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900"
        >
          {busy && !quote ? 'Pricing...' : 'Get a price'}
        </Button>
      </form>

      {quote && (
        <div className="rounded-[28px] bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950 text-white p-5 space-y-3 shadow-xl border border-emerald-500/30">
          <span className="text-xs text-slate-400 font-medium">
            This price, locked until {new Date(quote.expiresAt).toLocaleTimeString()}
          </span>

          <dl className="space-y-2 text-sm">
            {[
              ['You ' + (side === 'BUY' ? 'receive' : 'send'), `${quote.usdtAmount} USDT`],
              ['You ' + (side === 'BUY' ? 'pay' : 'receive'), `₹${quote.inrAmount}`],
              ['Rate', `₹${quote.customerRate} per USDT`],
              ['Platform fee', `${quote.platformFeeUsdt} USDT`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-slate-400">{label}</dt>
                <dd className="font-mono font-bold text-right break-all">{value}</dd>
              </div>
            ))}
          </dl>

          <Button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className="w-full h-11 rounded-full font-semibold text-sm bg-emerald-500 text-white"
          >
            {busy ? 'Confirming...' : 'Confirm at this price'}
          </Button>
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-500 font-medium bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
          {error}
        </p>
      )}
    </div>
  )
}

export function TransactionsFlow() {
  const q = useActivity()
  const [filterType, setFilterType] = useState('ALL')

  // The prototype padded this list with BILL_PAY, GIFT_CARD and RECHARGE rows
  // it invented in the browser — categories PRD §3 removed from v1 entirely.
  const rows = q.data ?? []
  const filtered =
    filterType === 'ALL' ? rows : rows.filter((r) => r.kind === filterType)

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/customer/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Transactions
            </h1>
            <p className="text-[11px] text-slate-500">All ledger orders & escrow activity</p>
          </div>
        </div>

        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {filtered.length} Records
        </span>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {['ALL', 'DEPOSIT', 'WITHDRAWAL', 'ESCROW', 'SETTLEMENT', 'DISPUTE'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilterType(tab)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer',
              filterType === tab
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
            )}
          >
            {tab === 'ALL' ? 'All Transactions' : tab}
          </button>
        ))}
      </div>

      {/* Transaction List Cards */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            No transactions found for this category.
          </div>
        ) : (
          filtered.map((item) => {
            const isPositive = item.direction === 'CREDIT'

            return (
              <Link
                key={item.id}
                to={`/customer/transactions/${item.id}`}
                className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0',
                      isPositive
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {isPositive ? '↓' : '↑'}
                  </div>

                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white block group-hover:text-emerald-500 transition-colors truncate">
                      {item.kind.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {new Date(item.at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={cn(
                      'text-xs font-black font-mono block',
                      isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                    )}
                  >
                    {isPositive ? '+' : '−'}{item.amount} {item.assetSymbol}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {item.bucket}
                  </span>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}

export function TransactionDetailFlow() {
  const { transactionId } = useParams()
  const q = useActivity()
  const row = q.data?.find((r) => r.id === transactionId)

  if (q.isLoading) return <Skeleton className="h-40 rounded-3xl" />
  if (q.error) return <p className="text-rose-500 font-bold p-4">{q.error.message}</p>
  if (!row) {
    return (
      <div className="space-y-4 max-w-lg mx-auto w-full pb-2">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <BackButton fallback="/customer/transactions" />
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            Transaction
          </h1>
        </div>
        <p className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          No entry with that id is yours.
        </p>
      </div>
    )
  }
  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-6">
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <Link
          to="/customer/transactions"
          className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-black text-slate-900 dark:text-white">Transaction Details</h1>
      </div>

      <div className="rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-5 space-y-4 text-center shadow-xs">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xl mx-auto">
          ✓
        </div>

        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
            {row.bucket}
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono break-all">
            {row.direction === 'DEBIT' ? '−' : '+'}
            {row.amount} {row.assetSymbol}
          </h2>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-left text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Transaction ID:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 break-all">{transactionId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Type:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{row.kind}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Timestamp:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">{new Date(row.at).toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500 shrink-0">Journal memo:</span>
            <span className="text-right text-slate-700 dark:text-slate-300 break-all">{row.memo}</span>
          </div>
        </div>

        <Link
          to="/customer/transactions"
          className="block w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
        >
          Back to Transactions
        </Link>
      </div>
    </div>
  )
}
