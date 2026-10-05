import { cn } from '@/lib/utils'

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      <div className="relative flex items-center justify-center shrink-0">
        {/* Subtle background glow */}
        <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 opacity-40 blur-xs transition duration-300 group-hover:opacity-70" />
        
        <svg width="34" height="34" viewBox="0 0 36 36" fill="none" className="relative drop-shadow-sm" aria-hidden="true">
          <defs>
            <linearGradient id="ff-grad-1" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="ff-grad-2" x1="0" y1="36" x2="36" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>
          
          {/* Base rounded box */}
          <rect width="36" height="36" rx="10" fill="url(#ff-grad-1)" />
          
          {/* Fusion F paths */}
          <path
            d="M10 11C10 9.89543 10.8954 9 12 9H24C25.1046 9 26 9.89543 26 11V13C26 13.5523 25.5523 14 25 14H15V16.5H22C22.5523 16.5 23 16.9477 23 17.5V19.5C23 20.0523 22.5523 20.5 22 20.5H15V26C15 26.5523 14.5523 27 14 27H11C10.4477 27 10 26.5523 10 26V11Z"
            fill="white"
            fillOpacity="0.95"
          />
          <circle cx="24" cy="24" r="3.5" fill="#10B981" className="animate-pulse" />
        </svg>
      </div>

      {!compact && (
        <div className="leading-tight">
          <p className="text-[15px] font-bold tracking-tight text-nx-text flex items-center gap-1">
            <span>Fund</span>
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 bg-clip-text text-transparent">
              Fusion
            </span>
          </p>
          <p className="text-[10px] font-medium tracking-wider uppercase text-nx-muted opacity-80">
            Smart Financial Fusion
          </p>
        </div>
      )}
    </div>
  )
}

