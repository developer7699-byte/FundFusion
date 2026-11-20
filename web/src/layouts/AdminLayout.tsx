import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Scale,
  ArrowLeftRight,
  Gift,
  Users,
  Store,
  Building2,
  Wallet,
  ShieldCheck,
  Sliders,
  Headphones,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Zap,
} from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { useAdminStore } from '@/lib/admin-store'
import { cn } from '@/lib/utils'

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggle } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const {
    activeDisputesCount,
    pendingSettlementsCount,
    pendingMerchantsCount,
    forwardedGiftCardsCount,
    settings,
  } = useAdminStore()

  const navGroups = [
    {
      title: 'CORE OPERATIONS',
      items: [
        {
          to: '/admin/dashboard',
          label: 'Overview & Analytics',
          icon: LayoutDashboard,
        },
        {
          to: '/admin/disputes',
          label: 'Arbitration & Disputes',
          icon: Scale,
          badge: activeDisputesCount > 0 ? `${activeDisputesCount}` : undefined,
          badgeColor: 'bg-rose-500 text-white animate-pulse',
        },
        {
          to: '/admin/orders',
          label: 'Orders & Escrow Book',
          icon: ArrowLeftRight,
        },
        {
          to: '/admin/gift-cards',
          label: 'Gift Cards & API Router',
          icon: Gift,
          badge: forwardedGiftCardsCount > 0 ? `${forwardedGiftCardsCount} Forwarded` : '3-Tier',
          badgeColor: forwardedGiftCardsCount > 0 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-emerald-500/20 text-emerald-400',
        },
      ],
    },
    {
      title: 'USER & DESK MANAGEMENT',
      items: [
        {
          to: '/admin/users',
          label: 'Users & KYC',
          icon: Users,
        },
        {
          to: '/admin/merchants',
          label: 'OTC Merchant Desks',
          icon: Store,
          badge: pendingMerchantsCount > 0 ? `${pendingMerchantsCount}` : undefined,
          badgeColor: 'bg-amber-500 text-slate-950',
        },
        {
          to: '/admin/settlements',
          label: 'Bank Settlements',
          icon: Building2,
          badge: pendingSettlementsCount > 0 ? `${pendingSettlementsCount}` : undefined,
          badgeColor: 'bg-blue-500 text-white',
        },
      ],
    },
    {
      title: 'FINANCIALS & AUDIT',
      items: [
        {
          to: '/admin/wallets',
          label: 'System Vaults & Reserves',
          icon: Wallet,
        },
        {
          to: '/admin/audit-logs',
          label: 'Audit Trail & Activity',
          icon: ShieldCheck,
        },
      ],
    },
    {
      title: 'CONFIGURATION',
      items: [
        {
          to: '/admin/settings',
          label: 'Platform Control & Rates',
          icon: Sliders,
        },
        {
          to: '/admin/support',
          label: 'Support Tickets',
          icon: Headphones,
        },
      ],
    },
  ]

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Admin Operational Strip */}
      <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 py-1.5 flex items-center justify-between text-[11px] font-mono shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-400 font-bold hidden sm:inline">Engine Status:</span>
          <span className="text-emerald-400 font-bold">100% Operational</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline">
            USDT/INR Base Rate: <span className="text-white font-bold">₹{settings.baseUsdtRate.toFixed(2)}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {activeDisputesCount > 0 && (
            <NavLink
              to="/admin/disputes"
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 font-bold text-[10px] hover:bg-rose-500/30 transition-colors"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>{activeDisputesCount} Action Required</span>
            </NavLink>
          )}

          <NavLink
            to="/customer/dashboard"
            className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] font-medium"
            title="Open Customer Portal"
          >
            <span>Customer App</span>
            <ExternalLink className="w-3 h-3" />
          </NavLink>
          <NavLink
            to="/merchant/dashboard"
            className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] font-medium"
            title="Open Merchant Desk"
          >
            <span>Merchant Desk</span>
            <ExternalLink className="w-3 h-3" />
          </NavLink>
        </div>
      </div>

      <div className="flex flex-1 relative overflow-hidden">
        {/* Desktop Sidebar (Left) */}
        <aside className="hidden lg:flex w-68 shrink-0 flex-col bg-[#0c1222] border-r border-slate-800/80 p-4 space-y-6">
          {/* Logo & Console Badge */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <Logo />
              <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
                Admin
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono pl-0.5">
              Platform Master Console v2.4
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-5 overflow-y-auto pr-1 no-scrollbar text-xs">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1.5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-2 block">
                  {group.title}
                </span>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all group select-none',
                          isActive
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        )
                      }
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <item.icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={cn(
                            'text-[10px] font-black px-1.5 py-0.2 rounded-full shrink-0 shadow-xs',
                            item.badgeColor || 'bg-slate-700 text-white'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Operator Profile Card & Logout */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2 shrink-0">
            <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  SU
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-white truncate">SuperAdmin</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                await logout()
                navigate('/login')
              }}
              className="w-full py-2 px-3 rounded-xl hover:bg-rose-500/10 text-rose-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-transparent hover:border-rose-500/20"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Console</span>
            </button>
          </div>
        </aside>

        {/* Mobile Slide-out Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
              onClick={closeMobileMenu}
            />

            {/* Drawer Content */}
            <div className="relative w-72 max-w-[80vw] bg-[#0c1222] border-r border-slate-800 p-4 flex flex-col h-full z-10 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <Logo />
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-4 overflow-y-auto no-scrollbar text-xs">
                {navGroups.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-2 block">
                      {group.title}
                    </span>
                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={closeMobileMenu}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center justify-between px-3 py-2 rounded-xl font-bold transition-all',
                              isActive
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                            )
                          }
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="text-[10px] font-black px-1.5 rounded-full bg-rose-500 text-white">
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>

              <button
                type="button"
                onClick={async () => {
                  await logout()
                  navigate('/login')
                }}
                className="w-full py-2.5 rounded-xl bg-rose-500/10 text-rose-400 text-xs font-bold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-[calc(100vh-33px)] overflow-y-auto">
          {/* Header Bar */}
          <header className="sticky top-0 z-30 bg-[#070b14]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white lg:hidden"
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>FundFusion Administration</span>
                  <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    Live Escrow Node
                  </span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={(e) => toggle(e)}
                className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <span className="text-slate-400 font-mono">Operator:</span>
                <span className="font-bold text-white font-mono">{user?.displayName || 'developer7699'}</span>
              </div>
            </div>
          </header>

          {/* Page Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

