import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Slide {
  id: string
  title: string
  subtitle: string
  cta: string
  onClick: () => void
}

interface PromoBannerCardProps {
  /** Navigation handlers, so a slide never links to an out-of-scope route. */
  onDeposit: () => void
  onBuy: () => void
  onSell: () => void
}

/**
 * The rotating promo banner from the approved design.
 *
 * Only v1-scope slides survive here: the original gift-card and utility-bill
 * slides are out of scope (PRD §3) and were dropped. What remains is the P2P
 * swap, deposit and sell — the three things v1 actually does.
 */
export function PromoBannerCard({ onDeposit, onBuy, onSell }: PromoBannerCardProps) {
  const slides: Slide[] = [
    {
      id: 'p2p',
      title: 'Zero-Fee Instant P2P USDT Swaps',
      subtitle: 'BANK & UPI ESCROW TRANSFERS SETTLED IN <60 SECONDS',
      cta: 'Trade USDT Now',
      onClick: onBuy,
    },
    {
      id: 'deposit',
      title: 'Top Up Your Wallet with USDT',
      subtitle: 'DEPOSIT ON-CHAIN, CREDITED AFTER 15 CONFIRMATIONS',
      cta: 'Deposit Now',
      onClick: onDeposit,
    },
    {
      id: 'sell',
      title: 'Sell Crypto, Settle to INR',
      subtitle: 'ESCROW-PROTECTED PAYOUTS STRAIGHT TO YOUR BANK',
      cta: 'Sell Crypto',
      onClick: onSell,
    },
  ]

  const [currentIdx, setCurrentIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  const current = slides[currentIdx]

  return (
    <div className="w-full relative">
      <div
        className={cn(
          'w-full rounded-[28px] p-5 sm:p-6 transition-all duration-300 relative overflow-hidden text-center text-white',
          'bg-gradient-to-b from-[#15803d] via-[#166534] to-[#0b291a]',
          'shadow-md shadow-emerald-950/20 border border-emerald-600/30'
        )}
      >
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center space-y-1.5 py-1">
          <h4 className="text-base sm:text-lg font-black tracking-tight leading-snug">
            {current.title}
          </h4>

          <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-emerald-200/90 pb-2.5">
            {current.subtitle}
          </p>

          <button
            type="button"
            onClick={current.onClick}
            className="px-6 py-2 rounded-full bg-white text-slate-950 font-extrabold text-xs sm:text-sm hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <span>{current.cta}</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          <div className="flex items-center gap-1.5 pt-3">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentIdx(idx)}
                className={cn(
                  'h-1.5 rounded-full transition-all cursor-pointer',
                  idx === currentIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
                )}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
