import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton } from '@/components/ui/BackButton'
import {
  User,
  Copy,
  Check,
  CreditCard,
  Building2,
  Globe,
  DollarSign,
  Moon,
  Sun,
  Send,
  Bell,
  TrendingUp,
  Compass,
  MessageSquare,
  FileText,
  LogOut,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  X,
  Plus,
  Trash2,
  Mail,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language'
import { usePaymentMethods } from '@/lib/payment-methods'

type ModalType =
  | null
  | 'manage_payments'
  | 'buy_methods'
  | 'language'
  | 'display_currency'
  | 'withdraw_address'
  | 'notification_settings'
  | 'rate_alerts'
  | 'app_tour'
  | 'contact_support'
  | 'share_feedback'
  | 'privacy_policy'
  | 'logout_confirm'

interface WithdrawAddress {
  id: string
  label: string
  address: string
  chain: string
}

const WITHDRAW_STORAGE_KEY = 'fundfusion_saved_withdraw_addresses'

function getInitialWithdrawAddrs(): WithdrawAddress[] {
  try {
    const raw = localStorage.getItem(WITHDRAW_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return [
    { id: 'w1', label: 'Binance USDT TRC20', address: 'T9xZ8v...K3pQ9', chain: 'TRON (TRC20)' },
    { id: 'w2', label: 'Trust Wallet ERC20', address: '0x71C...892F', chain: 'Ethereum (ERC20)' },
  ]
}

export function CustomerProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { language, setLanguage, t } = useLanguage()

  // State
  const [copiedUser, setCopiedUser] = useState(false)
  const [displayCurrency, setDisplayCurrency] = useState<'USDT' | 'INR' | 'USD' | 'EUR'>('USDT')
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Sub-states
  // 1. Manage Payments (Persistent via usePaymentMethods hook)
  const { paymentMethods, addPaymentMethod, deletePaymentMethod } = usePaymentMethods()
  const [newPayType, setNewPayType] = useState<'UPI' | 'BANK'>('UPI')
  const [newPayLabel, setNewPayLabel] = useState('')
  const [newPayDetails, setNewPayDetails] = useState('')
  const [showAddPayForm, setShowAddPayForm] = useState(false)

  // 2. Withdraw Addresses (Persistent via localStorage)
  const [withdrawAddresses, setWithdrawAddresses] = useState<WithdrawAddress[]>(getInitialWithdrawAddrs)
  const [newAddrLabel, setNewAddrLabel] = useState('')
  const [newAddrValue, setNewAddrValue] = useState('')
  const [newAddrChain, setNewAddrChain] = useState('TRC20')
  const [showAddAddrForm, setShowAddAddrForm] = useState(false)

  // 3. Notifications
  const [notifPush, setNotifPush] = useState(true)
  const [notifTrade, setNotifTrade] = useState(true)
  const [notifRateAlerts, setNotifRateAlerts] = useState(true)
  const [notifSecurity, setNotifSecurity] = useState(true)

  // 4. Rate Alerts
  const [alertTargetPrice, setAlertTargetPrice] = useState('89.50')
  const [alertEnabled, setAlertEnabled] = useState(true)
  const [alertType, setAlertType] = useState<'ABOVE' | 'BELOW'>('ABOVE')

  // 5. App Tour
  const [tourStep, setTourStep] = useState(0)

  // 6. Share Feedback
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [feedbackCategory, setFeedbackCategory] = useState('P2P Trading')
  const [feedbackText, setFeedbackText] = useState('')

  const username = user?.displayName
    ? `@${user.displayName.toLowerCase().replace(/\s+/g, '')}`
    : user?.email
    ? `@${user.email.split('@')[0]}`
    : '@developer7699'
    ? `@${user.displayName.toLowerCase().replace(/\s+/g, '')}`
    : user?.email
    ? `@${user.email.split('@')[0]}`
    : '@developer7699'

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  const copyUsername = () => {
    navigator.clipboard.writeText(username)
    setCopiedUser(true)
    showToast('Username copied to clipboard!')
    setTimeout(() => setCopiedUser(false), 2500)
  }

  const handleAddPayment = () => {
    if (!newPayLabel.trim() || !newPayDetails.trim()) {
      showToast('Please fill in all payment method fields.')
      return
    }
    addPaymentMethod({
      type: newPayType,
      label: newPayLabel.trim(),
      details: newPayDetails.trim(),
    })
    setNewPayLabel('')
    setNewPayDetails('')
    setShowAddPayForm(false)
    showToast('New payment method saved successfully!')
  }

  const handleDeletePayment = (id: string) => {
    deletePaymentMethod(id)
    showToast('Payment method removed.')
  }

  const handleAddWithdrawAddr = () => {
    if (!newAddrLabel.trim() || !newAddrValue.trim()) {
      showToast('Please enter both label and wallet address.')
      return
    }
    const newEntry: WithdrawAddress = {
      id: `w-${Date.now()}`,
      label: newAddrLabel.trim(),
      address: newAddrValue.trim(),
      chain: newAddrChain === 'TRC20' ? 'TRON (TRC20)' : 'Ethereum (ERC20)',
    }
    const updated = [...withdrawAddresses, newEntry]
    setWithdrawAddresses(updated)
    try {
      localStorage.setItem(WITHDRAW_STORAGE_KEY, JSON.stringify(updated))
    } catch {}
    setNewAddrLabel('')
    setNewAddrValue('')
    setShowAddAddrForm(false)
    showToast('Withdrawal address saved!')
  }

  const handleDeleteWithdrawAddr = (id: string) => {
    const updated = withdrawAddresses.filter((w) => w.id !== id)
    setWithdrawAddresses(updated)
    try {
      localStorage.setItem(WITHDRAW_STORAGE_KEY, JSON.stringify(updated))
    } catch {}
    showToast('Address removed.')
  }

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim()) {
      showToast('Please type a brief feedback message.')
      return
    }
    setActiveModal(null)
    setFeedbackText('')
    showToast('Thank you! Your feedback has been sent to our product team.')
  }

  const tourSlides = [
    {
      title: 'Welcome to FundFusion',
      desc: 'The smartest and safest P2P crypto platform for USDT buy, sell, and instant UPI transfers.',
      icon: Sparkles,
      color: 'bg-indigo-500/20 text-indigo-400',
    },
    {
      title: 'Instant Scan & Pay',
      desc: 'Pay any merchant or user instantly using QR code scanning backed by zero-slippage USDT settlement.',
      icon: Send,
      color: 'bg-emerald-500/20 text-emerald-400',
    },
    {
      title: 'Bank Grade Security',
      desc: 'All trades are protected by automated smart contract escrow with 24/7 anti-fraud monitoring.',
      icon: ShieldCheck,
      color: 'bg-blue-500/20 text-blue-400',
    },
    {
      title: 'Custom Rate Alerts',
      desc: 'Set custom price triggers and get instant notifications when USDT rates reach your target price.',
      icon: TrendingUp,
      color: 'bg-amber-500/20 text-amber-400',
    },
  ]

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-3 relative">
      {/* Toast Notification overlay */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-slate-900/90 text-white text-xs font-bold shadow-2xl backdrop-blur-md border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top duration-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header with Back */}
      <div className="flex items-center gap-2.5 pb-1 border-b border-slate-100 dark:border-slate-800">
        <BackButton fallback="/customer/dashboard" />
        <div>
          <h1 className="text-base font-black text-slate-900 dark:text-white">{t('profile.title')}</h1>
          <p className="text-[11px] text-slate-500">{t('profile.subtitle')}</p>
        </div>
      </div>

      {/* Top Profile Card (Deep blue gradient matching screenshot) */}
      <div className="rounded-3xl bg-gradient-to-b from-indigo-600 via-indigo-700 to-indigo-900 text-white p-6 text-center space-y-4 shadow-xl shadow-indigo-600/30 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-xl pointer-events-none" />

        {/* User Avatar Circle */}
        <div className="relative inline-block mx-auto">
          <div className="w-20 h-20 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center text-white shadow-inner mx-auto backdrop-blur-md">
            <User className="w-10 h-10 text-white" />
          </div>
          <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-400 border-2 border-indigo-700 flex items-center justify-center text-[10px] text-indigo-950 font-bold shadow-xs">
            ✓
          </span>
        </div>

        {/* Username & Copy Button */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-black tracking-tight">{username}</h2>
          <button
            onClick={copyUsername}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition-all cursor-pointer border border-white/20 active:scale-95"
          >
            {copiedUser ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUser ? t('profile.copied') : t('profile.copyUsername')}</span>
          </button>
        </div>

        {/* VIP Level Progress Bar */}
        <div className="pt-2 space-y-1.5 max-w-xs mx-auto">
          <div className="h-2 w-full bg-indigo-950/60 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div className="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 rounded-full w-[12%] shadow-xs" />
          </div>
          <div className="flex justify-between items-center text-[11px] font-bold text-indigo-200">
            <span>{t('profile.vipProgress')}</span>
            <span className="font-mono text-amber-300">0%</span>
          </div>
        </div>
      </div>

      {/* GENERAL SETTINGS Card Group */}
      <div className="space-y-2">
        <p className="text-[11px] font-extrabold tracking-wider uppercase text-slate-500 dark:text-slate-400 px-3">
          {t('profile.generalSettings')}
        </p>

        <div className="rounded-3xl bg-white dark:bg-[#121829] border border-slate-200/90 dark:border-slate-800/90 divide-y divide-slate-100 dark:divide-slate-800/60 shadow-xs overflow-hidden">
          {/* 1. Manage Payments */}
          <button
            onClick={() => setActiveModal('manage_payments')}
            className="w-full flex items-center justify-between gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {t('profile.managePayments')}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {paymentMethods.length} {t('profile.methods')}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </button>

          {/* 2. Buy Methods */}
          <button
            onClick={() => setActiveModal('buy_methods')}
            className="w-full flex items-center justify-between gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {t('profile.buyMethods')}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {t('profile.verifyBank')}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </button>

          {/* 3. Language (Only English & Hindi) */}
          <button
            onClick={() => setActiveModal('language')}
            className="w-full flex items-center justify-between gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {t('profile.language')}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                {language === 'hi' ? 'हिंदी' : 'English'}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </button>

          {/* 4. Display Currency */}
          <button
            onClick={() => setActiveModal('display_currency')}
            className="w-full flex items-center justify-between gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {t('profile.displayCurrency')}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {displayCurrency}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </button>

          {/* 5. Appearance (White Mode / Dark Mode Toggle) */}
          <div
            onClick={(e) => {
              toggle(e)
              showToast(theme === 'dark' ? 'Switched to Light Mode' : 'Switched to Dark Mode')
            }}
            className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {t('profile.appearance')}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                {theme === 'dark' ? t('profile.darkMode') : t('profile.whiteMode')}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </div>

          {/* 6. Withdraw Address (Image 2: Fixed Spacing & Never Stuck Together) */}
          <button
            onClick={() => setActiveModal('withdraw_address')}
            className="w-full flex items-center justify-between gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Send className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {t('profile.withdrawAddress')}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {withdrawAddresses.length} {t('profile.addresses')}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </button>

          {/* 7. Notification Settings */}
          <button
            onClick={() => setActiveModal('notification_settings')}
            className="w-full flex items-center justify-between gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {t('profile.notificationSettings')}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>

          {/* 8. Rate Alerts */}
          <button
            onClick={() => setActiveModal('rate_alerts')}
            className="w-full flex items-center justify-between gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {t('profile.rateAlerts')}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Active
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </button>
        </div>
      </div>

      {/* HELP & SUPPORT Card Group */}
      <div className="space-y-2 pt-2">
        <p className="text-[11px] font-extrabold tracking-wider uppercase text-slate-500 dark:text-slate-400 px-3">
          {t('profile.helpSupport')}
        </p>

        <div className="rounded-3xl bg-white dark:bg-[#121829] border border-slate-200/90 dark:border-slate-800/90 divide-y divide-slate-100 dark:divide-slate-800/60 shadow-xs overflow-hidden">
          {/* 9. Take the App Tour */}
          <button
            onClick={() => {
              setTourStep(0)
              setActiveModal('app_tour')
            }}
            className="w-full flex items-center justify-between gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {t('profile.appTour')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold shrink-0">
              <span>Replay</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* 10. Contact Support */}
          <button
            onClick={() => setActiveModal('contact_support')}
            className="w-full flex items-center justify-between gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {t('profile.contactSupport')}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>

          {/* 11. Share Feedback */}
          <button
            onClick={() => setActiveModal('share_feedback')}
            className="w-full flex items-center justify-between gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {t('profile.shareFeedback')}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>

          {/* 12. Privacy Policy */}
          <button
            onClick={() => setActiveModal('privacy_policy')}
            className="w-full flex items-center justify-between gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {t('profile.privacyPolicy')}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>

          {/* 13. Log out */}
          <button
            onClick={() => setActiveModal('logout_confirm')}
            className="w-full flex items-center justify-between gap-3 p-4 hover:bg-rose-500/10 transition-colors group cursor-pointer text-rose-600 dark:text-rose-400 text-left"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-black truncate">{t('profile.logout')}</span>
            </div>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>
        </div>
      </div>

      {/* ======================= MODALS POPUPS ======================= */}

      {/* 1. MANAGE PAYMENTS MODAL */}
      {activeModal === 'manage_payments' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Manage Payment Methods</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {paymentMethods.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                  No saved payment methods yet.
                </div>
              ) : (
                paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">{method.label}</span>
                        {method.isDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{method.details}</p>
                    </div>
                    <button
                      onClick={() => handleDeletePayment(method.id)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}

              {showAddPayForm ? (
                <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 space-y-3 pt-3">
                  <div className="flex justify-between items-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <span>Add New Method</span>
                    <button onClick={() => setShowAddPayForm(false)} className="text-slate-400 hover:text-slate-600">
                      Cancel
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewPayType('UPI')}
                      className={cn(
                        'flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all',
                        newPayType === 'UPI'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      )}
                    >
                      UPI ID
                    </button>
                    <button
                      onClick={() => setNewPayType('BANK')}
                      className={cn(
                        'flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all',
                        newPayType === 'BANK'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      )}
                    >
                      Bank Account
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder={newPayType === 'UPI' ? 'Label (e.g. Google Pay)' : 'Bank Name'}
                    value={newPayLabel}
                    onChange={(e) => setNewPayLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder={newPayType === 'UPI' ? 'VPA (e.g. name@upi)' : 'Account No & IFSC'}
                    value={newPayDetails}
                    onChange={(e) => setNewPayDetails(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                  <button
                    onClick={handleAddPayment}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
                  >
                    Save Method
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddPayForm(true)}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-slate-500 hover:text-indigo-600 dark:text-slate-400 flex items-center justify-center gap-2 text-xs font-bold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Payment Method</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. BUY METHODS MODAL */}
      {activeModal === 'buy_methods' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Buy Methods & Limits</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-400">Level 1 Identity Verified</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Instant P2P purchasing up to <b>$5,000 / day</b> enabled.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex justify-between items-center text-xs font-extrabold">
                  <span className="text-slate-900 dark:text-white">Level 2 Bank Verification</span>
                  <span className="text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full text-[10px]">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Verify your primary bank account to unlock <b>$50,000 / day</b> P2P limits & zero-fee withdrawals.
                </p>
                <button
                  onClick={() => {
                    setActiveModal(null)
                    navigate('/customer/verification')
                  }}
                  className="w-full mt-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
                >
                  Verify Bank Account Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. LANGUAGE MODAL (ONLY ENGLISH & HINDI) */}
      {activeModal === 'language' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {t('modal.selectLanguage')}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {[
                { id: 'en', name: 'English', native: 'English (US)', flag: '🇺🇸' },
                { id: 'hi', name: 'हिंदी', native: 'Hindi (हिंदी)', flag: '🇮🇳' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => {
                    setLanguage(lang.id as 'en' | 'hi')
                    setActiveModal(null)
                    showToast(lang.id === 'hi' ? 'भाषा बदलकर हिंदी कर दी गई है' : 'Language set to English')
                  }}
                  className={cn(
                    'w-full p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer',
                    language === lang.id
                      ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-xs'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{lang.flag}</span>
                    <div className="text-left">
                      <span className="block font-black text-xs text-slate-900 dark:text-white">{lang.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{lang.native}</span>
                    </div>
                  </div>
                  {language === lang.id && <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. DISPLAY CURRENCY MODAL */}
      {activeModal === 'display_currency' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Display Currency</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {[
                { code: 'USDT', symbol: '$', rate: '1.00 USDT' },
                { code: 'INR', symbol: '₹', rate: '88.50 INR / USDT' },
                { code: 'USD', symbol: '$', rate: '1.00 USD' },
                { code: 'EUR', symbol: '€', rate: '0.92 EUR / USDT' },
              ].map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => {
                    setDisplayCurrency(curr.code as any)
                    setActiveModal(null)
                    showToast(`Display Currency updated to ${curr.code}`)
                  }}
                  className={cn(
                    'w-full p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer',
                    displayCurrency === curr.code
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                      {curr.symbol}
                    </span>
                    <span>{curr.code}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{curr.rate}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. WITHDRAW ADDRESS MODAL */}
      {activeModal === 'withdraw_address' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Withdrawal Addresses</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {withdrawAddresses.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">{item.label}</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {item.chain}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{item.address}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteWithdrawAddr(item.id)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {showAddAddrForm ? (
                <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3 pt-3">
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span>Add New Address</span>
                    <button onClick={() => setShowAddAddrForm(false)} className="text-slate-400 hover:text-slate-600">
                      Cancel
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewAddrChain('TRC20')}
                      className={cn(
                        'flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all',
                        newAddrChain === 'TRC20'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      )}
                    >
                      TRON (TRC20)
                    </button>
                    <button
                      onClick={() => setNewAddrChain('ERC20')}
                      className={cn(
                        'flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all',
                        newAddrChain === 'ERC20'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      )}
                    >
                      Ethereum (ERC20)
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Address Label (e.g. Binance Wallet)"
                    value={newAddrLabel}
                    onChange={(e) => setNewAddrLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Wallet Address (0x... or T...)"
                    value={newAddrValue}
                    onChange={(e) => setNewAddrValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  />
                  <button
                    onClick={handleAddWithdrawAddr}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                  >
                    Save Address
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddAddrForm(true)}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-500 hover:text-emerald-600 dark:text-slate-400 flex items-center justify-center gap-2 text-xs font-bold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Withdrawal Address</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. NOTIFICATION SETTINGS MODAL */}
      {activeModal === 'notification_settings' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Notification Preferences</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Push Notifications', desc: 'Instant alerts on your device', val: notifPush, set: setNotifPush },
                { label: 'Trade & Order Updates', desc: 'Escrow payment & release pings', val: notifTrade, set: setNotifTrade },
                { label: 'Price Rate Alerts', desc: 'USDT target price notifications', val: notifRateAlerts, set: setNotifRateAlerts },
                { label: 'Security & Login Alerts', desc: 'Account access & 2FA notices', val: notifSecurity, set: setNotifSecurity },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.label}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => item.set(!item.val)}
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer',
                      item.val ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full bg-white transition-transform shadow-xs',
                        item.val ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 9. RATE ALERTS MODAL */}
      {activeModal === 'rate_alerts' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">USDT Rate Alerts</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Live Market Price
                </p>
                <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">₹88.50 / USDT</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Set Target Alert Price (INR)</label>
                <div className="flex gap-2">
                  <select
                    value={alertType}
                    onChange={(e) => setAlertType(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="ABOVE">Rises Above</option>
                    <option value="BELOW">Drops Below</option>
                  </select>
                  <input
                    type="number"
                    value={alertTargetPrice}
                    onChange={(e) => setAlertTargetPrice(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Enable Push Alert</span>
                <button
                  onClick={() => setAlertEnabled(!alertEnabled)}
                  className={cn(
                    'w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer',
                    alertEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform shadow-xs',
                      alertEnabled ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              <button
                onClick={() => {
                  setActiveModal(null)
                  showToast(`Rate alert set for ₹${alertTargetPrice}!`)
                }}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                Save Rate Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. APP TOUR MODAL */}
      {activeModal === 'app_tour' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 text-center space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            {(() => {
              const CurrentIcon = tourSlides[tourStep].icon
              return (
                <div
                  className={cn(
                    'w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-inner',
                    tourSlides[tourStep].color
                  )}
                >
                  <CurrentIcon className="w-8 h-8" />
                </div>
              )
            })()}

            <div className="space-y-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {tourSlides[tourStep].title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                {tourSlides[tourStep].desc}
              </p>
            </div>

            {/* Step Indicators */}
            <div className="flex justify-center gap-1.5 pt-2">
              {tourSlides.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    idx === tourStep ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-300 dark:bg-slate-700'
                  )}
                />
              ))}
            </div>

            {/* Controls */}
            <div className="flex gap-2 pt-2">
              {tourStep > 0 && (
                <button
                  onClick={() => setTourStep((prev) => prev - 1)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (tourStep < tourSlides.length - 1) {
                    setTourStep((prev) => prev + 1)
                  } else {
                    setActiveModal(null)
                    showToast('Tour completed! You are ready to trade.')
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
              >
                {tourStep === tourSlides.length - 1 ? 'Finish Tour' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. CONTACT SUPPORT MODAL (EMAIL SUPPORT ONLY) */}
      {activeModal === 'contact_support' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-5 space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-teal-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {t('modal.contactSupport')}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="p-4.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      {t('modal.emailSupport')}
                    </h4>
                    <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      24/7 Priority Resolution Desk
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                    support@fundfusion.io
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('support@fundfusion.io')
                      showToast('Support email copied to clipboard!')
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1"
                    title="Copy Email"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Copy</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('modal.emailResponse')}
                </p>

                <a
                  href="mailto:support@fundfusion.io?subject=Support%20Request%20-%20FundFusion%20User"
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-teal-600/20 flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t('modal.sendEmail')}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 13. SHARE FEEDBACK MODAL */}
      {activeModal === 'share_feedback' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Share Your Feedback</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Star Rating */}
              <div className="text-center space-y-1.5">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">How would you rate FundFusion?</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={cn('w-6 h-6', star <= feedbackRating ? 'fill-amber-400' : 'text-slate-300 dark:text-slate-700')}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Text area */}
              <textarea
                rows={3}
                placeholder="Tell us what you love or what we can improve..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />

              <button
                onClick={handleSubmitFeedback}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 14. PRIVACY POLICY MODAL */}
      {activeModal === 'privacy_policy' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Privacy & Terms</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <h4 className="font-black text-slate-900 dark:text-white">1. Bank Level Data Encryption</h4>
              <p>
                All personal profile information, payment VPA keys, and KYC records are encrypted using AES-256 GCM standards and never shared with unverified third parties.
              </p>

              <h4 className="font-black text-slate-900 dark:text-white">2. Smart Escrow Security</h4>
              <p>
                FundFusion P2P trades utilize non-custodial smart escrow contracts. Assets are only locked during active trade windows and released upon confirmed bank verification.
              </p>

              <h4 className="font-black text-slate-900 dark:text-white">3. Zero-Slippage Guarantee</h4>
              <p>
                All USDT to fiat conversions locked at order creation time are guaranteed against market slippage.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 15. LOGOUT CONFIRMATION MODAL */}
      {activeModal === 'logout_confirm' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 text-center space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="w-12 h-12 rounded-full bg-rose-500/15 text-rose-500 mx-auto flex items-center justify-center">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Log out of FundFusion?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You will need to sign back in to access your wallet and active P2P trades.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setActiveModal(null)
                  await logout()
                  navigate('/')
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
