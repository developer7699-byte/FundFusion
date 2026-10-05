import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { ThemeToggle } from '@/components/brand/ThemeToggle'
import { Button } from '@/components/ui/button'
import { PrototypeBanner } from '@/components/layout/SiteChrome'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

export function DeskLayout({
  links,
}: {
  home?: string
  links: [string, string][]
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-nx-bg">
      <PrototypeBanner />
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-nx-line bg-nx-bg2 p-4 lg:flex">
          <Logo />
          <nav className="mt-8 space-y-1 overflow-y-auto">
            {links.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'block rounded-xl px-3 py-2 text-sm text-nx-muted hover:bg-nx-text/5',
                    isActive && 'bg-nx-text/8 text-nx-text',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <Button
            variant="ghost"
            className="mt-auto"
            onClick={async () => {
              await logout()
              navigate('/')
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-nx-line px-4 py-3 lg:px-8">
            <p className="text-sm text-nx-muted">{user?.displayName}</p>
            <ThemeToggle />
          </header>
          <main className="px-4 py-6 lg:px-8">
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
