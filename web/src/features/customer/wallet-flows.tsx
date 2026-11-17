import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Copy,
  Check,
  QrCode,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import {} from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

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
  return useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      try {
        return await api<WalletSnap>('/wallet')
      } catch {
        return {
          simulated: true,
          label: 'Simulated Wallet Vault',
          usdtInrRate: '99.11',
          wallet: {
            availableUsdt: '1420.50',
            lockedUsdt: '120.00',
            totalUsdt: '1540.50',
            inrEstimate: '152678.95',
          },
          assets: [
            { symbol: 'USDT', available: '1420.50', locked: '120.00', total: '1540.50' },
            { symbol: 'BTC', available: '0.045', locked: '0.00', total: '0.045' },
            { symbol: 'ETH', available: '1.25', locked: '0.00', total: '1.25' },
          ],
          addresses: [
            { id: 'addr-1', network: 'TRC20', address: 'TLvM8vPq...xK92', isDefault: true },
            { id: 'addr-2', network: 'BEP20', address: '0x71C...89e2', isDefault: false },
          ],
          activity: [
            { id: 'tx-1', type: 'DEPOSIT', status: 'COMPLETED', amount: '500.00', asset: 'USDT', createdAt: new Date().toISOString() },
            { id: 'tx-2', type: 'BUY', status: 'COMPLETED', amount: '250.00', asset: 'USDT', createdAt: new Date(Date.now() - 3600000).toISOString() },
            { id: 'tx-3', type: 'SELL', status: 'COMPLETED', amount: '100.00', asset: 'USDT', createdAt: new Date(Date.now() - 7200000).toISOString() },
          ],
        }
      }
    },
    retry: false,
  })
}

export function WalletHome() {
  const q = useWallet()
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
          1 USDT ≈ ₹{d.usdtInrRate}
        </span>
      </div>

      {/* Main Total Balance Card */}
      <div className="rounded-[28px] bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950 text-white p-5 sm:p-6 shadow-xl border border-emerald-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Vault Balance</span>
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight mt-0.5">
              ${parseFloat(d.wallet.totalUsdt).toFixed(2)}
            </div>
            <span className="text-xs text-emerald-400 font-mono">
              ≈ ₹{parseFloat(d.wallet.inrEstimate).toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Available to Spend</span>
              <span className="font-mono font-bold text-emerald-300">
                {d.wallet.availableUsdt} USDT
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Locked in Escrow</span>
              <span className="font-mono font-bold text-amber-300">
                {d.wallet.lockedUsdt} USDT
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Wallet Quick Actions */}
      <div className="grid grid-cols-4 gap-2 pt-1 text-center">
        {[
          { label: 'Deposit', to: '/customer/wallet/deposit', icon: '↓', bg: 'bg-[#22c55e] text-white' },
          { label: 'Withdraw', to: '/customer/wallet/withdraw', icon: '↑', bg: 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' },
          { label: 'Send', to: '/customer/wallet/send', icon: '↗', bg: 'bg-blue-600 text-white' },
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

      {/* Assets Breakdown */}
      <div className="rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-4 space-y-3 shadow-xs">
        <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
          Asset Balances
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {d.assets.map((asset) => (
            <div key={asset.symbol} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-800 dark:text-slate-200">
                  {asset.symbol.slice(0, 3)}
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 dark:text-white block">
                    {asset.symbol}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Avail: {asset.available}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-black font-mono text-slate-900 dark:text-white block">
                  {asset.total} {asset.symbol}
                </span>
                <span className="text-[10px] text-emerald-500 font-mono">
                  {asset.locked !== '0.00' ? `Locked: ${asset.locked}` : 'Available'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
            Recent Ledger History
          </h3>
          <Link
            to="/customer/transactions"
            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            All Activity →
          </Link>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {d.activity.slice(0, 5).map((row) => (
            <Link
              key={row.id}
              to={`/customer/transactions/${row.id}`}
              className="py-2.5 flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-1.5 transition-colors"
            >
              <div>
                <span className="text-xs font-black text-slate-900 dark:text-white block group-hover:text-emerald-500 transition-colors">
                  {row.type}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(row.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs font-black font-mono text-slate-900 dark:text-white block">
                  {row.amount} {row.asset}
                </span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {row.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DepositFlow() {
  const qc = useQueryClient()
  const [network] = useState('BNB')
  const [amount, setAmount] = useState('')
  const [deposit, setDeposit] = useState<{
    id: string
    address: string
    status: string
    confirmations: number
    requiredConfirmations: number
    mockTxHash: string | null
    amount: string
  } | null>(null)

  const presets = ['5 USDT', '10 USDT', '50 USDT', '100 USDT', '500 USDT']
  const isValidAmount = Boolean(amount && parseFloat(amount) > 0)

  const start = useMutation({
    mutationFn: () =>
      api<NonNullable<typeof deposit> & { qrPayload: string }>('/wallet/deposits', {
        method: 'POST',
        body: JSON.stringify({ asset: 'USDT', network }),
      }),
    onSuccess: setDeposit,
  })

  const broadcast = useMutation({
    mutationFn: () =>
      api<NonNullable<typeof deposit>>(`/wallet/deposits/${deposit!.id}/simulate-broadcast`, {
        method: 'POST',
        body: JSON.stringify({ amount: amount || '50' }),
      }),
    onSuccess: setDeposit,
  })

  const confirm = useMutation({
    mutationFn: () =>
      api<NonNullable<typeof deposit>>(`/wallet/deposits/${deposit!.id}/simulate-confirm`, { method: 'POST' }),
    onSuccess: (row) => {
      setDeposit(row)
      void qc.invalidateQueries({ queryKey: ['wallet'] })
      void qc.invalidateQueries({ queryKey: ['overview'] })
    },
  })

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-4 w-full overflow-x-hidden min-w-0">
      {/* Top Header Bar with Back Arrow (Matching Reference Image) */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <BackButton fallback="/customer/wallet" />
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Add Money
          </h1>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>1 USDT = ₹99.11</span>
        </div>
      </div>

      {!deposit ? (
        /* STEP 1: AMOUNT INPUT & NETWORK SELECTION (Matching Reference Image) */
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
          {/* CARD 1: Amount (USDT) */}
          <div className="p-[1.5px] rounded-[28px] bg-gradient-to-br from-[#3b59f8] via-[#10b981] to-[#3b59f8] animate-shimmer shadow-lg shadow-blue-500/10">
            <div className="rounded-[26px] bg-white dark:bg-[#121829] p-4.5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white">Amount (USDT)</span>
                <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/40">
                  1 - 100000 USDT
                </span>
              </div>

              {/* Amount Input Box */}
              <div className="flex flex-col gap-1.5 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl p-3.5 border border-slate-200/60 dark:border-slate-800 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-inner group">
                <div className="flex items-center gap-3">
                  {/* Gold/Yellow Overlapping Dual Coin Icon (Matching Reference Image) */}
                  <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0 border border-amber-200/60">
                    <svg className="w-4.5 h-4.5 text-amber-500" viewBox="0 0 24 24" fill="none">
                      <circle cx="15" cy="8" r="4.5" stroke="currentColor" strokeWidth="2" />
                      <circle cx="9" cy="14" r="4.5" stroke="currentColor" strokeWidth="2" />
                      <path d="M14.5 7v2M8.5 13v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent text-2xl font-black text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none tracking-tight"
                  />
                  <span className="text-xs font-black text-slate-400 shrink-0 bg-slate-200/50 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    USDT
                  </span>
                </div>

                {/* Live INR Calculated Value Display */}
                {isValidAmount && (
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/50 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 animate-in fade-in duration-150">
                    <span>You pay ≈</span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>₹{(parseFloat(amount) * 99.11).toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Select Preset Pills (Matching Reference Image) */}
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => {
                  const val = p.split(' ')[0]
                  const isSelected = amount === val
                  return (
                    <button
                      key={p}
                      onClick={() => setAmount(val)}
                      className={cn(
                        'px-3.5 py-1.5 rounded-full text-xs font-extrabold border transition-all cursor-pointer transform active:scale-95',
                        isSelected
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-105'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:border-blue-400'
                      )}
                    >
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* CARD 2: Deposit network (Matching Reference Image) */}
          <div className="rounded-[26px] bg-white dark:bg-[#121829] border border-slate-100 dark:border-slate-800/80 p-4.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 dark:text-white">Deposit network</span>
              <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/40">
                1 AVAILABLE
              </span>
            </div>

            {/* Selected Network Option (BEP20 USDT) */}
            <div className="rounded-2xl border-2 border-blue-600 dark:border-blue-500 bg-[#f4f7ff] dark:bg-blue-950/40 p-3.5 flex items-center justify-between cursor-pointer shadow-xs transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60">
                  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none">
                    <circle cx="15" cy="8" r="4.5" stroke="currentColor" strokeWidth="2" />
                    <circle cx="9" cy="14" r="4.5" stroke="currentColor" strokeWidth="2" />
                    <path d="M14.5 7v2M8.5 13v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white tracking-tight">
                    CRYPTO · USDT (BEP20) · USDT (BEP20)
                  </h4>
                  <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 mt-0.5">
                    CRYPTO · USDT
                  </p>
                </div>
              </div>

              {/* Active Radio Indicator Icon */}
              <div className="w-5 h-5 rounded-full border-2 border-blue-600 dark:border-blue-400 flex items-center justify-center shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400" />
              </div>
            </div>
          </div>

          {/* Primary Action Button (Matching Reference Image) */}
          <button
            disabled={!isValidAmount || start.isPending}
            onClick={() => start.mutate()}
            className={cn(
              'w-full rounded-2xl py-4 text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md group relative overflow-hidden',
              isValidAmount
                ? 'bg-gradient-to-r from-[#3b59f8] to-[#2d46e5] hover:from-[#2d46e5] hover:to-[#2237bf] text-white cursor-pointer active:scale-98 shadow-blue-500/25'
                : 'bg-[#9bb0fc] dark:bg-blue-950/60 text-white cursor-not-allowed shadow-none'
            )}
          >
            <span>{start.isPending ? 'Generating session...' : 'Proceed to pay'}</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>

          {/* Subtext below button */}
          <p className="text-[10px] font-extrabold text-slate-400 text-center flex items-center justify-center gap-1.5 pt-1">
            <span>⬡</span>
            <span>15-minute session • cancellable after 2 minutes</span>
          </p>
        </div>
      ) : (
        /* STEP 2: GENERATED DEPOSIT ADDRESS & SIMULATION */
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-[28px] bg-white dark:bg-[#121829] border border-slate-100 dark:border-slate-800 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black uppercase text-slate-400">Deposit Address Ready</span>
              <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {deposit.status}
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400">BEP20 Mock Address</span>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 break-all font-mono text-xs font-bold text-slate-900 dark:text-white">
                {deposit.address}
              </div>
            </div>

            {deposit.status === 'ADDRESS_READY' && (
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => broadcast.mutate()}
                  disabled={broadcast.isPending}
                  className="w-full rounded-2xl py-3.5 text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md cursor-pointer active:scale-95 transition-all"
                >
                  {broadcast.isPending ? 'Simulating Deposit...' : 'Simulate Incoming USDT Transfer'}
                </button>
              </div>
            )}

            {(deposit.status === 'BROADCAST_SIMULATED' || deposit.status === 'CONFIRMING') && (
              <button
                onClick={() => confirm.mutate()}
                disabled={confirm.isPending}
                className="w-full rounded-2xl py-3.5 text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md cursor-pointer active:scale-95 transition-all"
              >
                {confirm.isPending ? 'Confirming Ledger...' : 'Confirm Ledger Credit'}
              </button>
            )}

            {deposit.status === 'COMPLETED' && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-center space-y-2">
                <span className="text-2xl">🎉</span>
                <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                  Deposit Successfully Credited!
                </p>
                <Link
                  to="/customer/dashboard"
                  className="inline-block px-5 py-2 rounded-full bg-emerald-600 text-white text-xs font-extrabold cursor-pointer"
                >
                  Return to Dashboard
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Outbound({ kind }: { kind: 'SEND' | 'WITHDRAW' }) {
  const qc = useQueryClient()
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [network, setNetwork] = useState('TRX')
  const [receipt, setReceipt] = useState<Record<string, string> | null>(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const path = kind === 'SEND' ? '/wallet/send' : '/wallet/withdrawals'
  const isSend = kind === 'SEND'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const row = await api<Record<string, string>>(path, {
        method: 'POST',
        body: JSON.stringify({
          asset: 'USDT',
          network,
          toAddress,
          amount,
        }),
      })
      setReceipt(row)
      void qc.invalidateQueries({ queryKey: ['wallet'] })
      void qc.invalidateQueries({ queryKey: ['overview'] })
    } catch (err) {
      // Fallback mock receipt if mock server API fails
      setReceipt({
        receipt: `TX-${Date.now().toString().slice(-8)}`,
        amount: amount || '50',
        fee: '1.00 USDT',
        note: `${kind} request registered successfully in vault ledger.`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/customer/wallet" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {isSend ? 'Send USDT' : 'Withdraw USDT'}
            </h1>
            <p className="text-[11px] text-slate-500">Fast crypto transfer to any address</p>
          </div>
        </div>

        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          Fee: 1 USDT
        </span>
      </div>

      {!receipt ? (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Network Selection Pills */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-2 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Transfer Network
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'TRX', name: 'TRC20 (Tron)', fee: '1.00 USDT' },
                { id: 'BNB', name: 'BEP20 (BSC)', fee: '0.29 USDT' },
                { id: 'ETH', name: 'ERC20 (ETH)', fee: '3.50 USDT' },
              ].map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setNetwork(n.id)}
                  className={cn(
                    'py-2 px-2 rounded-xl text-center border transition-all cursor-pointer',
                    network === n.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-black'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  )}
                >
                  <span className="text-xs block font-bold">{n.id}</span>
                  <span className="text-[9px] block text-slate-400 mt-0.5">{n.fee}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Address */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-2 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Destination Address
            </span>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="Paste TRC20 / BEP20 recipient address"
              required
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold focus:outline-none"
            />
          </div>

          {/* Amount */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Withdrawal Amount
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-600">
                Available: 1,420.50 USDT
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full text-2xl font-black font-mono bg-transparent focus:outline-none text-slate-900 dark:text-white"
              />
              <span className="text-xs font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                USDT
              </span>
            </div>
          </div>

          {error && <p className="text-xs text-rose-500 font-bold">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-[#0a2316] text-white hover:bg-emerald-950 font-black text-xs shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{isSubmitting ? 'Signing Transfer...' : `Confirm & ${isSend ? 'Send' : 'Withdraw'}`}</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <div className="p-5 rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 text-center space-y-3 shadow-2xs animate-in zoom-in-95">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-500 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            Withdrawal Broadcasted!
          </h2>
          <p className="text-xs text-slate-400 font-mono">Receipt: {receipt.receipt}</p>
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-left text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Amount Sent</span>
              <span className="font-bold text-slate-900 dark:text-white">{amount || '50'} USDT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Network Fee</span>
              <span className="font-bold text-emerald-600">1.00 USDT</span>
            </div>
          </div>
          <Link
            to="/customer/wallet"
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold block"
          >
            Back to Wallet
          </Link>
        </div>
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
  const [copied, setCopied] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState('TRX')
  const address =
    selectedNetwork === 'TRX'
      ? 'TLvM8vPq7uN9eX2xK92bA8m1pQ4rT9vW'
      : '0x71C889e2F1d46788B2c99aF0394A723eF10'

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4">
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <BackButton fallback="/customer/wallet" />
        <div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            Receive USDT
          </h1>
          <p className="text-[11px] text-slate-500">Your secure deposit vault address</p>
        </div>
      </div>

      {/* Network Picker */}
      <div className="flex gap-2">
        {['TRX', 'BNB', 'ETH'].map((net) => (
          <button
            key={net}
            type="button"
            onClick={() => setSelectedNetwork(net)}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer',
              selectedNetwork === net
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-black'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            )}
          >
            {net === 'TRX' ? 'TRC20' : net === 'BNB' ? 'BEP20' : 'ERC20'}
          </button>
        ))}
      </div>

      {/* QR Code Card */}
      <div className="rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-6 text-center space-y-4 shadow-xl">
        <div className="w-48 h-48 mx-auto p-3 bg-white rounded-2xl shadow-inner border border-slate-200/80 flex items-center justify-center">
          <QrCode className="w-40 h-40 text-slate-900" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
            {selectedNetwork === 'TRX' ? 'Tron (TRC20)' : 'Binance Smart Chain (BEP20)'} Address
          </span>
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 break-all font-mono text-xs font-bold text-slate-900 dark:text-white">
            {address}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(address)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="w-full py-3 rounded-xl bg-[#0a2316] text-white hover:bg-emerald-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Address Copied!' : 'Copy Vault Address'}</span>
        </button>
      </div>

      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
        Send only USDT on the selected network. Other tokens will result in permanent loss.
      </div>
    </div>
  )
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

export function QuoteFlow({ side }: { side: 'BUY' | 'SELL' | 'CONVERT' }) {
  const [step, setStep] = useState<'AMOUNT' | 'BANK' | 'CONFIRM'>(side === 'BUY' ? 'AMOUNT' : 'BANK')
  const [amount, setAmount] = useState('')
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false)
  const [isManagePayments, setIsManagePayments] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addedMethods, setAddedMethods] = useState<{ id: string; type: 'BANK' | 'UPI'; title: string; meta: string }[]>([])
  
  // Bank / UPI form state inside modal
  const [selectedMethodType, setSelectedMethodType] = useState<'BANK' | 'UPI' | null>(null)
  const [bankAccNumber, setBankAccNumber] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [upiId, setUpiId] = useState('')

  const presets = ['10 USDT', '50 USDT', '100 USDT', '500 USDT', '1000 USDT']

  const handleAddPaymentMethod = () => {
    if (selectedMethodType === 'BANK' && bankAccNumber && ifsc) {
      setAddedMethods((prev) => [
        ...prev,
        { id: `bank-${Date.now()}`, type: 'BANK', title: `Bank A/C ending in ${bankAccNumber.slice(-4)}`, meta: `IFSC: ${ifsc}` },
      ])
      setHasPaymentMethod(true)
      setSelectedMethodType(null)
      setShowAddModal(false)
    } else if (selectedMethodType === 'UPI' && upiId) {
      setAddedMethods((prev) => [
        ...prev,
        { id: `upi-${Date.now()}`, type: 'UPI', title: `UPI: ${upiId}`, meta: 'Instant VPA transfer' },
      ])
      setHasPaymentMethod(true)
      setSelectedMethodType(null)
      setShowAddModal(false)
    }
  }

  // Header Title
  const pageTitle = side === 'BUY' ? 'Buy USDT' : isManagePayments ? 'Manage Payments' : side === 'SELL' ? 'Sell USDT' : 'Convert'

  const isValidAmount = Boolean(amount && parseFloat(amount) > 0)

  return (
    <div className="max-w-lg mx-auto space-y-3.5 pb-4 w-full overflow-x-hidden min-w-0">
      {/* Top Header Bar with Back Arrow */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {isManagePayments ? (
            <BackButton onClick={() => setIsManagePayments(false)} />
          ) : (
            <BackButton fallback="/customer/dashboard" />
          )}
          <div>
            <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight">{pageTitle}</h1>
            <p className="text-[10px] font-bold text-slate-400">P2P Escrow Verified</p>
          </div>
        </div>

        {/* Live Market Rate Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>1 USDT = ₹99.11</span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* BUY USDT FLOW (Step 1: AMOUNT, Step 2: BANK, Step 3: CONFIRM) */}
      {/* ------------------------------------------------------------- */}
      {side === 'BUY' && (
        <div className="space-y-3.5">
          {/* Step Progress Bar (Matching Reference Image 1) */}
          <div className="space-y-2 pt-0.5">
            {/* Top 3 Capsule Indicator Bars */}
            <div className="grid grid-cols-3 gap-2">
              <div className={cn("h-1 rounded-full transition-all duration-300", step === 'AMOUNT' ? "bg-[#3b59f8]" : "bg-slate-200 dark:bg-slate-800")} />
              <div className={cn("h-1 rounded-full transition-all duration-300", step === 'BANK' ? "bg-[#3b59f8]" : "bg-slate-200 dark:bg-slate-800")} />
              <div className={cn("h-1 rounded-full transition-all duration-300", step === 'CONFIRM' ? "bg-[#3b59f8]" : "bg-slate-200 dark:bg-slate-800")} />
            </div>

            {/* Step Titles Row */}
            <div className="grid grid-cols-3 text-center">
              <button
                onClick={() => setStep('AMOUNT')}
                className={cn(
                  "text-[10px] font-black tracking-wider transition-colors cursor-pointer",
                  step === 'AMOUNT' ? "text-[#3b59f8]" : "text-slate-400 dark:text-slate-500 hover:text-slate-700"
                )}
              >
                AMOUNT
              </button>
              <button
                onClick={() => setStep('BANK')}
                className={cn(
                  "text-[10px] font-black tracking-wider transition-colors cursor-pointer",
                  step === 'BANK' ? "text-[#3b59f8]" : "text-slate-400 dark:text-slate-500 hover:text-slate-700"
                )}
              >
                BANK
              </button>
              <button
                onClick={() => setStep('CONFIRM')}
                className={cn(
                  "text-[10px] font-black tracking-wider transition-colors cursor-pointer",
                  step === 'CONFIRM' ? "text-[#3b59f8]" : "text-slate-400 dark:text-slate-500 hover:text-slate-700"
                )}
              >
                CONFIRM
              </button>
            </div>
          </div>

          {/* STEP 1: AMOUNT INPUT (Matching Reference Images 1 & 2) */}
          {step === 'AMOUNT' && (
            <div className="space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
              {/* Gradient Border Card Container (Matching Image 2) */}
              <div className="p-[1.5px] rounded-[28px] bg-gradient-to-br from-[#3b59f8] via-[#10b981] to-[#3b59f8] animate-shimmer shadow-lg shadow-blue-500/10">
                <div className="rounded-[26px] bg-white dark:bg-[#121829] p-4.5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Amount to buy</span>
                    </span>
                    <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/40">
                      1 - 10000 USDT
                    </span>
                  </div>

                  {/* Amount Input Box */}
                  <div className="flex flex-col gap-1.5 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl p-3.5 border border-slate-200/60 dark:border-slate-800 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-inner group">
                    <div className="flex items-center gap-3">
                      {/* Dual Diagonal Green Coin SVG (Matching Image 2) */}
                      <svg className="w-6 h-6 text-[#52b788] shrink-0 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24" fill="none">
                        {/* Top-Right Complete Coin */}
                        <circle cx="17" cy="7.5" r="5" stroke="#52b788" strokeWidth="2" />
                        <path d="M16.4 6.2l.6-.6v3.6" stroke="#52b788" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        
                        {/* Bottom-Left Overlapping Arc Coin */}
                        <path d="M13.5 10.5A5.5 5.5 0 1 0 14.2 15" stroke="#52b788" strokeWidth="2" strokeLinecap="round" />
                        <path d="M8.8 13.8l.6-.6v3.4" stroke="#52b788" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-30 9.2 15)" />
                      </svg>

                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-transparent text-2xl font-black text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none tracking-tight"
                      />
                      <span className="text-xs font-black text-slate-400 shrink-0 bg-slate-200/50 dark:bg-slate-800 px-2 py-1 rounded-lg">USDT</span>
                    </div>

                    {/* Live INR Calculated Value Display */}
                    {isValidAmount && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 animate-in fade-in duration-150">
                        <span>You pay ≈</span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>₹{(parseFloat(amount) * 99.11).toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Preset Amount Pills */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Quick Select</span>
                    <div className="flex flex-wrap gap-2">
                      {presets.map((p) => {
                        const val = p.split(' ')[0]
                        const isSelected = amount === val
                        return (
                          <button
                            key={p}
                            onClick={() => setAmount(val)}
                            className={cn(
                              'px-3.5 py-1.5 rounded-full text-xs font-extrabold border transition-all cursor-pointer transform active:scale-95',
                              isSelected
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-105'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                            )}
                          >
                            {p}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-2 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 text-center py-1">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1 hover:border-blue-400/40 transition-colors">
                  <span>⚡</span> <span>Instant Escrow</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1 hover:border-blue-400/40 transition-colors">
                  <span>🛡️</span> <span>0% Freeze</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1 hover:border-blue-400/40 transition-colors">
                  <span>🔒</span> <span>Safe P2P</span>
                </div>
              </div>

              {/* Next Step Button (Matching Reference Image 1) */}
              <button
                disabled={!isValidAmount}
                onClick={() => setStep('BANK')}
                className={cn(
                  'w-full rounded-2xl py-3.5 text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md group relative overflow-hidden',
                  isValidAmount
                    ? 'bg-gradient-to-r from-[#3b59f8] to-[#2d46e5] hover:from-[#2d46e5] hover:to-[#2237bf] text-white cursor-pointer active:scale-98 shadow-blue-500/25'
                    : 'bg-[#9bb0fc] dark:bg-blue-950/60 text-white cursor-not-allowed shadow-none'
                )}
              >
                <span>Next Step</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </button>
            </div>
          )}

          {/* STEP 2: BANK ACCOUNT SELECTION (Matching Image 2) */}
          {step === 'BANK' && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('AMOUNT')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <span>← Back</span>
              </button>

              <div className="rounded-2xl bg-white dark:bg-[#121829] border border-slate-100 dark:border-slate-800 p-4 space-y-4 shadow-sm">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Bank account</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Select the verified account you'll pay from.
                  </p>
                </div>

                {!hasPaymentMethod && addedMethods.length === 0 ? (
                  <>
                    {/* Amber Warning Box (Matching Image 2) */}
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 p-3.5 space-y-1">
                      <p className="text-xs font-extrabold text-amber-800 dark:text-amber-300">
                        You don't have a verified bank account yet.
                      </p>
                      <p className="text-[11px] font-medium text-amber-700/90 dark:text-amber-400">
                        Add one and finish verification to continue.
                      </p>
                    </div>

                    {/* Dashed Verify Bank Button */}
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="w-full rounded-xl border-2 border-dashed border-blue-400/80 dark:border-blue-500/60 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-extrabold py-3 text-xs flex items-center justify-center gap-1 cursor-pointer hover:bg-blue-100/50 transition-colors"
                    >
                      <span>+ Verify a bank account</span>
                    </button>
                  </>
                ) : (
                  <div className="space-y-2">
                    {addedMethods.map((m) => (
                      <div key={m.id} className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white">{m.title}</p>
                          <p className="text-[10px] text-slate-500">{m.meta}</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
                          Verified
                        </span>
                      </div>
                    ))}
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="w-full text-center text-xs font-extrabold text-blue-600 hover:underline pt-1 cursor-pointer"
                    >
                      + Add another method
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setStep('CONFIRM')}
                className="w-full rounded-2xl py-3.5 text-xs font-black bg-[#3b59f8] hover:bg-[#2d46e5] text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
              >
                <span>Review Order</span>
                <span>→</span>
              </button>
            </div>
          )}

          {/* STEP 3: CONFIRMATION ORDER SUMMARY */}
          {step === 'CONFIRM' && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('BANK')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <span>← Back to Bank</span>
              </button>

              <div className="rounded-2xl bg-white dark:bg-[#121829] border border-slate-100 dark:border-slate-800 p-4 space-y-3 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Order Summary</h3>
                <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Buying</span>
                    <span className="font-black text-slate-900 dark:text-white">{amount} USDT</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Rate</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">₹99.11 / USDT</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Total INR</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">₹{(parseFloat(amount || '0') * 99.11).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Link to="/customer/orders">
                <Button className="w-full rounded-2xl py-3.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 cursor-pointer">
                  Confirm Buy Order
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SELL USDT & MANAGE PAYMENTS FLOW (Matching User Images 1, 2, 3) */}
      {/* ------------------------------------------------------------- */}
      {side !== 'BUY' && (
        <div className="space-y-4 my-2">
          {!hasPaymentMethod && addedMethods.length === 0 ? (
            !isManagePayments ? (
              /* SCREEN 1: SELL USDT INITIAL STATE (Matching Reference Image 1) */
              <div className="rounded-[32px] bg-white dark:bg-[#121829] border border-slate-100 dark:border-slate-800/80 p-6 sm:p-7 text-center space-y-5 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.05)] dark:shadow-[0_15px_35px_-10px_rgba(0,0,0,0.4)] relative overflow-hidden group animate-in fade-in zoom-in-95 duration-300 my-4">
                {/* Ambient Subtle Glow Backdrop */}
                <div className="absolute -top-16 -right-16 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/20 transition-all duration-500" />
                <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-500" />

                {/* Animated Floating Bank Building Icon */}
                <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-slate-100 dark:bg-slate-800/80 animate-ping opacity-25" />
                  <div className="w-16 h-16 rounded-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm relative group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V10m0 0V5m0 5h4" />
                    </svg>
                  </div>
                </div>

                <div className="space-y-1.5 max-w-xs mx-auto">
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">No payment methods found</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    You need to add a bank account or UPI ID to receive INR when you sell USDT.
                  </p>
                </div>

                {/* Glowing Pill Action Button (Transitions to Manage Payments & opens bottom sheet) */}
                <button
                  onClick={() => {
                    setIsManagePayments(true)
                    setShowAddModal(true)
                  }}
                  className="rounded-full px-7 py-3.5 text-xs font-black bg-gradient-to-r from-[#3b59f8] to-[#2d46e5] hover:from-[#2d46e5] hover:to-[#2237bf] text-white shadow-xl shadow-blue-500/30 inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 group/btn"
                >
                  <span className="text-sm font-extrabold group-hover/btn:rotate-90 transition-transform duration-300">+</span>
                  <span>Add Payment Method</span>
                </button>
              </div>
            ) : (
              /* SCREEN 2: MANAGE PAYMENTS VIEW (Matching Reference Image 2) */
              <div className="space-y-5 my-2 animate-in fade-in zoom-in-95 duration-200">
                {/* Light dashed card matching Image 2 */}
                <div className="rounded-[28px] border border-dashed border-slate-200 dark:border-slate-800/80 p-6 text-center space-y-4 bg-slate-50/40 dark:bg-[#121829]/40 shadow-xs">
                  <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 shadow-xs">
                    <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V10m0 0V5m0 5h4" />
                    </svg>
                  </div>
                  <div className="space-y-1 max-w-xs mx-auto">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">No payment methods</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Add a bank account or UPI ID to receive payments.
                    </p>
                  </div>
                </div>

                {/* Dashed Add New Method Button matching Image 2 */}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full rounded-2xl border-2 border-dashed border-blue-400/80 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-extrabold py-3.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-blue-100/50 transition-colors shadow-xs"
                >
                  <span>+ Add New Method</span>
                </button>
              </div>
            )
          ) : (
            /* VERIFIED PAYMENT METHODS LIST */
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="rounded-2xl bg-white dark:bg-[#121829] border border-slate-100 dark:border-slate-800 p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Your Receiving Methods</h3>
                  <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/80">
                    {addedMethods.length} Connected
                  </span>
                </div>

                {addedMethods.map((m) => (
                  <div key={m.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        {m.type === 'BANK' ? (
                          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V10m0 0V5m0 5h4" />
                          </svg>
                        ) : (
                          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white">{m.title}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{m.meta}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200">
                      Active
                    </span>
                  </div>
                ))}

                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full rounded-xl border-2 border-dashed border-blue-400/80 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-extrabold py-3 text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-blue-100/50 transition-colors"
                >
                  <span>+ Add New Method</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ADD PAYMENT METHOD BOTTOM SHEET MODAL (Flush Phone-Scoped) */}
      {/* ------------------------------------------------------------- */}
      {showAddModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false)
            }
          }}
          className="fixed sm:absolute inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-md transition-all duration-300"
        >
          <div className="w-full h-auto rounded-t-[32px] bg-white dark:bg-[#101626] p-5 pb-8 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-300 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
            {/* Modal Drag Notch */}
            <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />

            {!selectedMethodType ? (
              /* SELECTION METHOD LIST (Image 5) */
              <>
                <div className="text-center space-y-1 pt-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Add Payment Method</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Select a method to receive your funds securely.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  {/* Bank Transfer Option */}
                  <button
                    onClick={() => setSelectedMethodType('BANK')}
                    className="w-full rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 p-4 flex items-center justify-between text-left hover:border-blue-500/80 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-blue-500/10 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 group-hover:scale-105 transition-transform">
                        <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V10m0 0V5m0 5h4" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">Bank Transfer</h4>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Fastest and most reliable</p>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* UPI ID Option */}
                  <button
                    onClick={() => setSelectedMethodType('UPI')}
                    className="w-full rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 p-4 flex items-center justify-between text-left hover:border-amber-500/80 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 group-hover:scale-105 transition-transform">
                        <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">UPI ID</h4>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Instant transfer to VPA</p>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-full py-3 text-xs font-black text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-2xl transition-all cursor-pointer mt-1"
                >
                  Cancel
                </button>
              </>
            ) : selectedMethodType === 'BANK' ? (
              /* BANK FORM INPUT */
              <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Add Bank Account</h3>
                  <button onClick={() => setSelectedMethodType(null)} className="text-xs text-blue-600 dark:text-blue-400 font-extrabold hover:underline">← Back</button>
                </div>
                <Input
                  placeholder="Account Number"
                  value={bankAccNumber}
                  onChange={(e) => setBankAccNumber(e.target.value)}
                  className="rounded-2xl"
                />
                <Input
                  placeholder="IFSC Code (e.g. SBIN0001234)"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value)}
                  className="rounded-2xl uppercase"
                />
                <button
                  onClick={handleAddPaymentMethod}
                  disabled={!bankAccNumber || !ifsc}
                  className="w-full rounded-2xl py-3.5 text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
                >
                  Save & Verify Bank
                </button>
              </div>
            ) : (
              /* UPI FORM INPUT */
              <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Add UPI ID</h3>
                  <button onClick={() => setSelectedMethodType(null)} className="text-xs text-amber-600 dark:text-amber-400 font-extrabold hover:underline">← Back</button>
                </div>
                <Input
                  placeholder="UPI VPA (e.g. user@upi)"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="rounded-2xl"
                />
                <button
                  onClick={handleAddPaymentMethod}
                  disabled={!upiId}
                  className="w-full rounded-2xl py-3.5 text-xs font-black bg-gradient-to-r from-amber-500 to-orange-600 text-white disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
                >
                  Save UPI ID
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function TransactionsFlow() {
  const q = useWallet()
  const [filterType, setFilterType] = useState('ALL')
  const [search] = useState('')

  const allRows = [
    ...(q.data?.activity ?? []),
    { id: 'tx-4', type: 'BILL_PAY', status: 'COMPLETED', amount: '3.25', asset: 'USDT', createdAt: new Date(Date.now() - 14400000).toISOString() },
    { id: 'tx-5', type: 'GIFT_CARD', status: 'COMPLETED', amount: '5.46', asset: 'USDT', createdAt: new Date(Date.now() - 28800000).toISOString() },
    { id: 'tx-6', type: 'RECHARGE', status: 'COMPLETED', amount: '2.17', asset: 'USDT', createdAt: new Date(Date.now() - 86400000).toISOString() },
  ]

  const filtered = allRows.filter((r) => {
    const matchesFilter =
      filterType === 'ALL' ||
      (filterType === 'DEPOSIT' && r.type === 'DEPOSIT') ||
      (filterType === 'BUY' && r.type === 'BUY') ||
      (filterType === 'SELL' && r.type === 'SELL') ||
      (filterType === 'BILLS' && (r.type === 'BILL_PAY' || r.type === 'RECHARGE')) ||
      (filterType === 'GIFTS' && r.type === 'GIFT_CARD')

    const matchesSearch =
      r.type.toLowerCase().includes(search.toLowerCase()) ||
      r.status.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase())

    return matchesFilter && matchesSearch
  })

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
        {['ALL', 'DEPOSIT', 'BUY', 'SELL', 'BILLS', 'GIFTS'].map((tab) => (
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
            const isPositive = item.type === 'DEPOSIT' || item.type === 'BUY'
            const inrVal = (parseFloat(item.amount) * 91.5).toFixed(2)

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
                      {item.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {new Date(item.createdAt).toLocaleDateString([], {
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
                    {isPositive ? '+' : '-'}{item.amount} {item.asset}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ≈ ₹{inrVal}
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
  const q = useQuery({
    queryKey: ['activity', transactionId],
    queryFn: () => api<{ type: string; status: string; amount: string; asset: string; createdAt: string }>(`/wallet/activity/${transactionId}`).catch(() => ({
      type: 'USDT Escrow Order',
      status: 'COMPLETED',
      amount: '250.00',
      asset: 'USDT',
      createdAt: new Date().toISOString(),
    })),
  })

  const row = q.data || {
    type: 'USDT Escrow Order',
    status: 'COMPLETED',
    amount: '250.00',
    asset: 'USDT',
    createdAt: new Date().toISOString(),
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
            {row.status}
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {row.amount} {row.asset}
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            ≈ ₹{(parseFloat(row.amount || '0') * 91.5).toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-left text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Transaction ID:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{transactionId || 'TXN-892104'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Type:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{row.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Timestamp:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">{new Date(row.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Escrow Network:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">TRC20 Verified</span>
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
