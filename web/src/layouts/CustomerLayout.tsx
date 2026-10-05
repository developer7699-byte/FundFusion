import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  Gift,
  Home,
  LogOut,
  QrCode,
  Settings,
  Wallet,
} from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/brand/ThemeToggle'
import { PrototypeBanner } from '@/components/layout/SiteChrome'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/customer/dashboard', label: 'Home', icon: Home },
  { to: '/customer/wallet', label: 'Wallet', icon: Wallet },
  { to: '/customer/pay', label: 'Pay', icon: QrCode },
  { to: '/customer/gift-cards', label: 'Cards', icon: Gift },
  { to: '/customer/notifications', label: 'Alerts', icon: Bell },
]

const side = [
  ['/customer/dashboard', 'Overview'],
  ['/customer/wallet', 'Wallet'],
  ['/customer/buy', 'Buy'],
  ['/customer/sell', 'Sell'],
  ['/customer/convert', 'Convert'],
  ['/customer/pay', 'Pay'],
  ['/customer/orders', 'Orders'],
  ['/customer/transactions', 'Transactions'],
  ['/customer/gift-cards', 'Gift cards'],
  ['/customer/utilities', 'Utilities'],
  ['/customer/notifications', 'Notifications'],
  ['/customer/support', 'Support'],
  ['/customer/referrals', 'Referrals'],
  ['/customer/rewards', 'Rewards'],
  ['/customer/profile', 'Profile'],
  ['/customer/settings', 'Settings'],
  ['/customer/security', 'Security'],
  ['/customer/sessions', 'Sessions'],
  ['/customer/verification', 'Verification'],
]

export function CustomerLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-nx-bg">
      <PrototypeBanner />
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-nx-line bg-nx-bg2 p-4 lg:flex">
          <Logo />
          <nav className="mt-8 space-y-1 overflow-y-auto">
            {side.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'block rounded-xl px-3 py-2 text-sm text-nx-muted hover:bg-nx-text/5',
                    isActive && 'bg-white/8 text-nx-text',
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
        <div className="min-w-0 flex-1 pb-20 lg:pb-0">
          <header className="flex items-center justify-between border-b border-nx-line px-4 py-3 lg:px-8">
            <div className="lg:hidden">
              <Logo compact />
            </div>
            <p className="hidden text-sm text-nx-muted lg:block">{user?.displayName}</p>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NavLink to="/customer/settings" className="text-nx-muted">
                <Settings className="h-5 w-5" />
              </NavLink>
            </div>
          </header>
          <main className="px-4 py-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t border-nx-line bg-nx-bg2 lg:hidden">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-1 py-2 text-[10px] text-nx-muted', isActive && 'text-nx-mint')
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
