import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { ThemeToggle } from '@/components/brand/ThemeToggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Home' },
  { to: '/features', label: 'Features' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/security', label: 'Security' },
  { to: '/merchant', label: 'Become a merchant' },
  { to: '/help', label: 'Help' },
]

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [location.pathname])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-transparent transition',
        scrolled && 'border-nx-line bg-nx-bg/80 backdrop-blur-xl',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" aria-label="NEXORA PAY home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                cn('text-sm text-nx-muted hover:text-nx-text', isActive && 'text-nx-text')
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          <Link to="/login">
            <Button variant="ghost" size="sm" className="rounded-full px-5 font-semibold transition-all hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400">
              Sign in
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm" className="rounded-full px-5 font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-[0_4px_18px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_24px_rgba(99,102,241,0.55)] hover:scale-[1.03] active:scale-[0.97] transition-all">
              Get started
            </Button>
          </Link>
        </div>
        <button className="lg:hidden text-sm font-medium text-nx-muted" onClick={() => setOpen((v) => !v)}>
          Menu
        </button>
      </div>
      {open && (
        <div className="border-t border-nx-line bg-nx-bg2 px-4 py-4 lg:hidden">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="block py-2 text-sm font-medium text-nx-muted hover:text-nx-text">
              {l.label}
            </Link>
          ))}
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-nx-line pt-3">
            <ThemeToggle />
            <div className="flex gap-2 flex-1">
              <Link to="/login" className="flex-1">
                <Button variant="ghost" className="w-full rounded-full font-semibold">
                  Sign in
                </Button>
              </Link>
              <Link to="/register" className="flex-1">
                <Button className="w-full rounded-full font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md">
                  Get started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-nx-line bg-nx-bg2">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-nx-muted leading-relaxed">
            Next-generation P2P liquidity engine for USDT ⇄ INR swaps. Built for sub-minute settlements, 100% automated escrow security, and instant UPI payment rails.
          </p>
        </div>
        {[
          {
            title: 'Product',
            items: [
              ['/features', 'Features'],
              ['/how-it-works', 'How it works'],
              ['/fees', 'Fees'],
              ['/merchant', 'Merchants'],
            ],
          },
          {
            title: 'Company',
            items: [
              ['/about', 'About'],
              ['/blog', 'Journal'],
              ['/security', 'Security'],
              ['/contact', 'Contact'],
            ],
          },
          {
            title: 'Legal',
            items: [
              ['/terms', 'Terms'],
              ['/privacy', 'Privacy'],
              ['/risk-disclosure', 'Risk disclosure'],
              ['/refund-policy', 'Refunds'],
              ['/cookie-policy', 'Cookies'],
            ],
          },
        ].map((col) => (
          <div key={col.title}>
            <p className="text-sm font-medium">{col.title}</p>
            <ul className="mt-3 space-y-2">
              {col.items.map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-nx-muted hover:text-nx-text">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="border-t border-nx-line px-4 py-4 text-center text-xs text-nx-muted">
        © {new Date().getFullYear()} FundFusion · Prototype environment · Simulated balances only
      </p>
    </footer>
  )
}

export function PrototypeBanner() {
  return (
    <div className="bg-nx-accent/15 px-4 py-2 text-center text-xs text-nx-text">
      Prototype mode: every balance, rate, order, and payment event is simulated. No real money moves.
    </div>
  )
}
