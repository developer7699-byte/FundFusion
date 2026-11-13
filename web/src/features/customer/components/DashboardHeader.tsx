import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Search, Flame, ScanLine, UserPlus, Bell, User, CheckCircle2 } from 'lucide-react'
import { DASHBOARD_CONFIG } from '../dashboard.config'
import { cn } from '@/lib/utils'

interface DashboardHeaderProps {
  onOpenSearch?: () => void
  userRole?: string
}

export function DashboardHeader({ onOpenSearch, userRole = 'customer' }: DashboardHeaderProps) {
  const config = DASHBOARD_CONFIG.header
  const [isHovered, setIsHovered] = useState(false)

  return (
    <header className="w-full bg-white/95 dark:bg-[#0b1020]/95 backdrop-blur-md px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800/80 z-20 shrink-0 sticky top-0 transition-colors">
      {/* 1. Left Profile Avatar with Verification Badge */}
      <NavLink
        to={config.profileLink}
        className="relative group shrink-0"
        title="View Profile"
        aria-label="View user profile"
      >
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-sky-100 to-indigo-100 dark:from-slate-800 dark:to-slate-700 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs transition-transform group-hover:scale-105 active:scale-95">
          <User className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-600 dark:text-slate-300 group-hover:text-nx-accent transition-colors" />
        </div>
        {/* Verification Checkmark Pill / Badge */}
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-sky-500 border-2 border-white dark:border-[#0b1020] flex items-center justify-center shadow-xs">
          <CheckCircle2 className="w-2.5 h-2.5 text-white stroke-[3]" />
        </span>
      </NavLink>

      {/* 2. Middle Search Bar Pill (Matching Reference Screenshot: 🔍 🔥 BNB/USDT) */}
      <div className="flex-1 min-w-0 max-w-md">
        <button
          type="button"
          onClick={onOpenSearch}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-full text-left transition-all duration-200 cursor-pointer shadow-xs',
            'bg-slate-100/90 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60',
            'hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600',
            'text-slate-600 dark:text-slate-300'
          )}
          aria-label="Search crypto tokens, pairs and stocks"
        >
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
          <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 fill-amber-500 shrink-0 animate-pulse" />
          <span className="text-xs sm:text-sm font-semibold tracking-tight text-slate-500 dark:text-slate-400 truncate">
            {config.searchPlaceholder}
          </span>
          <span className="ml-auto hidden xs:inline-flex text-[10px] font-bold text-slate-400 bg-white/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
            ⌘K
          </span>
        </button>
      </div>

      {/* 3. Right Action Icons (Scan, Invite+, Notification Bell) */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Scan / Viewfinder Icon */}
        <NavLink
          to={config.scanLink}
          className="p-1.5 sm:p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-nx-accent transition-colors relative"
          title="Scan QR"
          aria-label="Scan QR Code"
        >
          <ScanLine className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
        </NavLink>

        {/* Invite Friends Icon with Red Dot Alert */}
        <NavLink
          to={config.referralLink}
          className="p-1.5 sm:p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-blue-500 transition-colors relative"
          title="Invite Friends"
          aria-label="Invite Friends and Earn"
        >
          <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          {config.hasReferralAlert && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#0b1020] animate-pulse" />
          )}
        </NavLink>

        {/* Notification Bell with Badge Count */}
        <NavLink
          to={config.notificationLink}
          className="p-1.5 sm:p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-amber-500 transition-colors relative"
          title="Notifications"
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          {config.notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-[#0b1020] shadow-xs">
              {config.notificationCount}
            </span>
          )}
        </NavLink>
      </div>
    </header>
  )
}

