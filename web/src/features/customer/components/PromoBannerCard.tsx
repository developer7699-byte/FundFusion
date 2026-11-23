import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Zap, Gift, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PromoBannerCardProps {
  onOpenAction?: (type: 'bills' | 'gifts' | 'p2p') => void
}

export function PromoBannerCard({ onOpenAction }: PromoBannerCardProps) {
  const slides = [
    {
      id: 'bills',
      title: 'Pay Utility Bills & Recharge',
      subtitle: 'INSTANT MOBILE, ELECTRICITY & DTH VIA USDT',
      cta: 'Pay Bills Now',
      type: 'bills' as const,
      link: '/customer/utilities',
    },
    {
      id: 'gifts',
      title: '100+ Digital Brand Gift Cards',
      subtitle: 'AMAZON, FLIPKART & SWIGGY DELIVERED INSTANTLY',
      cta: 'Explore Gift Cards',
      type: 'gifts' as const,
      link: '/customer/gift-cards',
    },
    {
      id: 'p2p',
      title: 'Zero-Fee Instant P2P Swaps',
      subtitle: 'BANK & UPI ESCROW TRANSFERS IN <60 SECONDS',
      cta: 'Trade USDT Now',
      type: 'p2p' as const,
      link: '/customer/buy',
    },
  ]

  const [currentIdx, setCurrentIdx] = useState(0)

  // Auto-rotate every 5 seconds
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
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Content Centered Matching Screenshot 3 */}
        <div className="relative z-10 flex flex-col items-center justify-center space-y-1.5 py-1">
          <h4 className="text-base sm:text-lg font-black tracking-tight leading-snug">
            {current.title}
          </h4>

          <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-emerald-200/90 pb-2.5">
            {current.subtitle}
          </p>

          {/* White Capsule Action Button Matching Screenshot 3 */}
          {current.type === 'gifts' ? (
            <Link
              to="/customer/gift-cards"
              className="px-6 py-2 rounded-full bg-white text-slate-950 font-extrabold text-xs sm:text-sm hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <span>{current.cta}</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          ) : onOpenAction ? (
            <button
              type="button"
              onClick={() => onOpenAction(current.type)}
              className="px-6 py-2 rounded-full bg-white text-slate-950 font-extrabold text-xs sm:text-sm hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <span>{current.cta}</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          ) : (
            <Link
              to={current.link}
              className="px-6 py-2 rounded-full bg-white text-slate-950 font-extrabold text-xs sm:text-sm hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <span>{current.cta}</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          )}

          {/* Dots Indicator */}
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
