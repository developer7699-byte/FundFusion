import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ArrowRight,
  Gift,
  Users,
  Zap,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Flame,
  Award,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PromotionalCampaignBannerProps {
  onOpenReferral?: () => void
  onOpenOffers?: () => void
}

export function PromotionalCampaignBanner({
  onOpenReferral,
  onOpenOffers,
}: PromotionalCampaignBannerProps) {
  const campaigns = [
    {
      id: 'referral',
      badge: '🔥 EXCLUSIVE BONANZA',
      pill: 'Earn 50 USDT',
      title: 'Invite Friends & Earn up to 500 USDT',
      description: 'Get instant 10% commission on every USDT swap & gift voucher your network trades.',
      cta: 'Invite Friends Now',
      action: onOpenReferral,
      link: '/customer/gift-cards',
      stats: ['⚡ Instant Credited', '👥 Unlimited Referrals', '💰 10% Rebate'],
      floatingBadge: {
        value: '+50 USDT',
        label: 'Per Friend',
        icon: Users,
      },
      gradient: 'from-amber-400/25 via-yellow-400/15 to-orange-400/10 dark:from-amber-500/15 dark:via-yellow-500/10 dark:to-orange-500/5',
      border: 'border-amber-400/40 dark:border-amber-500/30',
      accentColor: 'text-[#f7a83b]',
    },
    {
      id: 'cashback',
      badge: '🎁 SPECIAL REWARDS',
      pill: 'Flat 5% Back',
      title: '5% Instant Cashback on 100+ Brands',
      description: 'Amazon, Flipkart, Swiggy, Zomato & Free Fire Diamonds delivered in under 60 seconds.',
      cta: 'Explore All Vouchers',
      action: undefined,
      link: '/customer/gift-cards',
      stats: ['🎟️ 100+ Top Brands', '⚡ Zero Gas Surcharge', '🔐 Auto Delivery'],
      floatingBadge: {
        value: '5% OFF',
        label: 'All Vouchers',
        icon: Gift,
      },
      gradient: 'from-orange-400/25 via-amber-400/15 to-yellow-300/10 dark:from-orange-500/15 dark:via-amber-500/10 dark:to-yellow-500/5',
      border: 'border-amber-400/40 dark:border-amber-500/30',
      accentColor: 'text-[#f7a83b]',
    },
    {
      id: 'zero-fee',
      badge: '⚡ ZERO NETWORK FEES',
      title: 'Zero-Fee Escrow Swaps via UPI',
      description: 'Buy or sell USDT directly with verified merchants. 100% bank escrow guarantee.',
      pill: '0% Platform Fee',
      cta: 'Trade USDT Now',
      action: undefined,
      link: '/customer/buy',
      stats: ['🛡️ Verified Escrow', '⚡ <45s Avg. Speed', '🏦 Direct UPI / IMPS'],
      floatingBadge: {
        value: '0% FEE',
        label: 'Direct UPI',
        icon: ShieldCheck,
      },
      gradient: 'from-yellow-400/25 via-amber-400/15 to-orange-400/10 dark:from-yellow-500/15 dark:via-amber-500/10 dark:to-orange-500/5',
      border: 'border-amber-400/40 dark:border-amber-500/30',
      accentColor: 'text-[#f7a83b]',
    },
  ]

  const [activeIdx, setActiveIdx] = useState(0)

  // Auto-rotate every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % campaigns.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [campaigns.length])

  const cur = campaigns[activeIdx]
  const FloatingIcon = cur.floatingBadge.icon

  const handlePrev = () => {
    setActiveIdx((prev) => (prev - 1 + campaigns.length) % campaigns.length)
  }

  const handleNext = () => {
    setActiveIdx((prev) => (prev + 1) % campaigns.length)
  }

  return (
    <div className="w-full relative group">
      <div
        className={cn(
          'w-full rounded-[28px] p-4 sm:p-5 border transition-all duration-300 relative overflow-hidden',
          'bg-gradient-to-br',
          cur.gradient,
          cur.border,
          'shadow-sm bg-white dark:bg-[#111827]'
        )}
      >
        {/* Ambient Decorative Glow Lights */}
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -top-6 -left-6 w-32 h-32 rounded-full bg-yellow-300/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          {/* 1. Header Bar: Badge, Pill & Quick Switcher Arrows */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-[#f7a83b] text-slate-950 shadow-2xs">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>{cur.badge}</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/25">
                {cur.pill}
              </span>
            </div>

            {/* Micro Navigation Arrows */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handlePrev}
                className="w-6 h-6 rounded-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-all cursor-pointer active:scale-90"
                aria-label="Previous Campaign"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="w-6 h-6 rounded-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-all cursor-pointer active:scale-90"
                aria-label="Next Campaign"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2. Main Content & 3D Visual Floating Badge Grid */}
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-black text-slate-950 dark:text-white tracking-tight leading-snug">
                {cur.title}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                {cur.description}
              </p>
            </div>

            {/* Eye-Catching Floating Reward Badge on Right */}
            <div className="shrink-0 flex flex-col items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-tr from-amber-400/20 via-yellow-400/30 to-amber-300/20 border border-amber-400/40 shadow-xs relative p-1.5 text-center">
              <div className="w-6 h-6 rounded-full bg-[#f7a83b] text-slate-950 flex items-center justify-center mb-0.5 shadow-2xs">
                <FloatingIcon className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="text-[11px] font-black text-slate-950 dark:text-white font-mono leading-none block">
                {cur.floatingBadge.value}
              </span>
              <span className="text-[8px] font-bold text-amber-800 dark:text-amber-300 leading-none mt-0.5 block truncate max-w-full">
                {cur.floatingBadge.label}
              </span>
            </div>
          </div>

          {/* 3. Stats Tags Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {cur.stats.map((s) => (
              <span
                key={s}
                className="text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 shrink-0 shadow-2xs"
              >
                {s}
              </span>
            ))}
          </div>

          {/* 4. CTA Button & Pagination Dots */}
          <div className="flex items-center justify-between pt-1">
            {cur.action ? (
              <button
                type="button"
                onClick={cur.action}
                className="px-4 py-2 rounded-xl bg-[#f7a83b] hover:bg-[#f59e26] text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm shadow-amber-400/30 active:scale-95 transition-all cursor-pointer hover:shadow-md"
              >
                <span>{cur.cta}</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            ) : (
              <Link
                to={cur.link}
                className="px-4 py-2 rounded-xl bg-[#f7a83b] hover:bg-[#f59e26] text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm shadow-amber-400/30 active:scale-95 transition-all cursor-pointer hover:shadow-md"
              >
                <span>{cur.cta}</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </Link>
            )}

            {/* Smooth Pagination Indicators */}
            <div className="flex items-center gap-1.5">
              {campaigns.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all cursor-pointer',
                    i === activeIdx
                      ? 'w-5 bg-[#f7a83b]'
                      : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                  )}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
