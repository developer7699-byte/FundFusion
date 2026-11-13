import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation, useNavigationType } from 'react-router-dom'
import {
  Home,
  History,
  QrCode,
  Wallet,
  User,
  Bell,
  Gift,
  Download,
  Plus,
  LogOut,
  ChevronRight,
  Wifi,
  Battery,
  Sparkles,
  Sun,
  Moon,
  Smartphone,
  Tablet,
  Monitor,
  Store,
  Layers,
  Search,
  ArrowRight,
  CheckCircle2,
  X,
  Share2,
  Check,
  CheckCircle,
  ShieldCheck,
  ArrowDownToLine,
  ExternalLink,
  BarChart2,
  LineChart,
  ArrowLeftRight,
  ScanLine,
  Flame,
  UserPlus,
  LayoutGrid,
  Trophy,
  ReceiptText,
  Menu,
  HelpCircle,
} from 'lucide-react'
import { SearchTokenModal } from '@/features/customer/components/SearchTokenModal'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/lib/notifications'
import { useLanguage } from '@/lib/language'

// Global scroll position memory across tabs and routes within this session
const scrollMemory = new Map<string, number>()

export function MobileSimulatorLayout({
  panelType = 'customer',
  sideLinks = [],
}: {
  panelType?: 'customer' | 'merchant'
  sideLinks?: [string, string][]
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const navType = useNavigationType()
  const { theme, toggle, setTheme } = useTheme()
  const { unreadCount } = useNotifications()
  const { language, t } = useLanguage()

  // Scroll Container Ref & Dynamic Restoration
  const contentRef = useRef<HTMLDivElement>(null)
  const currentKey = location.pathname + location.search
  const prevKeyRef = useRef(currentKey)
  const isRestoringScroll = useRef(false)

  // Scroll Restoration: restores previous scroll when navigating Back or returning to Home,
  // while starting brand new pages cleanly from top (0)
  useLayoutEffect(() => {
    const prevKey = prevKeyRef.current
    prevKeyRef.current = currentKey
    const container = contentRef.current
    if (!container) return

    // POP navigation means user pressed back or forward
    const isPop = navType === 'POP'
    // Also handle returning to home (/customer/dashboard) from a sub-screen or modal flow
    const isReturningToHome =
      !isPop &&
      currentKey === '/customer/dashboard' &&
      prevKey !== '/customer/dashboard' &&
      scrollMemory.has(currentKey)

    if (isPop || isReturningToHome) {
      const savedScroll = scrollMemory.get(currentKey) ?? 0
      isRestoringScroll.current = true

      // Immediately set scrollTop
      container.scrollTop = savedScroll

      // Re-apply across animation frames & ticks in case dynamic content/cards take a tick to mount
      const raf = requestAnimationFrame(() => {
        if (container) container.scrollTop = savedScroll
      })
      const t1 = setTimeout(() => {
        if (container) container.scrollTop = savedScroll
      }, 40)
      const t2 = setTimeout(() => {
        if (container) container.scrollTop = savedScroll
        isRestoringScroll.current = false
      }, 150)

      return () => {
        cancelAnimationFrame(raf)
        clearTimeout(t1)
        clearTimeout(t2)
        isRestoringScroll.current = false
      }
    } else {
      // New forward navigation (e.g. user clicked Profile, Wallet, Transactions, etc.)
      // Always start fresh from the very top (0) as requested!
      container.scrollTop = 0
      scrollMemory.set(currentKey, 0)
    }
  }, [currentKey, navType])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isRestoringScroll.current) return
    const key = location.pathname + location.search
    scrollMemory.set(key, e.currentTarget.scrollTop)
  }

  // Layout & Device View States
  const [viewMode, setViewMode] = useState<'phone' | 'tablet' | 'fluid'>('phone')
  const isPhoneFrame = viewMode === 'phone'
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const [sellRate, setSellRate] = useState('97.32')
  const [isRateUp, setIsRateUp] = useState(true)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const [downloadComplete, setDownloadComplete] = useState(false)

  // Live time ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      setCurrentTime(`${hours}:${minutes}`)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Simulated live rate fluctuation centered near 97.32
  useEffect(() => {
    const rateTimer = setInterval(() => {
      const delta = (Math.random() * 0.06 - 0.03).toFixed(2)
      const newRate = (97.32 + parseFloat(delta)).toFixed(2)
      setSellRate(newRate)
      setIsRateUp(parseFloat(delta) >= 0)
    }, 7000)
    return () => clearInterval(rateTimer)
  }, [])

  const handleSimulatedDownload = () => {
    if (downloadProgress !== null) return
    setDownloadProgress(10)
    setDownloadComplete(false)

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev === null) return 10
        if (prev >= 90) {
          clearInterval(interval)
          setDownloadProgress(100)
          setTimeout(() => {
            setDownloadComplete(true)
            setDownloadProgress(null)
          }, 600)
          return 100
        }
        return prev + 25
      })
    }, 200)
  }

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.origin)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const defaultCustomerSideLinks: [string, string][] = [
    ['/customer/dashboard', 'Overview'],
    ['/customer/wallet', 'Wallet'],
    ['/customer/buy', 'Buy USDT'],
    ['/customer/sell', 'Sell USDT'],
    ['/customer/convert', 'Convert'],
    ['/customer/pay', 'Scan & Pay QR'],
    ['/customer/orders', 'My Orders'],
    ['/customer/transactions', 'Transactions'],
    ['/customer/gift-cards', 'Gift Cards'],
    ['/customer/utilities', 'Recharges & Bills'],
    ['/customer/notifications', 'Alerts & Notices'],
    ['/customer/support', 'Support Desk'],
    ['/customer/referrals', 'Referrals'],
    ['/customer/profile', 'Profile'],
    ['/customer/settings', 'Settings'],
  ]

  const defaultMerchantSideLinks: [string, string][] = [
    ['/merchant/dashboard', 'Overview'],
    ['/merchant/available-orders', 'Available Orders'],
    ['/merchant/active-orders', 'Active Orders'],
    ['/merchant/completed-orders', 'Completed Orders'],
    ['/merchant/orders', 'All Orders'],
    ['/merchant/wallet', 'Merchant Wallet'],
    ['/merchant/earnings', 'Earnings & Fees'],
    ['/merchant/profile', 'Merchant Profile'],
  ]

  const linksToUse = sideLinks.length > 0 ? sideLinks : panelType === 'merchant' ? defaultMerchantSideLinks : defaultCustomerSideLinks
  const isMerchant = panelType === 'merchant'

  // Navigation dock items (Matching Reference Screenshots 1, 2 & 3: Home, Leaderboard, Scan & Pay, Transactions, Menu)
  const customerNav = [
    { to: '/customer/dashboard', label: t('nav.home'), icon: LayoutGrid },
    { to: '/customer/dashboard?tab=leaderboard', label: t('nav.leaderboard'), icon: Trophy },
    { to: '/customer/pay/scan', label: '', icon: QrCode, isCenter: true },
    { to: '/customer/transactions', label: t('nav.transactions'), icon: ReceiptText },
    { to: '/customer/dashboard?tab=menu', label: t('nav.menu'), icon: Menu },
  ]

  const merchantNav = [
    { to: '/merchant/dashboard', label: 'Home', icon: Home },
    { to: '/merchant/orders', label: 'Orders', icon: History },
    { to: '/merchant/available-orders', label: 'Available', icon: Store, isCenter: true },
    { to: '/merchant/wallet', label: 'Wallet', icon: Wallet },
    { to: '/merchant/profile', label: 'Profile', icon: User },
  ]

  const bottomNav = isMerchant ? merchantNav : customerNav

  return (
    <div className="min-h-screen bg-[#edf2f9] text-slate-900 flex flex-col items-center justify-center font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden p-0 sm:p-4 md:p-6">
      {/* Subtle Ambient Glow Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Central Viewport Frame - Sleek Smartphone Simulator */}
      <main
        data-theme={theme}
        className={cn(
          'w-full sm:max-w-[412px] h-screen sm:h-[870px] sm:max-h-[96vh] rounded-none sm:rounded-[50px] border-0 sm:border-[11px] border-slate-900 dark:border-[#131b2e] shadow-none sm:shadow-[0_25px_80px_-15px_rgba(0,0,0,0.35)] sm:ring-1 sm:ring-black/10 dark:sm:ring-white/10 z-10 flex flex-col relative overflow-hidden transition-all duration-300',
          '[transform:translateZ(0)]',
          'bg-white dark:bg-[#0b1020] text-slate-900 dark:text-slate-100'
        )}
      >
        {/* Integrated Mobile Phone Top Status Bar (Inside Phone Screen) */}
        <div className="bg-white/95 dark:bg-[#0b1020]/95 backdrop-blur-md px-5 pt-3 pb-1.5 flex items-center justify-between text-xs text-slate-800 dark:text-slate-200 select-none shrink-0 z-30 transition-colors border-b border-transparent">
          {/* Left: Real-time Clock */}
          <div className="text-[12px] font-extrabold tracking-tight pl-1 font-mono">
            {currentTime || '09:41'}
          </div>

          {/* Center: Dynamic Island / Camera Notch */}
          <div className="flex items-center gap-2 px-3 py-1 bg-black text-white rounded-full shadow-inner text-[10px]">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700/80 shrink-0" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {/* Right: Dark Mode Toggle inside phone screen + Wifi + Battery */}
          <div className="flex items-center gap-2 pr-1">
            {/* Theme Toggle Button INSIDE mobile screen */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-700 fill-slate-700" />
              )}
            </button>
            <Wifi className="w-3.5 h-3.5 stroke-[2.2]" />
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] font-bold">98%</span>
              <Battery className="w-4 h-4 stroke-[2.2] fill-current" />
            </div>
          </div>
        </div>

        {/* Top Header Bar Matching Exact Reference Image */}
        {!location.pathname.includes('/buy') &&
          !location.pathname.includes('/sell') &&
          !location.pathname.includes('/pay/scan') &&
          !location.pathname.includes('/deposit') && (
            !isMerchant ? (
              /* CUSTOMER HEADER MATCHING REFERENCE SCREENSHOT 3 EXACTLY */
              <header className="bg-white/95 dark:bg-[#0b1020]/95 backdrop-blur-md px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800/80 z-20 shrink-0 sticky top-0 transition-colors">
                {/* 1. Purple Gradient Profile Avatar Circle */}
                <NavLink
                  to="/customer/profile"
                  title="My Profile"
                  className="relative group shrink-0 cursor-pointer"
                  aria-label="View user profile"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-500 to-sky-400 p-0.5 shadow-xs transition-transform group-hover:scale-105 active:scale-95 flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white">
                      <User className="w-4.5 h-4.5" />
                    </div>
                  </div>
                </NavLink>

                {/* 2. Middle Search Bar Pill: 🔍 Search Gift Vouchers */}
                <div className="flex-1 min-w-0 max-w-md">
                  <button
                    type="button"
                    onClick={() => setIsSearchModalOpen(true)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3.5 py-1.5 sm:py-2 rounded-full text-left transition-all duration-200 cursor-pointer shadow-xs',
                      'bg-slate-100/90 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60',
                      'hover:bg-slate-200/70 dark:hover:bg-slate-800',
                      'text-slate-500 dark:text-slate-400'
                    )}
                    aria-label="Search Gift Vouchers, Bills and Services"
                  >
                    <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-medium tracking-tight truncate">
                      {t('header.search')}
                    </span>
                  </button>
                </div>

                {/* 3. Right Action Icons (Theme Toggle, Scan QR, Help ?, Notification Bell 9+) */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {/* Theme Toggle Button (Navbar icon for instant mobile theme switch) */}
                  <button
                    type="button"
                    onClick={(e) => toggle(e)}
                    className="p-1.5 sm:p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                    title={theme === 'dark' ? t('header.themeLight') : t('header.themeDark')}
                    aria-label="Toggle theme"
                  >
                    {theme === 'dark' ? (
                      <Sun className="w-5 h-5 text-amber-400 fill-amber-400/20 stroke-[2]" />
                    ) : (
                      <Moon className="w-5 h-5 text-slate-700 fill-slate-700/20 stroke-[2]" />
                    )}
                  </button>

                  {/* Scan QR Icon */}
                  <NavLink
                    to="/customer/pay/scan"
                    className="p-1.5 sm:p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                    title={t('header.scan')}
                    aria-label="Scan QR Code"
                  >
                    <QrCode className="w-5 h-5 stroke-[2]" />
                  </NavLink>

                  {/* Help / Support Icon */}
                  <NavLink
                    to="/customer/support"
                    className="p-1.5 sm:p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                    title={t('header.help')}
                    aria-label="Help and Support"
                  >
                    <HelpCircle className="w-5 h-5 stroke-[2]" />
                  </NavLink>

                  {/* Notification Bell with Dynamic Badge Count */}
                  <NavLink
                    to="/customer/notifications"
                    className="p-1.5 sm:p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors relative"
                    title={t('header.notifications')}
                    aria-label="View notifications"
                  >
                    <Bell className="w-5 h-5 stroke-[2]" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-[#0b1020] shadow-xs animate-in zoom-in-75 duration-200">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </NavLink>
                </div>
              </header>
            ) : (
              /* MERCHANT DESK HEADER */
              <header className="bg-white/95 dark:bg-[#0b1020]/95 backdrop-blur-md px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 z-20 shrink-0 sticky top-0 transition-colors">
                {/* 1. Green / Emerald Gradient Store Avatar Circle */}
                <NavLink
                  to="/merchant/profile"
                  title="Merchant Desk Profile"
                  className="relative group shrink-0 cursor-pointer"
                  aria-label="View merchant profile"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 p-0.5 shadow-xs transition-transform group-hover:scale-105 active:scale-95 flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-emerald-500 to-teal-700 flex items-center justify-center text-white">
                      <Store className="w-4.5 h-4.5" />
                    </div>
                  </div>
                </NavLink>

                {/* 2. Middle Desk Status Pill */}
                <div className="flex-1 min-w-0 flex items-center justify-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="font-black text-xs text-slate-800 dark:text-slate-200 tracking-tight truncate">
                      Merchant Desk
                    </span>
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded-full">
                      LIVE
                    </span>
                  </div>
                </div>

                {/* 3. Right Action Icons (Theme Sun/Moon, Quick Orders, Notifications Bell) */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {/* Theme Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => toggle(e)}
                    className="p-1.5 sm:p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                    title={theme === 'dark' ? t('header.themeLight') : t('header.themeDark')}
                    aria-label="Toggle theme"
                  >
                    {theme === 'dark' ? (
                      <Sun className="w-5 h-5 text-amber-400 fill-amber-400/20 stroke-[2]" />
                    ) : (
                      <Moon className="w-5 h-5 text-slate-700 fill-slate-700/20 stroke-[2]" />
                    )}
                  </button>

                  {/* Quick Orders Shortcut */}
                  <NavLink
                    to="/merchant/orders"
                    className="p-1.5 sm:p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                    title="All Orders"
                    aria-label="View orders"
                  >
                    <History className="w-5 h-5 stroke-[2]" />
                  </NavLink>

                  {/* Notification Bell */}
                  <NavLink
                    to="/merchant/notifications"
                    className="p-1.5 sm:p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors relative"
                    title="Notifications"
                    aria-label="View notifications"
                  >
                    <Bell className="w-5 h-5 stroke-[2]" />
                    <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-[#0b1020] shadow-xs animate-in zoom-in-75 duration-200">
                      2
                    </span>
                  </NavLink>
                </div>
              </header>
            )
          )}

        {/* Scrollable Main Content Body with Scroll Memory & Restoration */}
        <div
          ref={contentRef}
          onScroll={handleScroll}
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full min-w-0 no-scrollbar p-3.5 sm:p-4 space-y-3.5 bg-white dark:bg-[#0b1020] relative flex flex-col',
            location.pathname.includes('/buy') ||
              location.pathname.includes('/sell') ||
              location.pathname.includes('/pay/scan') ||
              location.pathname.includes('/deposit')
              ? 'pb-8 pt-2.5'
              : 'pb-24 pt-2.5'
          )}
        >
          <Outlet />
        </div>

        {/* Bottom Dock Navigation Bar Matching Reference Screenshot */}
        {!location.pathname.includes('/buy') &&
          !location.pathname.includes('/sell') &&
          !location.pathname.includes('/pay/scan') &&
          !location.pathname.includes('/deposit') && (
            <div className="bg-white/95 dark:bg-[#0c1122]/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800/90 px-3 py-2 grid grid-cols-5 items-center justify-items-center z-30 shrink-0 relative w-full shadow-lg">
              {bottomNav.map((item) => {
                const isNavActive =
                  item.to.includes('?')
                    ? location.pathname + location.search === item.to
                    : location.pathname === item.to

                if (item.isCenter) {
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className="-mt-7 flex flex-col items-center group cursor-pointer z-40"
                      title={isMerchant ? 'Available Orders' : 'Scan & Pay'}
                    >
                      <div className="w-14 h-14 rounded-full bg-[#0a2316] dark:bg-[#07301f] text-white flex items-center justify-center shadow-xl shadow-emerald-950/40 border-[3.5px] border-white dark:border-[#0c1122] group-hover:scale-105 active:scale-95 transition-all duration-200">
                        <item.icon className="w-6 h-6 stroke-[2.2] text-white" />
                      </div>
                    </NavLink>
                  )
                }

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={cn(
                      'flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold transition-all duration-200 relative select-none',
                      isNavActive
                        ? 'text-slate-950 dark:text-white font-extrabold scale-105'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    )}
                  >
                    <item.icon className={cn('w-5 h-5', isNavActive && 'stroke-[2.5px] text-slate-950 dark:text-white')} />
                    <span className="tracking-tight">{item.label}</span>
                    {isNavActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950 dark:bg-white absolute -bottom-0.5" />
                    )}
                  </NavLink>
                )
              })}
              {/* iOS Home Indicator Bar */}
              <div className="col-span-5 w-full flex justify-center pt-2 pb-0.5">
                <div className="w-32 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
              </div>
            </div>
          )}

        {/* Global Interactive Search Modal (Inside Phone Frame) */}
        <SearchTokenModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
        />

        {/* Download Mobile App Interactive Modal */}
        {showDownloadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#111827] w-full max-w-[360px] rounded-[32px] p-5 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 relative max-h-[85%] overflow-y-auto">
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => {
                setShowDownloadModal(false)
                setDownloadProgress(null)
                setDownloadComplete(false)
              }}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with App Logo */}
            <div className="text-center space-y-1 pt-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 mx-auto">
                <Download className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white pt-2">
                Get FundFusion App
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                Fast, secure P2P swaps & instant UPI settlements directly on your phone.
              </p>
            </div>

            {/* Direct APK Download Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Android Release APK</span>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  v2.4.2 · 24.8 MB
                </span>
              </div>

              {downloadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                    <span>Downloading package...</span>
                    <span>{downloadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full transition-all duration-200"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {downloadComplete && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-xl">
                  <CheckCircle className="w-4 h-4" />
                  <span>APK downloaded! Check notifications to install.</span>
                </div>
              )}

              <Button
                onClick={handleSimulatedDownload}
                disabled={downloadProgress !== null}
                className="w-full py-2.5 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>{downloadComplete ? 'Download Again' : 'Download Android APK'}</span>
              </Button>
            </div>

            {/* iOS & PWA Instructions */}
            <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2.5 text-xs text-indigo-950 dark:text-indigo-200">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-tight">
                <span className="font-bold">iOS / Safari Users:</span> Tap the Share icon at the bottom of Safari and choose <span className="font-extrabold underline">Add to Home Screen</span> for instant native app feel.
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="flex-1 py-2 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied Link!' : 'Share App Link'}</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowDownloadModal(false)}
                className="py-2 text-xs font-bold rounded-xl text-slate-500 hover:text-slate-800"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  )
}

