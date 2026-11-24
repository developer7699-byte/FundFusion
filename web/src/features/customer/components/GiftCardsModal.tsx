import { useState } from 'react'
import {
  X,
  Gift,
  Copy,
  Check,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface GiftCardsModalProps {
  isOpen: boolean
  onClose: () => void
  onBuySuccess?: (inrAmount: number, usdtAmount: number) => void
}

interface BrandItem {
  id: string
  name: string
  category: string
  cashback: string
  color: string
  bg: string
  denominations: number[]
}

const BRANDS: BrandItem[] = [
  {
    id: 'amazon',
    name: 'Amazon Pay',
    category: 'Shopping & Recharges',
    cashback: '5% Cashback',
    color: 'text-amber-600',
    bg: 'bg-amber-500/10',
    denominations: [250, 500, 1000, 2000, 5000],
  },
  {
    id: 'flipkart',
    name: 'Flipkart Voucher',
    category: 'Electronics & Retail',
    cashback: '4% Cashback',
    color: 'text-blue-600',
    bg: 'bg-blue-500/10',
    denominations: [250, 500, 1000, 2500, 5000],
  },
  {
    id: 'googleplay',
    name: 'Google Play Gift Code',
    category: 'Apps & Gaming',
    cashback: '2% Cashback',
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    denominations: [100, 250, 500, 1000],
  },
  {
    id: 'apple',
    name: 'Apple App Store & iTunes',
    category: 'Music & Subscriptions',
    cashback: '2% Cashback',
    color: 'text-slate-800 dark:text-slate-200',
    bg: 'bg-slate-500/10',
    denominations: [250, 500, 1000, 2000],
  },
  {
    id: 'swiggy',
    name: 'Swiggy Money',
    category: 'Food & Instamart',
    cashback: '6% Cashback',
    color: 'text-orange-600',
    bg: 'bg-orange-500/10',
    denominations: [150, 250, 500, 1000],
  },
  {
    id: 'zomato',
    name: 'Zomato Dining & Delivery',
    category: 'Food & Dining',
    cashback: '5% Cashback',
    color: 'text-rose-600',
    bg: 'bg-rose-500/10',
    denominations: [200, 500, 1000],
  },
  {
    id: 'myntra',
    name: 'Myntra Fashion',
    category: 'Apparel & Footwear',
    cashback: '8% Cashback',
    color: 'text-pink-600',
    bg: 'bg-pink-500/10',
    denominations: [500, 1000, 2000],
  },
  {
    id: 'uber',
    name: 'Uber Rides & Eats',
    category: 'Cabs & Commute',
    cashback: '3% Cashback',
    color: 'text-slate-900 dark:text-white',
    bg: 'bg-slate-900/10',
    denominations: [250, 500, 1000],
  },
]

export function GiftCardsModal({ isOpen, onClose, onBuySuccess }: GiftCardsModalProps) {
  if (!isOpen) return null

  const [selectedBrand, setSelectedBrand] = useState<BrandItem>(BRANDS[0])
  const [selectedDenom, setSelectedDenom] = useState<number>(500)
  const [isProcessing, setIsProcessing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)

  const rate = 91.5
  const usdtEquivalent = (selectedDenom / rate).toFixed(2)

  const handleBuy = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      const mockCode = `${selectedBrand.id.toUpperCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`
      setGeneratedCode(mockCode)
      if (onBuySuccess) {
        onBuySuccess(selectedDenom, parseFloat(usdtEquivalent))
      }
    }, 1100)
  }

  const handleCopy = () => {
    if (generatedCode) {
      navigator.clipboard?.writeText(generatedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDone = () => {
    setGeneratedCode(null)
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
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Digital Gift Vouchers
              </h3>
              <p className="text-[11px] text-slate-500">100+ Brands · Instant Delivery</p>
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

        {generatedCode ? (
          /* Success Screen with Voucher Code */
          <div className="p-6 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                Voucher Generated Instantly
              </span>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {selectedBrand.name} ₹{selectedDenom}
              </h4>
              <p className="text-xs text-slate-500">Paid: {usdtEquivalent} USDT from wallet</p>
            </div>

            {/* Voucher Code Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                Your Digital Code / PIN
              </span>
              <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-mono text-sm font-black text-slate-900 dark:text-white tracking-wider">
                  {generatedCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 text-left pt-1">
                Redeem on {selectedBrand.name} app or website at checkout. Valid for 12 months.
              </p>
            </div>

            <Button
              onClick={handleDone}
              className="w-full py-2.5 rounded-xl font-bold bg-[#22c55e] hover:bg-[#16a34a] text-white"
            >
              Done & Save Voucher
            </Button>
          </div>
        ) : (
          /* Selection Form */
          <div className="p-4 space-y-4 overflow-y-auto">
            {/* Select Brand Grid */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                Select Brand
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-0.5 no-scrollbar">
                {BRANDS.map((b) => {
                  const isSelected = selectedBrand.id === b.id
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setSelectedBrand(b)
                        setSelectedDenom(b.denominations[0])
                      }}
                      className={cn(
                        'p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20',
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-emerald-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {b.name}
                        </span>
                        <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full">
                          {b.cashback}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 truncate">{b.category}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Select Denomination */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                Choose Value (₹ INR)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {selectedBrand.denominations.map((denom) => (
                  <button
                    key={denom}
                    type="button"
                    onClick={() => setSelectedDenom(denom)}
                    className={cn(
                      'py-2 px-1 rounded-xl border text-center transition-all cursor-pointer',
                      selectedDenom === denom
                        ? 'border-[#f7a83b] bg-[#f7a83b] text-slate-950 font-black shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 font-bold text-xs'
                    )}
                  >
                    <span className="text-xs font-mono font-bold block">₹{denom}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Preview Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
                  Total USDT to Deduct
                </span>
                <span className="text-base font-extrabold text-[#f7a83b] dark:text-[#f7a83b] font-mono">
                  {usdtEquivalent} USDT
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Voucher Value</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                  ₹{selectedDenom}
                </span>
              </div>
            </div>

            {/* Buy CTA Button */}
            <Button
              onClick={handleBuy}
              disabled={isProcessing}
              className="w-full py-3 rounded-2xl font-black bg-[#f7a83b] hover:bg-[#f59e26] text-slate-950 shadow-md shadow-amber-400/20 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isProcessing ? (
                <span>Generating Digital PIN...</span>
              ) : (
                <>
                  <span>Buy {selectedBrand.name} Voucher</span>
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

