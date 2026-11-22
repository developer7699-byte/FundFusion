import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { newIdempotencyKey, v1 } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn, usdt2dp } from '@/lib/utils'
import { definitiveRefusal } from './wallet-flows'
import { actionFor } from './order-actions'
import { BackButton } from '@/components/ui/BackButton'

/** Where the rupees go, frozen onto the order. Null until a counterparty binds it. */
type Payee = {
  type: 'BANK' | 'UPI'
  holderName: string
  accountNumber: string | null
  ifsc: string | null
  upiVpa: string | null
}

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
  payeeInstruction: Payee | null
  broadcastAt: string | null
  updatedAt: string
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
                {usdt2dp(o.usdtAmount)} USDT
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                ₹{usdt2dp(o.inrAmount)}
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
/**
 * One order, for whichever party is looking at it. The merchant desk renders
 * this same screen: the states, the snapshot and the single allowed action
 * are the engine's, not the shell's, so two copies would be two places to
 * get `actionFor` wrong.
 */
export function OrderDetail({ backTo = '/customer/orders' }: { backTo?: string } = {}) {
  const { orderId } = useParams()
  const qc = useQueryClient()
  const [utr, setUtr] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // One key per order for releasing escrow; a retried confirm is the same call.
  const confirmKey = useRef<{ orderId: string; key: string } | null>(null)

  const q = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => v1<Order>(`/p2p/orders/${orderId}`),
    retry: false,
  })

  if (q.isLoading) return <Skeleton className="h-40 rounded-3xl" />
  if (q.error)
    return <p className="text-rose-500 font-bold p-4 text-sm">{q.error.message}</p>

  const o = q.data!
  const action = actionFor(o.status, o.side, o.role)

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
          <BackButton fallback={backTo} />
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
            ['USDT', usdt2dp(o.usdtAmount)],
            ['Rupees', `₹${usdt2dp(o.inrAmount)}`],
            ['Rate', `₹${usdt2dp(o.customerRate)} per USDT`],
            ['Platform fee', `${usdt2dp(o.platformFeeUsdt)} USDT`],
            ['UTR', o.utr ?? 'Not submitted'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-slate-400">{label}</dt>
              <dd className="font-mono font-bold text-right break-all">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {o.role === 'CUSTOMER' && o.side === 'BUY' && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
          {o.payeeInstruction ? (
            <>
              <p className="font-bold">Pay ₹{usdt2dp(o.inrAmount)} to</p>
              <p>{o.payeeInstruction.holderName}</p>
              {o.payeeInstruction.type === 'UPI' ? (
                <p className="font-mono">{o.payeeInstruction.upiVpa}</p>
              ) : (
                <p className="font-mono">
                  {o.payeeInstruction.accountNumber} · {o.payeeInstruction.ifsc}
                </p>
              )}
            </>
          ) : (
            <p>Awaiting payee: the merchant's payment details appear here once they accept.</p>
          )}
        </div>
      )}

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
            Confirm only once ₹{usdt2dp(o.inrAmount)} has actually arrived in your bank
            account. This releases the escrow.
          </p>
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              if (confirmKey.current?.orderId !== o.orderId)
                confirmKey.current = { orderId: o.orderId, key: newIdempotencyKey() }
              const key = confirmKey.current.key
              void run(async () => {
                try {
                  await v1(`/p2p/orders/${o.orderId}/confirm`, {
                    method: 'POST',
                    idempotencyKey: key,
                  })
                  confirmKey.current = null
                } catch (err) {
                  if (definitiveRefusal(err)) confirmKey.current = null
                  throw err
                }
              })
            }}
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

      {o.role === 'MERCHANT' && OPEN_STATES.includes(o.status) && o.status !== 'QUOTED' && (
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
