import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  QrCode,
  Zap,
  TrendingUp,
  Wallet,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Gift,
  CreditCard,
  Percent,
} from 'lucide-react'
import { api } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

// Reusable components matching Reference Screenshots (p2pdex.io & FundFusion Landing Page)
import { TotalAssetsCard } from './components/TotalAssetsCard'
import { QuickActionGrid } from './components/QuickActionGrid'
import { PromoBannerCard } from './components/PromoBannerCard'
import { QuickUtilitiesSection } from './components/QuickUtilitiesSection'
import { PromotionalCampaignBanner } from './components/PromotionalCampaignBanner'
import { FullServicesMenu } from './components/FullServicesMenu'

// Interactive Feature Modals
import { DepositModal } from './components/DepositModal'
import { BillPaymentModal } from './components/BillPaymentModal'
import { GiftCardsModal } from './components/GiftCardsModal'
import { OffersModal } from './components/OffersModal'
import { LeaderboardModal } from './components/LeaderboardModal'
import { CardlessCashModal } from './components/CardlessCashModal'
import { ReferralModal } from './components/ReferralModal'
import { SearchTokenModal } from './components/SearchTokenModal'
import {
  AboutModal,
  BecomeMerchantModal,
  PayoutApiModal,
  BulkPayoutModal,
  AffiliateModal,
} from './components/InfoModals'

type Overview = {
  simulated: boolean
  usdtInrRate: string
  wallet: { availableUsdt: string; lockedUsdt: string; totalUsdt: string; inrEstimate: string }
  totals: { transactions: number }
  recent: { id: string; type: string; status: string; amount: string; asset: string; createdAt: string }[]
}

export function CustomerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'home'
  const navigate = useNavigate()

  // Modal States
  const [isDepositOpen, setIsDepositOpen] = useState(false)
  const [isBillsOpen, setIsBillsOpen] = useState(false)
  const [selectedBillCat, setSelectedBillCat] = useState<
    'gaming' | 'recharge' | 'electricity' | 'dth' | 'broadband' | 'gas' | 'water' | 'fastag'
  >('recharge')
  const [isGiftsOpen, setIsGiftsOpen] = useState(false)
  const [isOffersOpen, setIsOffersOpen] = useState(false)
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false)
  const [isCashOpen, setIsCashOpen] = useState(false)
  const [isReferralOpen, setIsReferralOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isMerchantOpen, setIsMerchantOpen] = useState(false)
  const [isPayoutApiOpen, setIsPayoutApiOpen] = useState(false)
  const [isBulkPayoutOpen, setIsBulkPayoutOpen] = useState(false)
  const [isAffiliateOpen, setIsAffiliateOpen] = useState(false)

  // Balance updates
  const [addedDepositBalance, setAddedDepositBalance] = useState(0)
  const [spentBalance, setSpentBalance] = useState(0)
  const [localEarnedBal, setLocalEarnedBal] = useState(() =>
    parseFloat(localStorage.getItem('fundfusion_customer_balance') || '0')
  )

  useEffect(() => {
    const handleSync = () => {
      setLocalEarnedBal(parseFloat(localStorage.getItem('fundfusion_customer_balance') || '0'))
    }
    window.addEventListener('fundfusion_customer_sync', handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener('fundfusion_customer_sync', handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  const q = useQuery({
    queryKey: ['overview'],
    queryFn: () => api<Overview>('/customer/overview').catch(() => null),
    retry: false,
  })

  if (q.isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto w-full p-2">
        <Skeleton className="h-40 rounded-[28px]" />
        <div className="grid grid-cols-4 gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="h-28 rounded-[28px]" />
        <Skeleton className="h-36 rounded-[28px]" />
      </div>
    )
  }

  const d = q.data
  const usdtInrRate = d?.usdtInrRate || '91.50'
  const rateNum = parseFloat(usdtInrRate) || 91.5
  const baseUsdt = parseFloat(d?.wallet?.totalUsdt || '0.00') || 0
  const netBalance = Math.max(0, baseUsdt + addedDepositBalance + localEarnedBal - spentBalance)
  const totalUsdt = netBalance.toFixed(2)
  const inrEstimate = (netBalance * rateNum).toFixed(2)

  // Handle Quick Action Grid clicks
  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'gaming':
        setSelectedBillCat('gaming')
        setIsBillsOpen(true)
        break
      case 'gifts':
        navigate('/customer/gift-cards')
        break
      case 'bills':
        setSelectedBillCat('recharge')
        setIsBillsOpen(true)
        break
      case 'offers':
        setIsOffersOpen(true)
        break
      case 'community':
        setIsReferralOpen(true)
        break
      default:
        break
    }
  }

  // Handle Banner action clicks
  const handleBannerAction = (type: 'bills' | 'gifts' | 'p2p') => {
    if (type === 'bills') {
      setSelectedBillCat('recharge')
      setIsBillsOpen(true)
    } else if (type === 'gifts') {
      navigate('/customer/gift-cards')
    } else {
      navigate('/customer/buy')
    }
  }

  // Handle successful bill pay or voucher buy deduction
  const handleDeductBalance = (_inr: number, usdtAmount: number) => {
    setSpentBalance((prev) => prev + usdtAmount)
  }

  return (
    <div className="space-y-3.5 sm:space-y-4 max-w-5xl mx-auto w-full pb-1 overflow-x-hidden min-w-0 transition-all">
      {/* View Switcher based on query param: ?tab=menu or ?tab=leaderboard or Home */}
      {activeTab === 'menu' ? (
        /* ================= 1. FULL SERVICES MENU (SCREENSHOTS 1 & 2) ================= */
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">All Services</h2>
              <p className="text-xs text-slate-400">Complete catalog of platform utilities & tools</p>
            </div>
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
            >
              Back to Home
            </button>
          </div>

          <FullServicesMenu
            onOpenDeposit={() => setIsDepositOpen(true)}
            onOpenBills={(cat) => {
              setSelectedBillCat(cat || 'recharge')
              setIsBillsOpen(true)
            }}
            onOpenGifts={() => navigate('/customer/gift-cards')}
            onOpenVirtualCard={() => setIsCardsOpen(true)}
            onOpenCardlessCash={() => setIsCashOpen(true)}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
            onOpenOffers={() => setIsOffersOpen(true)}
            onOpenReferral={() => setIsReferralOpen(true)}
            onOpenAbout={() => setIsAboutOpen(true)}
            onOpenMerchant={() => setIsMerchantOpen(true)}
            onOpenPayoutApi={() => setIsPayoutApiOpen(true)}
            onOpenBulkPayout={() => setIsBulkPayoutOpen(true)}
            onOpenAffiliate={() => setIsAffiliateOpen(true)}
          />
        </div>
      ) : activeTab === 'leaderboard' ? (
        /* ================= 2. RICH LEADERBOARD VIEW ================= */
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="text-amber-500">🏆</span> Trader Leaderboard
              </h2>
              <p className="text-[11px] text-slate-400">Top volume makers & verified merchants</p>
            </div>
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
            >
              Back to Home
            </button>
          </div>

          {/* User Rank Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#f7a83b] to-amber-400 text-slate-950 font-bold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/40 text-slate-950 flex items-center justify-center font-black text-sm shadow-2xs">
                #42
              </div>
              <div>
                <span className="text-xs font-black block text-slate-950">Your Performance</span>
                <span className="text-[11px] text-slate-900 font-semibold">Volume: $1,250 USDT</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-900 block font-semibold">Rebate Earned</span>
              <span className="text-xs font-black font-mono text-slate-950">₹1,140</span>
            </div>
          </div>

          {/* Top Ranked Traders List */}
          <div className="space-y-2">
            {[
              { rank: 1, name: 'CryptoRider_IND', volume: '$124,500', profit: '+₹1,18,000', badge: '🥇 Top Maker' },
              { rank: 2, name: 'DexPro_Mumbai', volume: '$98,200', profit: '+₹94,500', badge: '🥈 High Volume' },
              { rank: 3, name: 'NexoraMerchant_99', volume: '$87,400', profit: '+₹82,100', badge: '🥉 Verified Desk' },
              { rank: 4, name: 'BangaloreSwaps', volume: '$62,100', profit: '+₹58,400', badge: '⚡ <45s Fast' },
              { rank: 5, name: 'DelhiP2P_Trader', volume: '$54,800', profit: '+₹51,000', badge: '🛡️ 100% Escrow' },
              { rank: 6, name: 'Kolkata_CryptoHub', volume: '$46,300', profit: '+₹42,800', badge: '⭐ 4.98' },
            ].map((t) => (
              <div
                key={t.rank}
                className="p-3 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={
                      t.rank === 1
                        ? 'w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-xs font-black shrink-0'
                        : t.rank === 2
                        ? 'w-6 h-6 rounded-full bg-slate-300 text-slate-800 flex items-center justify-center text-xs font-black shrink-0'
                        : t.rank === 3
                        ? 'w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center text-xs font-black shrink-0'
                        : 'w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold shrink-0'
                    }
                  >
                    {t.rank}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {t.name}
                      </span>
                      <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full shrink-0">
                        {t.badge}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Vol: {t.volume}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                    {t.profit}
                  </span>
                  <span className="text-[9px] text-slate-400">Net Earned</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ================= 3. HOME DASHBOARD (SCREENSHOT 3 EXACT LAYOUT) ================= */
        <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-200">
          {/* 1. Total Balance Card Matching Screenshot 3 ($0.00, Green Deposit, Dark Forest Sell Crypto) */}
          <TotalAssetsCard
            totalUsdt={totalUsdt}
            inrEstimate={inrEstimate}
            usdtInrRate={usdtInrRate}
            onOpenDeposit={() => setIsDepositOpen(true)}
            onOpenSell={() => navigate('/customer/sell')}
          />

          {/* 2. Quick Action Grid (2 rows x 4 buttons: Wallet, Buy, Gifts, Bills, Offers, Cards, Community, More) */}
          <QuickActionGrid
            onOpenMore={() => setSearchParams({ tab: 'menu' })}
            onAction={handleQuickAction}
          />

          {/* 3. Promotional Banner (Replacing Telegram bot with Mobile Recharge, Bill Payments & Gift Cards) */}
          <PromoBannerCard onOpenAction={handleBannerAction} />

          {/* 4. Instant Bill Pay & Recharge (Mobile, Electricity, DTH, Broadband) + Top Gift Cards */}
          <QuickUtilitiesSection
            onOpenBills={(cat) => {
              setSelectedBillCat(cat)
              setIsBillsOpen(true)
            }}
            onOpenGifts={() => navigate('/customer/gift-cards')}
          />

          {/* 5. Promotional Campaign Banner (Replacing P2P Rates Section) */}
          <PromotionalCampaignBanner
            onOpenReferral={() => setIsReferralOpen(true)}
            onOpenOffers={() => setIsOffersOpen(true)}
          />

          {/* 6. Instant UPI & QR Scanner Floating Banner */}
          <div className="rounded-[24px] bg-gradient-to-r from-amber-400/10 via-yellow-400/10 to-orange-400/10 border border-amber-400/25 p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-[#f7a83b] text-slate-950 flex items-center justify-center shadow-md shadow-amber-400/20 shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block leading-snug">
                  Instant UPI & QR Settlements
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight mt-0.5">
                  Scan any merchant QR code to pay with USDT at zero fee
                </span>
              </div>
            </div>
            <Link
              to="/customer/pay/scan"
              className="shrink-0 px-4 py-2 rounded-full text-xs font-black bg-[#f7a83b] hover:bg-[#f59e26] text-slate-950 transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              Scan QR
            </Link>
          </div>
        </div>
      )}

      {/* ================= INTERACTIVE MODALS ================= */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onDepositSuccess={(amt) => setAddedDepositBalance((prev) => prev + amt)}
      />

      <BillPaymentModal
        isOpen={isBillsOpen}
        onClose={() => setIsBillsOpen(false)}
        initialCategory={selectedBillCat}
        onPaymentSuccess={handleDeductBalance}
      />

      <GiftCardsModal
        isOpen={isGiftsOpen}
        onClose={() => setIsGiftsOpen(false)}
        onBuySuccess={handleDeductBalance}
      />

      <OffersModal
        isOpen={isOffersOpen}
        onClose={() => setIsOffersOpen(false)}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />

      <CardlessCashModal
        isOpen={isCashOpen}
        onClose={() => setIsCashOpen(false)}
      />

      <ReferralModal
        isOpen={isReferralOpen}
        onClose={() => setIsReferralOpen(false)}
      />

      <SearchTokenModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <BecomeMerchantModal
        isOpen={isMerchantOpen}
        onClose={() => setIsMerchantOpen(false)}
      />

      <PayoutApiModal
        isOpen={isPayoutApiOpen}
        onClose={() => setIsPayoutApiOpen(false)}
      />

      <BulkPayoutModal
        isOpen={isBulkPayoutOpen}
        onClose={() => setIsBulkPayoutOpen(false)}
      />

      <AffiliateModal
        isOpen={isAffiliateOpen}
        onClose={() => setIsAffiliateOpen(false)}
      />
    </div>
  )
}
