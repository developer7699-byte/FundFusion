import { useState } from 'react'
import {
  X,
  Smartphone,
  Zap,
  Tv,
  Globe,
  Droplet,
  Flame,
  Car,
  Gamepad2,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface BillPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  initialCategory?: 'gaming' | 'recharge' | 'electricity' | 'dth' | 'broadband' | 'gas' | 'water' | 'fastag'
  onPaymentSuccess?: (amountInr: number, usdtAmount: number) => void
}

export function BillPaymentModal({
  isOpen,
  onClose,
  initialCategory = 'recharge',
  onPaymentSuccess,
}: BillPaymentModalProps) {
  if (!isOpen) return null

  const [activeCat, setActiveCat] = useState<string>(initialCategory)
  const [operator, setOperator] = useState(initialCategory === 'gaming' ? 'Free Fire MAX (Diamonds)' : 'Jio')
  const [consumerId, setConsumerId] = useState(initialCategory === 'gaming' ? '2948102948' : '9876543210')
  const [amount, setAmount] = useState(initialCategory === 'gaming' ? '240' : '299')
  const [isProcessing, setIsProcessing] = useState(false)
  const [receipt, setReceipt] = useState<{ id: string; time: string } | null>(null)

  const categories = [
    { id: 'gaming', label: 'Game Topup', icon: Gamepad2 },
    { id: 'recharge', label: 'Mobile', icon: Smartphone },
    { id: 'electricity', label: 'Electricity', icon: Zap },
    { id: 'dth', label: 'DTH TV', icon: Tv },
    { id: 'broadband', label: 'Broadband', icon: Globe },
    { id: 'gas', label: 'Piped Gas', icon: Flame },
    { id: 'water', label: 'Water Bill', icon: Droplet },
    { id: 'fastag', label: 'FASTag', icon: Car },
  ] as const

  const operatorsByCat: Record<string, string[]> = {
    gaming: [
      'Free Fire MAX (Diamonds)',
      'BGMI (Battlegrounds Mobile India - UC)',
      'Google Play Redeem Code',
      'Call of Duty: Mobile (CP)',
      'Roblox (Robux Gift Card)',
    ],
    recharge: ['Jio', 'Airtel', 'Vi (Vodafone Idea)', 'BSNL'],
    electricity: ['BESCOM (Karnataka)', 'Adani Electricity (Mumbai)', 'Tata Power (Delhi)', 'PSPCL (Punjab)'],
    dth: ['Tata Play (Sky)', 'Airtel Digital TV', 'Dish TV', 'Sun Direct'],
    broadband: ['JioFiber', 'Airtel Xstream', 'ACT Fibernet', 'Hathway'],
    gas: ['Mahanagar Gas (MGL)', 'Indraprastha Gas (IGL)', 'Gujarat Gas', 'Adani Total Gas'],
    water: ['Delhi Jal Board', 'Bangalore BWSSB', 'MCGM Mumbai', 'Hyderabad HMWSSB'],
    fastag: ['Paytm Payments Bank', 'ICICI Bank FASTag', 'SBI FASTag', 'HDFC Bank FASTag'],
  }

  const quickPacksRecharge = [
    { inr: '199', desc: '1.5GB/day · 28 Days' },
    { inr: '299', desc: '2GB/day + 5G · 28 Days' },
    { inr: '719', desc: '1.5GB/day · 84 Days' },
    { inr: '999', desc: 'Unlimited 5G · 84 Days' },
  ]

  const quickPacksGaming = operator.includes('Free Fire')
    ? [
        { inr: '80', desc: '100 💎 Diamonds' },
        { inr: '160', desc: 'Weekly Pass ⚡' },
        { inr: '240', desc: '310 💎 Diamonds' },
        { inr: '400', desc: '520 💎 Diamonds' },
        { inr: '800', desc: '1060 💎 Diamonds' },
        { inr: '1600', desc: '2180 💎 Diamonds' },
      ]
    : operator.includes('BGMI')
    ? [
        { inr: '75', desc: '60 UC Pack' },
        { inr: '380', desc: '325 UC Pack' },
        { inr: '750', desc: '660 UC Royale' },
        { inr: '1900', desc: '1800 UC Pack' },
      ]
    : [
        { inr: '100', desc: 'Instant Code' },
        { inr: '250', desc: 'Instant Code' },
        { inr: '500', desc: 'Instant Code' },
        { inr: '1000', desc: 'Instant Code' },
      ]

  const rate = 91.5 // 1 USDT = ~91.5 INR
  const usdtEquivalent = (parseFloat(amount || '0') / rate).toFixed(2)

  const handlePay = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      const rec = {
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setReceipt(rec)
      if (onPaymentSuccess) {
        onPaymentSuccess(parseFloat(amount), parseFloat(usdtEquivalent))
      }
    }, 1200)
  }

  const handleReset = () => {
    setReceipt(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-[360px] bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Bills & Utility Recharge
              </h3>
              <p className="text-[11px] text-slate-500">Pay directly with USDT · Zero extra fee</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {receipt ? (
          /* Success Receipt */
          <div className="p-6 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                Payment Successful
              </span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                ₹{amount}
              </h4>
              <p className="text-xs text-slate-500">Deducted: {usdtEquivalent} USDT from wallet</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Service:</span>
                <span className="font-bold text-slate-900 dark:text-white capitalize">{activeCat}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Operator:</span>
                <span className="font-bold text-slate-900 dark:text-white">{operator}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Consumer No:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{consumerId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ref ID:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{receipt.id}</span>
              </div>
            </div>

            <Button
              onClick={handleReset}
              className="w-full py-2.5 rounded-xl font-bold bg-[#22c55e] hover:bg-[#16a34a] text-white"
            >
              Done
            </Button>
          </div>
        ) : (
          /* Payment Form */
          <div className="p-4 space-y-4 overflow-y-auto">
            {/* Category horizontal scroll bar */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Select Service
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {categories.map((c) => {
                  const Icon = c.icon
                  const isActive = activeCat === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setActiveCat(c.id)
                        const ops = operatorsByCat[c.id] || []
                        if (ops.length > 0) setOperator(ops[0])
                      }}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer',
                        isActive
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{c.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Operator Dropdown */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Biller / Operator
              </label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {(operatorsByCat[activeCat] || []).map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>

            {/* Consumer ID / Phone / UID */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {activeCat === 'gaming'
                  ? 'Player UID / Character ID'
                  : activeCat === 'recharge'
                  ? 'Mobile Number'
                  : 'Consumer / Account Number'}
              </label>
              <Input
                type="text"
                value={consumerId}
                onChange={(e) => setConsumerId(e.target.value)}
                placeholder={
                  activeCat === 'gaming'
                    ? 'Enter Game UID (e.g. 294819204)'
                    : activeCat === 'recharge'
                    ? '10-digit mobile'
                    : 'Consumer ID'
                }
                className="rounded-xl text-xs font-mono font-bold"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {activeCat === 'gaming' ? 'Top-up Package Amount (₹ INR)' : 'Bill Amount (₹ INR)'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  ₹
                </span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount"
                  className="pl-7 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              {/* Quick Packs for Gaming or Recharge */}
              {(activeCat === 'gaming' || activeCat === 'recharge') && (
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {(activeCat === 'gaming' ? quickPacksGaming : quickPacksRecharge).map((p) => (
                    <button
                      key={p.inr + p.desc}
                      type="button"
                      onClick={() => setAmount(p.inr)}
                      className={cn(
                        'p-2 rounded-xl border text-left text-[11px] transition-all cursor-pointer',
                        amount === p.inr
                          ? 'border-[#f7a83b] bg-amber-400/15 text-slate-900 dark:text-white font-extrabold shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                      )}
                    >
                      <span className="font-extrabold text-slate-900 dark:text-white block font-mono">
                        ₹{p.inr}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">{p.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* USDT Conversion Banner */}
            <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
                  Estimated USDT Deducted
                </span>
                <span className="text-sm font-extrabold text-[#f7a83b] dark:text-[#f7a83b] font-mono">
                  {usdtEquivalent} USDT
                </span>
              </div>
              <div className="text-right text-[10px] text-slate-400 font-mono">
                1 USDT ≈ ₹{rate}
              </div>
            </div>

            {/* Submit CTA */}
            <Button
              onClick={handlePay}
              disabled={isProcessing || !amount || parseFloat(amount) <= 0}
              className="w-full py-3 rounded-2xl font-black bg-[#f7a83b] hover:bg-[#f59e26] text-slate-950 shadow-md shadow-amber-400/20 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isProcessing ? (
                <span>Authorizing USDT Escrow...</span>
              ) : (
                <>
                  <span>Pay ₹{amount || 0} with USDT</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

