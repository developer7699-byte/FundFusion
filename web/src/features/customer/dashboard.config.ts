import type { LucideIcon } from 'lucide-react'
import {
  Wallet,
  ArrowDownToLine,
  Gift,
  Receipt,
  Percent,
  CreditCard,
  Users,
  MoreHorizontal,
  LayoutGrid,
  Trophy,
  ReceiptText,
  Menu,
  QrCode,
  Smartphone,
  Zap,
} from 'lucide-react'

export interface TabCategory {
  id: string
  label: string
  badge?: string
  badgeColor?: string
}

export interface QuickActionItem {
  id: string
  label: string
  icon: string
  link?: string
  badge?: string
  badgeColor?: string
}

export interface PromoBannerItem {
  id: string
  tag: string
  counter: string
  title: string
  subtitle: string
  ctaText: string
  link: string
  gradient: string
}

export const DASHBOARD_CONFIG = {
  // 1. Header Config
  header: {
    searchPlaceholder: 'Search Gift Vouchers, bills...',
    notificationCount: '9+',
    scanLink: '/customer/pay/scan',
    helpLink: '/customer/support',
    notificationLink: '/customer/notifications',
    profileLink: '/customer/profile',
  },

  // 2. Navigation Pill Tabs (matching p2pdex.io lifestyle & utility)
  categories: [
    { id: 'all', label: 'All Services' },
    { id: 'bills', label: 'Bill Pay', badge: 'Hot', badgeColor: 'bg-emerald-500 text-white' },
    { id: 'gifts', label: 'Gift Cards' },
    { id: 'recharge', label: 'Recharge' },
    { id: 'p2p', label: 'P2P Trade' },
  ] as TabCategory[],

  // 3. Total Balance Card Config
  assets: {
    defaultCurrency: 'USD',
    currencies: [
      { code: 'USD', symbol: '$', rate: 1 },
      { code: 'USDT', symbol: '₮', rate: 1 },
      { code: 'INR', symbol: '₹', rate: 91.50 },
    ],
    defaultBalance: '0.00',
    depositCta: {
      label: 'Deposit',
      link: '/customer/wallet/deposit',
    },
    sellCta: {
      label: 'Sell Crypto',
      link: '/customer/sell',
    },
  },

  // 4. Quick Action Grid (2 rows x 4 items matching Screenshot 3)
  quickActions: [
    { id: 'wallet', label: 'Wallet', icon: 'Wallet', link: '/customer/wallet' },
    { id: 'buy', label: 'Buy', icon: 'ArrowDownToLine', link: '/customer/buy' },
    { id: 'gifts', label: 'Gifts', icon: 'Gift' },
    { id: 'bills', label: 'Bills', icon: 'Receipt', badge: '$50K', badgeColor: 'bg-emerald-500 text-white' },
    { id: 'offers', label: 'Offers', icon: 'Percent' },
    { id: 'cards', label: 'Cards', icon: 'CreditCard' },
    { id: 'community', label: 'Community', icon: 'Users', badge: 'Top', badgeColor: 'bg-emerald-500 text-white' },
    { id: 'more', label: 'More', icon: 'MoreHorizontal' },
  ] as QuickActionItem[],

  // 5. Promotional Banners (aligned with landing page: Utility Bills, Gift Cards, P2P Swaps)
  promoBanners: [
    {
      id: 'bills',
      tag: 'Utilities',
      counter: '1/3',
      title: 'Pay Utility Bills & Recharge with USDT',
      subtitle: 'INSTANT MOBILE, ELECTRICITY & DTH VIA ESCROW',
      ctaText: 'Pay Bills Now',
      link: '/customer/utilities',
      gradient: 'from-emerald-700 via-emerald-800 to-slate-900',
    },
    {
      id: 'gifts',
      tag: 'Vouchers',
      counter: '2/3',
      title: '100+ Top Digital Brand Gift Cards',
      subtitle: 'AMAZON, FLIPKART & SWIGGY DELIVERED INSTANTLY',
      ctaText: 'Buy Gift Vouchers',
      link: '/customer/gift-cards',
      gradient: 'from-amber-600 via-amber-700 to-slate-900',
    },
    {
      id: 'p2p',
      tag: 'P2P Trading',
      counter: '3/3',
      title: 'Zero-Fee Instant P2P USDT Swaps',
      subtitle: 'BANK & UPI TRANSFERS SETTLED IN <60 SECONDS',
      ctaText: 'Trade USDT Now',
      link: '/customer/buy',
      gradient: 'from-blue-700 via-indigo-800 to-slate-900',
    },
  ] as PromoBannerItem[],

  // 6. Bottom Dock Items matching Screenshot 1, 2 & 3
  bottomNav: [
    { id: 'home', label: 'Home', icon: 'LayoutGrid', to: '/customer/dashboard' },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'Trophy', to: '/customer/dashboard?tab=leaderboard' },
    { id: 'scan', label: '', icon: 'QrCode', to: '/customer/pay/scan', isCenter: true },
    { id: 'transactions', label: 'Transactions', icon: 'ReceiptText', to: '/customer/transactions' },
    { id: 'menu', label: 'Menu', icon: 'Menu', to: '/customer/dashboard?tab=menu' },
  ],
}
