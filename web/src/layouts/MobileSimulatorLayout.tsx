import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Home,
  History,
  QrCode,
  Wallet,
  User,
  Bell,
  Gift,
  Plus,
  LogOut,
  ChevronRight,
  Wifi,
  Battery,
  Sparkles,
  Sun,
  Moon,
  Smartphone,
  Monitor,
  Store,
  Layers,
  Search,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

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
  const { theme, setTheme } = useTheme()

  // Layout states
  const [isPhoneFrame, setIsPhoneFrame] = useState(true)
  const [currentTime, setCurrentTime] = useState('')
  const [tickerRate, setTickerRate] = useState('99.11')
  const [isRateUp, setIsRateUp] = useState(true)

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

  // Simulated rate fluctuation
  useEffect(() => {
    const rateTimer = setInterval(() => {
      const delta = (Math.random() * 0.08 - 0.04).toFixed(2)
      const newRate = (99.11 + parseFloat(delta)).toFixed(2)
      setTickerRate(newRate)
      setIsRateUp(parseFloat(delta) >= 0)
    }, 8000)
    return () => clearInterval(rateTimer)
  }, [])

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

  // Navigation dock items
  const customerNav = [
    { to: '/customer/dashboard', label: 'Home', icon: Home },
    { to: '/customer/orders', label: 'History', icon: History },
    { to: '/customer/pay', label: 'Scan & Pay', icon: QrCode, isCenter: true },
    { to: '/customer/wallet', label: 'Wallet', icon: Wallet },
    { to: '/customer/profile', label: 'Profile', icon: User },
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
    <div className="min-h-screen bg-[#ebf0f7] dark:bg-[#080c16] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden p-0 sm:p-6">
      {/* Subtle Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Central Viewport: Phone Simulator Frame matching Reference Image */}
      <main
        className={cn(
          'w-full transition-all duration-300 z-10 flex flex-col relative overflow-hidden',
          'w-full sm:max-w-[420px] h-screen sm:h-[calc(100vh-3rem)] max-h-none sm:max-h-[890px]',
          'rounded-none sm:rounded-[48px]',
          'border-0 sm:border-[10px] border-white dark:border-[#141b2d]',
          'shadow-none sm:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.12)]',
          'bg-white dark:bg-[#0b1020] text-slate-900 dark:text-slate-100'
        )}
      >
        {/* Hide Top Header and Bottom Dock on standalone subflow pages like Buy / Sell / Deposit */}
        {isPhoneFrame && !location.pathname.includes('/buy') && !location.pathname.includes('/sell') && !location.pathname.includes('/pay/scan') && !location.pathname.includes('/deposit') && (
          <>
            {/* Top App Action Header (Matching Reference Image) */}
            <div className="bg-white/95 dark:bg-[#0e1426]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 z-20 shrink-0 shadow-xs">
              {/* Profile Avatar Button */}
              <NavLink
                to={isMerchant ? '/merchant/profile' : '/customer/profile'}
                className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform shadow-xs group"
              >
                <User className="w-4 h-4 group-hover:text-blue-500 transition-colors" />
              </NavLink>

              {/* Market Live 24x7 Pill Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-tight bg-slate-50 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-emerald-400/50 transition-colors">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                <span className="font-extrabold text-slate-700 dark:text-slate-200">Market Live 24×7</span>
              </div>

              {/* Right Action Icons (Gift, Bell, Download) */}
              <div className="flex items-center gap-1.5">
                <NavLink
                  to="/customer/gift-cards"
                  className="p-1.5 rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-500 transition-colors"
                >
                  <Gift className="w-4 h-4" />
                </NavLink>
                <NavLink
                  to="/customer/notifications"
                  className="p-1.5 rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-500 transition-colors relative"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                </NavLink>
                <NavLink
                  to="/customer/wallet/deposit"
                  className="p-1.5 rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-500 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </NavLink>
              </div>
            </div>
          </>
        )}

        {/* Scrollable Main Content Body */}
        <div
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0 no-scrollbar p-3.5 space-y-3.5 bg-white dark:bg-[#0b1020] relative flex flex-col',
            (location.pathname.includes('/buy') || location.pathname.includes('/sell') || location.pathname.includes('/pay/scan') || location.pathname.includes('/deposit'))
              ? 'pb-6 pt-4'
              : 'pb-24'
          )}
        >
          <Outlet />
        </div>

        {/* Bottom Dock Navigation Bar (Hidden on Buy/Sell/Deposit standalone subflow pages) */}
        {isPhoneFrame && !location.pathname.includes('/buy') && !location.pathname.includes('/sell') && !location.pathname.includes('/pay/scan') && !location.pathname.includes('/deposit') && (
          <div className="bg-white/95 dark:bg-[#0c1122]/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800/90 px-3 py-2 grid grid-cols-5 items-center justify-items-center z-30 shrink-0 absolute bottom-0 inset-x-0 shadow-lg">
            {bottomNav.map((item) => {
              const isActive = location.pathname === item.to

              if (item.isCenter) {
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className="-mt-7 flex flex-col items-center group cursor-pointer z-40"
                  >
                    <div className="relative">
                      <span className="absolute -inset-1 rounded-full bg-gradient-to-tr from-blue-600 to-emerald-400 opacity-70 blur-xs group-hover:opacity-100 transition-opacity animate-pulse" />
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white flex items-center justify-center shadow-xl shadow-blue-500/40 border-2 border-white dark:border-[#0c1122] group-hover:scale-110 transition-all duration-300 relative">
                        <item.icon className="w-5 h-5" />
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 mt-1 tracking-tight">
                      {item.label}
                    </span>
                  </NavLink>
                )
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive: isNavActive }) =>
                    cn(
                      'flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all duration-200 relative',
                      isNavActive
                        ? 'text-blue-600 dark:text-blue-400 font-extrabold scale-105'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    )
                  }
                >
                  <item.icon className={cn('w-5 h-5', isActive && 'stroke-[2.5px]')} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 absolute -bottom-0.5" />
                  )}
                </NavLink>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
