import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { ThemeToggle } from '@/components/brand/ThemeToggle'
import { Button } from '@/components/ui/button'
import { PrototypeBanner } from '@/components/layout/SiteChrome'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { MobileSimulatorLayout } from './MobileSimulatorLayout'

export function DeskLayout({
  links,
}: {
  home?: string
  links: [string, string][]
}) {
  const location = useLocation()
  const isMerchant = location.pathname.startsWith('/merchant')

  if (isMerchant) {
    return <MobileSimulatorLayout panelType="merchant" sideLinks={links} />
  }

  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <PrototypeBanner />
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-800/80 bg-slate-900/90 p-4 lg:flex backdrop-blur-xl">
          <Logo />
          <nav className="mt-8 space-y-1 overflow-y-auto pr-1 no-scrollbar">
            {links.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'block rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all',
                    isActive && 'bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/30'
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <Button
            variant="ghost"
            className="mt-auto text-xs font-bold text-rose-400 hover:bg-rose-500/10"
            onClick={async () => {
              await logout()
              navigate('/')
            }}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3 lg:px-8 bg-slate-900/40">
            <p className="text-xs font-bold text-slate-400">Admin Console · {user?.displayName}</p>
            <ThemeToggle />
          </header>
          <main className="px-4 py-6 lg:px-8 max-w-7xl">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export const merchantLinks: [string, string][] = [
  ['/merchant/dashboard', 'Overview'],
  ['/merchant/available-orders', 'Available'],
  ['/merchant/active-orders', 'Active'],
  ['/merchant/completed-orders', 'Completed'],
  ['/merchant/orders', 'All orders'],
  ['/merchant/wallet', 'Wallet'],
  ['/merchant/earnings', 'Earnings'],
  ['/merchant/settlements', 'Settlements'],
  ['/merchant/withdrawals', 'Withdrawals'],
  ['/merchant/performance', 'Performance'],
  ['/merchant/payment-methods', 'Payment methods'],
  ['/merchant/notifications', 'Notifications'],
  ['/merchant/profile', 'Profile'],
  ['/merchant/settings', 'Settings'],
]

export const adminLinks: [string, string][] = [
  ['/admin/dashboard', 'Overview'],
  ['/admin/users', 'Users'],
  ['/admin/merchants', 'Merchants'],
  ['/admin/orders', 'Orders'],
  ['/admin/transactions', 'Transactions'],
  ['/admin/withdrawals', 'Withdrawals'],
  ['/admin/settlements', 'Settlements'],
  ['/admin/escrow', 'Escrow'],
  ['/admin/disputes', 'Disputes'],
  ['/admin/wallets', 'Wallets'],
  ['/admin/ledger', 'Ledger'],
  ['/admin/gift-cards', 'Gift cards'],
  ['/admin/utilities', 'Utilities'],
  ['/admin/notifications', 'Notifications'],
  ['/admin/support', 'Support'],
  ['/admin/reports', 'Reports'],
  ['/admin/financials', 'Financials'],
  ['/admin/analytics', 'Analytics'],
  ['/admin/security', 'Security'],
  ['/admin/fraud-monitoring', 'Fraud'],
  ['/admin/audit-logs', 'Audit logs'],
  ['/admin/settings', 'Settings'],
  ['/admin/settings/platform', 'Platform'],
  ['/admin/settings/fees', 'Fees'],
  ['/admin/settings/limits', 'Limits'],
  ['/admin/profile', 'Profile'],
]
