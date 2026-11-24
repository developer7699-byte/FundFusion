import { useState } from 'react'
import {
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Building2,
  CreditCard,
  QrCode,
  ShieldCheck,
  Send,
  Plus,
  Trash2,
  Lock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { useMerchantStore, type MerchantOrder, type SettlementAccount } from '@/lib/merchant-store'
import { cn } from '@/lib/utils'

/* =========================================================================
   1. DEPOSIT LIQUIDITY MODAL
   ========================================================================= */
export function DepositLiquidityModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: (msg: string) => void
}) {
  const { depositLiquidity } = useMerchantStore()
  const [network, setNetwork] = useState<'TRC20' | 'ERC20' | 'BEP20'>('TRC20')
  const [amount, setAmount] = useState('500')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const addresses = {
    TRC20: 'TNxK9q8vP3L2y1M0z5A4B7c8D6e9F0G1H2',
    ERC20: '0x71C2B5f8A19042b9c73e04a9F68B18e54728d1A3',
    BEP20: '0x3a8F58e990b7218698B1a20D980c6517aEf51610',
  }

  const handleDeposit = () => {
    const val = parseFloat(amount)
    if (!val || val <= 0) return
    depositLiquidity(val, network)
    onSuccess(`Successfully deposited +${val.toFixed(2)} USDT (${network}) into liquidity vault!`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[360px] bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              ₮
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Deposit USDT Vault</h3>
              <p className="text-[11px] text-slate-500">Add desk trading liquidity</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs">
          {/* Network Selector Tabs */}
          <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 gap-1">
            {(['TRC20', 'ERC20', 'BEP20'] as const).map((net) => (
              <button
                key={net}
                type="button"
                onClick={() => setNetwork(net)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer',
                  network === net
                    ? 'bg-white dark:bg-[#1e293b] text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                {net}
              </button>
            ))}
          </div>

          {/* QR Code Container */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center space-y-2">
            <div className="w-28 h-28 bg-white p-2 rounded-xl shadow-inner mx-auto flex items-center justify-center border">
              <QrCode className="w-24 h-24 text-slate-900" />
            </div>
            <p className="text-[11px] text-slate-500 font-mono break-all px-2">
              {addresses[network]}
            </p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(addresses[network])
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied!' : 'Copy Deposit Address'}</span>
            </button>
          </div>

          {/* Simulated Amount Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
              Simulated Top-up Amount (USDT)
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                className="w-full pl-8 pr-14 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-sm text-slate-900 dark:text-white"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₮</span>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">USDT</span>
            </div>
            <div className="flex gap-2 pt-1">
              {[250, 500, 1000, 2500].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setAmount(String(quick))}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 cursor-pointer"
                >
                  +{quick}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleDeposit}
            className="w-full py-3 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-white font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            Confirm Simulated Deposit
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   2. WITHDRAW / BANK SETTLEMENT MODAL
   ========================================================================= */
export function WithdrawPayoutModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: (msg: string) => void
}) {
  const { availableUsdt, accounts, withdrawLiquidity, settleToBank } = useMerchantStore()
  const [tab, setTab] = useState<'BANK' | 'CRYPTO'>('BANK')
  const [amount, setAmount] = useState('25000')
  const [cryptoAmount, setCryptoAmount] = useState('500')
  const [targetAddress, setTargetAddress] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<string>(accounts[0]?.id || '')

  if (!isOpen) return null

  const handleSettleBank = () => {
    const val = parseFloat(amount)
    if (!val || val <= 0) return
    const acc = accounts.find((a) => a.id === selectedAccount) || accounts[0]
    const ok = settleToBank(val, acc?.label || 'Bank')
    if (ok) {
      onSuccess(`₹${val.toLocaleString('en-IN')} successfully settled to ${acc?.label}!`)
      onClose()
    } else {
      alert('Insufficient available liquidity to settle this amount.')
    }
  }

  const handleWithdrawCrypto = () => {
    const val = parseFloat(cryptoAmount)
    if (!val || val <= 0 || !targetAddress) return
    const ok = withdrawLiquidity(val, targetAddress)
    if (ok) {
      onSuccess(`Successfully withdrew ${val.toFixed(2)} USDT to ${targetAddress.slice(0, 6)}...!`)
      onClose()
    } else {
      alert('Insufficient available USDT balance.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[360px] bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Withdraw & Settle</h3>
              <p className="text-[11px] text-slate-500">Available: {availableUsdt.toFixed(2)} USDT</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs">
          <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 gap-1">
            <button
              type="button"
              onClick={() => setTab('BANK')}
              className={cn(
                'flex-1 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5',
                tab === 'BANK'
                  ? 'bg-white dark:bg-[#1e293b] text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500'
              )}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Settle to Bank (INR)</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('CRYPTO')}
              className={cn(
                'flex-1 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5',
                tab === 'CRYPTO'
                  ? 'bg-white dark:bg-[#1e293b] text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500'
              )}
            >
              <span>USDT Transfer</span>
            </button>
          </div>

          {tab === 'BANK' ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Select Bank Account</label>
                <div className="space-y-1.5">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      onClick={() => setSelectedAccount(acc.id)}
                      className={cn(
                        'p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between',
                        selectedAccount === acc.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
                      )}
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{acc.label}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{acc.details}</p>
                      </div>
                      {selectedAccount === acc.id && (
                        <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Settlement Amount (INR)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="25000"
                    className="w-full pl-8 pr-12 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-sm text-slate-900 dark:text-white"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                </div>
                <p className="text-[10px] text-slate-500 pt-0.5">
                  Estimated deduction: ≈ {(parseFloat(amount || '0') / 91.5).toFixed(2)} USDT
                </p>
              </div>

              <button
                type="button"
                onClick={handleSettleBank}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
              >
                Instant Bank Settlement
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Recipient USDT Address</label>
                <input
                  type="text"
                  value={targetAddress}
                  onChange={(e) => setTargetAddress(e.target.value)}
                  placeholder="T... or 0x..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Withdraw Amount (USDT)</label>
                <input
                  type="number"
                  value={cryptoAmount}
                  onChange={(e) => setCryptoAmount(e.target.value)}
                  placeholder="500"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-xs text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={handleWithdrawCrypto}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                Confirm USDT Withdrawal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   3. ACCEPT ORDER MODAL
   ========================================================================= */
export function AcceptOrderModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: {
  order: MerchantOrder | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (msg: string) => void
}) {
  const { availableUsdt, acceptOrder } = useMerchantStore()

  if (!isOpen || !order) return null

  const canAfford = availableUsdt >= order.usdtAmount

  const handleConfirm = () => {
    const ok = acceptOrder(order.id)
    if (ok) {
      onSuccess(`Order #${order.id} accepted! ${order.usdtAmount.toFixed(2)} USDT locked in smart escrow.`)
      onClose()
    } else {
      if (availableUsdt < order.usdtAmount) {
        alert('Insufficient available USDT liquidity in desk vault.')
      } else {
        alert('⚡ Order already accepted by another merchant desk or expired!')
        onClose()
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[360px] bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Accept P2P Order</h3>
              <p className="text-[11px] text-slate-500">Order #{order.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Order Snapshot Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-slate-500">
              <span>Customer</span>
              <span className="font-bold text-slate-900 dark:text-white">{order.buyerName} ({order.buyerRating})</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Settlement Amount</span>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                ₹{order.inrAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Escrow Lock</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {order.usdtAmount.toFixed(2)} USDT
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Payment Channel</span>
              <span className="font-bold text-slate-900 dark:text-white">{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
              <span>Your Estimated Commission</span>
              <span className="font-mono font-bold text-amber-500">
                +{((order.usdtAmount * 0.015)).toFixed(2)} USDT
              </span>
            </div>
          </div>

          {!canAfford ? (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Insufficient Available USDT. Please deposit at least {(order.usdtAmount - availableUsdt).toFixed(2)} USDT first.</span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold leading-relaxed">
              Upon accepting, {order.usdtAmount} USDT will be locked in smart escrow. The buyer has 15 minutes to transfer rupees to your bank.
            </div>
          )}

          <button
            type="button"
            disabled={!canAfford}
            onClick={handleConfirm}
            className="w-full py-3 rounded-2xl bg-[#0a2316] dark:bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer"
          >
            Accept Order & Lock Escrow
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   4. RELEASE ESCROW MODAL
   ========================================================================= */
export function ReleaseEscrowModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: {
  order: MerchantOrder | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (msg: string) => void
}) {
  const { releaseEscrow } = useMerchantStore()
  const [confirmed, setConfirmed] = useState(false)

  if (!isOpen || !order) return null

  const handleRelease = () => {
    if (!confirmed) return
    const ok = releaseEscrow(order.id)
    if (ok) {
      onSuccess(`Escrow released! Order #${order.id} marked COMPLETED. Commission credited.`)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[360px] bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Confirm Bank Receipt</h3>
              <p className="text-[11px] text-slate-500">Order #{order.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* UTR Verification Pill */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
            <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
              Buyer Submitted Bank UTR
            </p>
            <p className="font-mono text-base font-black text-slate-900 dark:text-white">
              {order.utr || '429104829104'}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Amount to verify: <span className="font-bold text-slate-900 dark:text-white">₹{order.inrAmount.toLocaleString('en-IN')}</span> via {order.paymentMethod}
            </p>
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
              I have logged into my mobile bank app and confirmed receipt of <strong>₹{order.inrAmount.toLocaleString('en-IN')}</strong>. I authorize the release of <strong>{order.usdtAmount} USDT</strong> from escrow.
            </span>
          </label>

          <button
            type="button"
            disabled={!confirmed}
            onClick={handleRelease}
            className="w-full py-3 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 text-white font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            Release USDT to Buyer
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   5. DISPUTE ORDER MODAL
   ========================================================================= */
export function DisputeOrderModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: {
  order: MerchantOrder | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (msg: string) => void
}) {
  const { disputeOrder } = useMerchantStore()
  const [reason, setReason] = useState('Payment not received in bank account')
  const [details, setDetails] = useState('')

  if (!isOpen || !order) return null

  const handleDispute = () => {
    disputeOrder(order.id, `${reason} - ${details}`)
    onSuccess(`Dispute raised on Order #${order.id}. A 24/7 arbitrator has entered the trade.`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[360px] bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Raise Escrow Dispute</h3>
              <p className="text-[11px] text-slate-500">Order #{order.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Dispute Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
            >
              <option value="Payment not received in bank account">Payment not received in bank account</option>
              <option value="Third-party bank account transfer">Third-party bank account transfer</option>
              <option value="Incorrect UTR reference number">Incorrect UTR reference number</option>
              <option value="Short payment amount received">Short payment amount received</option>
              <option value="Buyer unresponsive">Buyer unresponsive</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Additional Evidence / Notes</label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="State bank statement status or relevant details..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white resize-none"
            />
          </div>

          <button
            type="button"
            onClick={handleDispute}
            className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
          >
            Submit Dispute to Arbitrator
          </button>
        </div>
      </div>
    </div>
  )
}

