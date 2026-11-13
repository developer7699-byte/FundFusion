import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowDownCircle,
  QrCode,
  Copy,
  Check,
  Share2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Download,
  Send,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

interface MoneyRequest {
  id: string
  amountInr: number
  amountUsdt: string
  note: string
  payer?: string
  status: 'PENDING' | 'PAID' | 'EXPIRED'
  createdAt: string
  link: string
}

export function RequestMoneyPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Form states
  const [currency, setCurrency] = useState<'INR' | 'USDT'>('INR')
  const [amount, setAmount] = useState('500')
  const [note, setNote] = useState('Dinner split')
  const [payerInput, setPayerInput] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY'>('NEW')

  // Live conversion rate
  const usdtRate = 91.5

  const calculateAmounts = () => {
    const num = parseFloat(amount || '0') || 0
    if (currency === 'INR') {
      const inrVal = num
      const usdtVal = (num / usdtRate).toFixed(2)
      return { inr: inrVal, usdt: usdtVal }
    } else {
      const usdtVal = num.toFixed(2)
      const inrVal = Math.round(num * usdtRate)
      return { inr: inrVal, usdt: usdtVal }
    }
  }

  const { inr: calculatedInr, usdt: calculatedUsdt } = calculateAmounts()

  const userVpa = user?.email ? `${user.email.split('@')[0]}@fundfusion` : 'customer@fundfusion'
  const generatedPayLink = `https://fundfusion.io/pay/${userVpa}?amt=${calculatedInr}&curr=INR&note=${encodeURIComponent(
    note || 'Money Request'
  )}`

  // Request History State
  const [requests, setRequests] = useState<MoneyRequest[]>([
    {
      id: 'REQ-91024',
      amountInr: 1200,
      amountUsdt: '13.11',
      note: 'Team lunch split',
      payer: 'rohit.mehta@okaxis',
      status: 'PENDING',
      createdAt: '15 mins ago',
      link: `https://fundfusion.io/pay/${userVpa}?amt=1200&curr=INR`,
    },
    {
      id: 'REQ-88310',
      amountInr: 2500,
      amountUsdt: '27.32',
      note: 'Freelance UI design milestone',
      payer: 'designstudio@icici',
      status: 'PAID',
      createdAt: 'Yesterday',
      link: `https://fundfusion.io/pay/${userVpa}?amt=2500&curr=INR`,
    },
    {
      id: 'REQ-76129',
      amountInr: 450,
      amountUsdt: '4.91',
      note: 'Cab share',
      payer: 'priya.k@paytm',
      status: 'PAID',
      createdAt: '2 days ago',
      link: `https://fundfusion.io/pay/${userVpa}?amt=450&curr=INR`,
    },
  ])

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(generatedPayLink)
    setCopiedLink(true)
    showToast('Payment request link copied to clipboard!')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'FundFusion Money Request',
        text: `Please pay ₹${calculatedInr} (${calculatedUsdt} USDT) to ${userVpa} for: ${note || 'Money Request'}`,
        url: generatedPayLink,
      })
    } else {
      handleCopyLink()
    }
  }

  const handleSendReminder = (reqId: string) => {
    showToast(`Payment reminder notification pinged for ${reqId}!`)
  }

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) return

    const newReq: MoneyRequest = {
      id: `REQ-${Math.floor(10000 + Math.random() * 90000)}`,
      amountInr: calculatedInr,
      amountUsdt: calculatedUsdt,
      note: note || 'Payment request',
      payer: payerInput || 'Any payer via UPI / USDT',
      status: 'PENDING',
      createdAt: 'Just now',
      link: generatedPayLink,
    }

    setRequests([newReq, ...requests])
    showToast('New money request generated and active!')
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900/95 text-white dark:bg-white/95 dark:text-slate-900 text-xs font-bold shadow-xl border border-white/10 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/customer/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Request Money</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Share payment link or QR for instant settlement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black">
          <Sparkles className="w-3 h-3" />
          <span>Zero Fee</span>
        </div>
      </div>

      {/* Sub Tabs: Create New vs Recent Requests */}
      <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-900/80 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('NEW')}
          className={cn(
            'flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
            activeTab === 'NEW'
              ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          <ArrowDownCircle className="w-3.5 h-3.5" />
          <span>Create Request</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={cn(
            'flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
            activeTab === 'HISTORY'
              ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>History ({requests.length})</span>
        </button>
      </div>

      {activeTab === 'NEW' ? (
        <form onSubmit={handleCreateRequest} className="space-y-4">
          {/* Amount Card */}
          <div className="rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                You will receive in your wallet
              </span>

              {/* Currency Toggle */}
              <div className="flex items-center p-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setCurrency('INR')}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer',
                    currency === 'INR'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  ₹ INR
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('USDT')}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer',
                    currency === 'USDT'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  ₮ USDT
                </button>
              </div>
            </div>

            {/* Large Amount Input */}
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-3xl sm:text-4xl font-black text-slate-400 dark:text-slate-500">
                {currency === 'INR' ? '₹' : '$'}
              </span>
              <input
                type="number"
                min="10"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full text-3xl sm:text-4xl font-mono font-black text-slate-900 dark:text-white bg-transparent focus:outline-none"
              />
            </div>

            {/* Conversion Rate Helper */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono">
                ≈ {currency === 'INR' ? `${calculatedUsdt} USDT` : `₹${calculatedInr} INR`}
              </span>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">
                1 USDT ≈ ₹{usdtRate}
              </span>
            </div>

            {/* Quick Amount Suggestion Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {(currency === 'INR'
                ? ['200', '500', '1000', '2000', '5000']
                : ['5', '10', '25', '50', '100']
              ).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setAmount(chip)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer',
                    amount === chip
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-100 dark:border-slate-800'
                  )}
                >
                  {currency === 'INR' ? `₹${chip}` : `${chip} USDT`}
                </button>
              ))}
            </div>
          </div>

          {/* Details & Purpose Card */}
          <div className="rounded-[28px] bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Note / Purpose (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Dinner bill, Freelance milestone..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            {/* Quick Note Tags */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {['Dinner split', 'Rent contribution', 'Freelance gig', 'Coffee', 'Gift share'].map(
                (preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNote(preset)}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0 hover:bg-slate-200 cursor-pointer"
                  >
                    {preset}
                  </button>
                )
              )}
            </div>

            {/* Payer UPI ID / Phone (Optional) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Payer UPI VPA or Phone (Optional)
              </label>
              <input
                type="text"
                value={payerInput}
                onChange={(e) => setPayerInput(e.target.value)}
                placeholder="e.g. friend@okhdfcbank or 9876543210"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          {/* Dynamic QR Code & Share Card */}
          <div className="rounded-[28px] bg-gradient-to-tr from-[#0a2316] via-[#0d3420] to-[#072416] p-5 text-white shadow-xl border border-emerald-500/30 text-center space-y-4 relative overflow-hidden">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Smart Escrow Payment Request</span>
            </div>

            {/* Generated QR Code SVG */}
            <div className="relative w-48 h-48 mx-auto p-3.5 rounded-3xl bg-white shadow-2xl flex items-center justify-center">
              <svg className="w-full h-full text-slate-950" viewBox="0 0 100 100" fill="currentColor">
                {/* QR Finder Corners */}
                <rect x="5" y="5" width="25" height="25" rx="4" />
                <rect x="9" y="9" width="17" height="17" rx="2" fill="white" />
                <rect x="13" y="13" width="9" height="9" rx="1" />

                <rect x="70" y="5" width="25" height="25" rx="4" />
                <rect x="74" y="9" width="17" height="17" rx="2" fill="white" />
                <rect x="78" y="13" width="9" height="9" rx="1" />

                <rect x="5" y="70" width="25" height="25" rx="4" />
                <rect x="9" y="74" width="17" height="17" rx="2" fill="white" />
                <rect x="13" y="78" width="9" height="9" rx="1" />

                {/* Matrix Points */}
                <rect x="35" y="8" width="5" height="5" />
                <rect x="45" y="8" width="10" height="5" />
                <rect x="60" y="8" width="5" height="5" />
                <rect x="35" y="18" width="10" height="5" />
                <rect x="50" y="18" width="5" height="5" />

                <rect x="8" y="35" width="5" height="10" />
                <rect x="18" y="35" width="10" height="5" />
                <rect x="8" y="50" width="5" height="5" />
                <rect x="18" y="50" width="5" height="10" />

                <rect x="70" y="35" width="10" height="5" />
                <rect x="85" y="35" width="5" height="10" />
                <rect x="75" y="45" width="10" height="5" />
                <rect x="70" y="55" width="5" height="10" />

                <rect x="35" y="70" width="10" height="5" />
                <rect x="50" y="70" width="5" height="10" />
                <rect x="60" y="75" width="10" height="5" />
                <rect x="35" y="85" width="5" height="10" />
                <rect x="45" y="85" width="15" height="5" />
                <rect x="65" y="85" width="15" height="10" />

                {/* Center Badge */}
                <circle cx="50" cy="50" r="14" fill="white" />
                <circle cx="50" cy="50" r="11" fill="#15803d" />
              </svg>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black font-mono">
                ₹{calculatedInr}{' '}
                <span className="text-xs font-normal text-emerald-300">({calculatedUsdt} USDT)</span>
              </h3>
              <p className="text-xs text-emerald-200/80 font-mono">{userVpa}</p>
              {note && <p className="text-[11px] text-emerald-300 font-medium">"{note}"</p>}
            </div>

            {/* Action Buttons: Copy link & Share */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="py-2.5 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Request</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* Requests History Ledger */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Active & Past Requests
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              Auto-verified via UPI
            </span>
          </div>

          <div className="space-y-2.5">
            {requests.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs shrink-0">
                      ↓
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                          ₹{r.amountInr}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({r.amountUsdt} USDT)
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                        {r.note}
                      </p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0',
                      r.status === 'PAID'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : r.status === 'PENDING'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    )}
                  >
                    {r.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2 font-mono">
                  <span>To: {r.payer}</span>
                  <span>{r.createdAt}</span>
                </div>

                {r.status === 'PENDING' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSendReminder(r.id)}
                      className="flex-1 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Send Reminder
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(r.link)
                        showToast('Request link copied!')
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Copy Link
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

