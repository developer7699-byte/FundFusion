import { useState } from 'react'
import { X, Landmark, Banknote, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CardlessCashModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CardlessCashModal({ isOpen, onClose }: CardlessCashModalProps) {
  if (!isOpen) return null

  const [amount, setAmount] = useState('2000')
  const [phone, setPhone] = useState('9876543210')
  const [bank, setBank] = useState('SBI / Any ATM')
  const [isGenerated, setIsGenerated] = useState(false)
  const [cashOtp, setCashOtp] = useState<string | null>(null)

  const handleGenerate = () => {
    setIsGenerated(true)
    setCashOtp(`${Math.floor(100000 + Math.random() * 900000)}`)
  }

  const rate = 91.5
  const usdtEst = (parseFloat(amount || '0') / rate).toFixed(2)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-[360px] bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Banknote className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Cardless ATM Cash-Out
              </h3>
              <p className="text-[11px] text-slate-500">Withdraw physical cash from any ATM using USDT</p>
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

        {cashOtp ? (
          <div className="p-6 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                OTP Generated
              </span>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                ₹{amount} Instant Cash
              </h4>
              <p className="text-xs text-slate-500">USDT Escrow locked: {usdtEst} USDT</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Your 6-Digit ATM Cash PIN
              </span>
              <div className="font-mono text-2xl font-black tracking-widest text-emerald-600 dark:text-emerald-400">
                {cashOtp}
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                Enter this 6-digit code at any SBI, HDFC, or ICICI ATM under "Cardless Cash Withdrawal". Valid for 15 minutes.
              </p>
            </div>

            <Button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl font-bold bg-[#22c55e] hover:bg-[#16a34a] text-white"
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="p-4 space-y-4 overflow-y-auto">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Withdrawal Amount (₹ INR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  ₹
                </span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {['500', '1000', '2000', '5000'].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAmount(a)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold font-mono hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    ₹{a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Registered Mobile Number
              </label>
              <Input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-xl text-xs font-mono font-bold"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
                  Estimated USDT Deducted
                </span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {usdtEst} USDT
                </span>
              </div>
              <div className="text-right text-[10px] text-slate-400 font-mono">
                1 USDT ≈ ₹{rate}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              className="w-full py-3 rounded-2xl font-bold bg-[#22c55e] hover:bg-[#16a34a] text-white shadow-md shadow-emerald-500/20 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Generate ATM Cashout Code</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

