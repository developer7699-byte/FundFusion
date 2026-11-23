import { Link } from 'react-router-dom'
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  QrCode,
  Gamepad2,
  Receipt,
  ArrowDownCircle,
  Gift,
  Smartphone,
  Users,
  Crown,
  Ticket,
  Percent,
  Mail,
  Trophy,
  BarChart3,
  Store,
  Link2,
  Layers,
  Bell,
  Calendar,
  Globe,
  User,
  Landmark,
  Clock,
  ShieldCheck,
  Settings,
  Users2,
  HelpCircle,
  MessageSquare,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/lib/notifications'

interface FullServicesMenuProps {
  onOpenDeposit?: () => void
  onOpenBills?: (cat?: 'recharge' | 'electricity' | 'dth' | 'broadband' | 'gas' | 'water' | 'fastag') => void
  onOpenGifts?: () => void
  onOpenVirtualCard?: () => void
  onOpenCardlessCash?: () => void
  onOpenLeaderboard?: () => void
  onOpenOffers?: () => void
  onOpenReferral?: () => void
  onOpenAbout?: () => void
  onOpenMerchant?: () => void
  onOpenPayoutApi?: () => void
  onOpenBulkPayout?: () => void
  onOpenAffiliate?: () => void
}

export function FullServicesMenu({
  onOpenDeposit,
  onOpenBills,
  onOpenGifts,
  onOpenVirtualCard,
  onOpenCardlessCash,
  onOpenLeaderboard,
  onOpenOffers,
  onOpenReferral,
  onOpenAbout,
  onOpenMerchant,
  onOpenPayoutApi,
  onOpenBulkPayout,
  onOpenAffiliate,
}: FullServicesMenuProps) {
  const { unreadCount } = useNotifications()

  const sections = [
    {
      title: 'Assets & Trading',
      items: [
        { id: 'wallet', label: 'Wallet', icon: Wallet, to: '/customer/wallet' },
        { id: 'buy', label: 'Buy Crypto', icon: ArrowDownToLine, to: '/customer/buy' },
        { id: 'sell', label: 'Sell Crypto', icon: ArrowUpFromLine, to: '/customer/sell' },
        { id: 'cash', label: 'Cardless Cash', icon: Banknote, action: onOpenCardlessCash },
      ],
    },
    {
      title: 'Payments & Bills',
      items: [
        { id: 'scan', label: 'Scan & Pay', icon: QrCode, to: '/customer/pay/scan' },
        { id: 'gaming', label: 'Game Topup (FF/BGMI)', icon: Gamepad2, action: () => onOpenBills?.('gaming' as any) },
        { id: 'bills', label: 'Bill Payments', icon: Receipt, action: () => onOpenBills?.('electricity') },
        { id: 'recharge', label: 'Mobile Recharge', icon: Smartphone, action: () => onOpenBills?.('recharge') },
        { id: 'request', label: 'Request Money', icon: ArrowDownCircle, to: '/customer/request' },
        { id: 'gifts', label: 'Gift Cards', icon: Gift, to: '/customer/gift-cards' },
      ],
    },
    {
      title: 'Earn & Rewards',
      items: [
        { id: 'refer', label: 'Refer & Earn', icon: Users, action: onOpenReferral },
        { id: 'affiliate', label: 'Affiliate', icon: Crown, action: onOpenAffiliate },
        { id: 'coupons', label: 'Coupons', icon: Ticket, action: onOpenOffers },
        { id: 'offers', label: 'Offers', icon: Percent, action: onOpenOffers },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, action: onOpenLeaderboard },
      ],
    },
    {
      title: 'Business Services',
      items: [
        { id: 'merchant', label: 'Merchant Desk', icon: Store, to: '/merchant/dashboard', badge: 'Live', badgeColor: 'bg-emerald-500 text-white' },
        { id: 'payout-api', label: 'Payout API', icon: Link2, action: onOpenPayoutApi },
        { id: 'bulk-payout', label: 'Bulk Payout', icon: Layers, action: onOpenBulkPayout },
      ],
    },
    {
      title: 'Tools & Services',
      items: [
        { id: 'notifications', label: 'Notifications', icon: Bell, to: '/customer/notifications' },
        { id: 'events', label: 'Events', icon: Calendar, action: onOpenOffers },
      ],
    },
    {
      title: 'Account & Support',
      items: [
        { id: 'profile', label: 'Profile', icon: User, to: '/customer/profile' },
        { id: 'payment-method', label: 'Payment Method', icon: Landmark, to: '/customer/profile' },
        { id: 'transactions', label: 'Transactions', icon: Clock, to: '/customer/transactions' },
        { id: 'security', label: 'Security', icon: ShieldCheck, to: '/customer/profile' },
        { id: 'settings', label: 'Settings', icon: Settings, to: '/customer/profile' },
        { id: 'community', label: 'Community', icon: Users2, action: onOpenReferral },
        { id: 'support', label: 'Support', icon: HelpCircle, to: '/customer/support' },
        { id: 'about', label: 'About', icon: Info, action: onOpenAbout },
      ],
    },
  ]

  return (
    <div className="w-full space-y-6 pb-20 pt-1">
      {sections.map((sec) => (
        <div key={sec.title} className="space-y-3">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white px-1">
            {sec.title}
          </h3>

          <div className="grid grid-cols-4 gap-y-4 gap-x-2">
            {sec.items.map((item) => {
              const Icon = item.icon
              const btnContent = (
                <div className="flex flex-col items-center justify-start group cursor-pointer text-center relative">
                  {/* Soon badge */}
                  {item.soon && (
                    <span className="absolute -top-1.5 right-1.5 text-[8px] font-black px-1.5 py-0.2 rounded-full bg-amber-400 text-amber-950 shadow-xs z-10 scale-90">
                      Soon
                    </span>
                  )}

                  {/* Notification Unread Badge */}
                  {item.id === 'notifications' && unreadCount > 0 && (
                    <span className="absolute -top-1.5 right-1.5 text-[8px] font-black px-1.5 py-0.2 rounded-full bg-rose-500 text-white shadow-xs z-10 scale-90 animate-in zoom-in-75">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}

                  {/* Circular / Rounded Square Icon Container */}
                  <div
                    className={cn(
                      'w-13 h-13 rounded-2xl flex items-center justify-center transition-all duration-200 mb-1.5 shadow-xs',
                      'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200',
                      'group-hover:bg-slate-100 dark:group-hover:bg-slate-700 group-hover:scale-105 active:scale-95',
                      'border border-slate-200/50 dark:border-slate-700/60'
                    )}
                  >
                    <Icon className="w-5 h-5 stroke-[1.8] group-hover:text-emerald-500 transition-colors" />
                  </div>

                  {/* Label */}
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-tight line-clamp-2 max-w-[76px] group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    {item.label}
                  </span>
                </div>
              )

              if (item.action) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.action}
                    className="focus:outline-none"
                  >
                    {btnContent}
                  </button>
                )
              }

              if (item.to) {
                return (
                  <Link key={item.id} to={item.to}>
                    {btnContent}
                  </Link>
                )
              }

              return (
                <div key={item.id} className="opacity-70">
                  {btnContent}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

