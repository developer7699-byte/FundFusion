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
  Smartphone,
  Star,
  Eye,
  EyeOff,
  KeyRound,
  QrCode,
  Laptop,
  Edit3,
  Award,
  Share2,
  Lock,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language'
import { usePaymentMethods } from '@/lib/payment-methods'
import { ToastNotification } from '@/components/ui/ToastNotification'

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
  | '2fa_modal'
  | 'kyc_modal'
  | 'password_modal'
  | 'anti_phishing_modal'
  | 'sessions_modal'
  | 'vip_modal'
  | 'edit_name_modal'
  | 'market_overview_modal'

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
  const [displayCurrency, setDisplayCurrency] = useState<'USDT' | 'INR' | 'USD' | 'EUR'>('USD')
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [profileTab, setProfileTab] = useState<'my_info' | 'security' | 'preference' | 'general'>('my_info')
  const [alwaysOn, setAlwaysOn] = useState(false)

  // Full User Info & Security states
  const [showFullEmail, setShowFullEmail] = useState(false)
  const [displayName, setDisplayName] = useState(user?.displayName || 'developer7699')
  const [nicknameInput, setNicknameInput] = useState('')
  const [totpEnabled, setTotpEnabled] = useState(true)
  const [antiPhishingCode, setAntiPhishingCode] = useState('FUND-SAFE-92')
  const [newAntiPhishingInput, setNewAntiPhishingInput] = useState('')
  const [currPassInput, setCurrPassInput] = useState('')
  const [newPassInput, setNewPassInput] = useState('')
  const [confirmPassInput, setConfirmPassInput] = useState('')
  const [sessions, setSessions] = useState([
    { id: 's1', device: 'Chrome on Windows 11', location: 'New Delhi, India', ip: '103.212.44.18', isCurrent: true, time: 'Active now' },
    { id: 's2', device: 'Safari on iPhone 15 Pro', location: 'Mumbai, India', ip: '49.36.120.91', isCurrent: false, time: 'Active 2h ago' },
  ])

  const userEmail = user?.email || 'customer@fundfusion.io'
  const emailParts = userEmail.split('@')
  const emailPrefix = emailParts[0] || 'customer'
  const emailDomain = emailParts[1] || 'fundfusion.io'
  const maskedPrefix = emailPrefix.length > 3
    ? `${emailPrefix.slice(0, 3)}${'*'.repeat(Math.max(4, emailPrefix.length - 3))}`
    : `${emailPrefix}***`
  const maskedEmail = `${maskedPrefix}@${emailDomain}`

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
    <div className="space-y-4 max-w-lg mx-auto pb-24 relative">
      {/* Toast Notification overlay */}
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Top Header Matching Image 5: Back Arrow, User Center, Sun/Moon Theme Toggle, Globe Language */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <BackButton fallback="/customer/dashboard" />
        <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">User Center</h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              toggle(e)
              showToast(theme === 'dark' ? 'Switched to Light Mode' : 'Switched to Dark Mode')
            }}
            className="p-1.5 sm:p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Toggle Color Theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400 stroke-[2]" /> : <Moon className="w-5 h-5 text-slate-700 stroke-[2]" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveModal('language')}
            className="p-1.5 sm:p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Language"
          >
            <Globe className="w-5 h-5 stroke-[2]" />
          </button>
        </div>
      </div>

      {/* User Profile Header Card Matching Image 5 */}
      <div className="flex items-center gap-3.5 py-3 px-1">
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-slate-400 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-500 p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-black">
              <User className="w-7 h-7" />
            </div>
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-[#f7a83b] text-slate-950 flex items-center justify-center text-[10px] font-black shadow-xs ring-2 ring-white dark:ring-[#0b1020]">
            ✓
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1 w-full h-7">
            <h2 className="text-[13.5px] sm:text-sm font-black tracking-tight text-slate-900 dark:text-white font-mono truncate select-all">
              {showFullEmail ? userEmail : maskedEmail}
            </h2>
            <button
              type="button"
              onClick={() => setShowFullEmail(!showFullEmail)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-1"
              title={showFullEmail ? 'Hide Email' : 'Show Full Email'}
            >
              {showFullEmail ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <span className="inline-block mt-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
            Site: FundFusion Global
          </span>
        </div>
      </div>

      {/* Horizontal Tabs Matching Image 5: My info | Security | Preference | General (Equal 4 Grid Columns) */}
      <div className="grid grid-cols-4 border-b border-slate-100 dark:border-slate-800 text-center">
        {[
          { id: 'my_info', label: 'My info' },
          { id: 'security', label: 'Security' },
          { id: 'preference', label: 'Preference' },
          { id: 'general', label: 'General' },
        ].map((tab) => {
          const isActive = profileTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setProfileTab(tab.id as any)}
              className={cn(
                'py-3 text-[12px] sm:text-[13px] font-bold transition-all cursor-pointer relative truncate px-0.5 select-none',
                isActive
                  ? 'text-slate-900 dark:text-white font-extrabold'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
              )}
            >
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-[#f7a83b] rounded-full transition-all shadow-xs" />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="pt-1">
        {profileTab === 'general' && (
          /* General Tab (Image 5 exact menu list) */
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {/* 1. Language */}
            <button
              type="button"
              onClick={() => setActiveModal('language')}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Language</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="font-semibold">{language === 'hi' ? 'हिंदी' : 'English'}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            {/* 2. Currency Display */}
            <button
              type="button"
              onClick={() => setActiveModal('display_currency')}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Currency Display</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="font-semibold font-mono">{displayCurrency}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            {/* 3. Color Theme */}
            <button
              type="button"
              onClick={(e) => {
                toggle(e)
                showToast(theme === 'dark' ? 'Switched to Light Mode' : 'Switched to Dark Mode')
              }}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <Sun className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Color Theme</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="font-semibold">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            {/* 4. Always on (no screen lock) */}
            <div className="w-full flex items-center justify-between py-3.5 px-2">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Always on (no screen lock)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !alwaysOn
                  setAlwaysOn(next)
                  showToast(next ? 'Screen keep-awake enabled' : 'Screen keep-awake disabled')
                }}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer flex items-center',
                  alwaysOn ? 'bg-[#f7a83b]' : 'bg-slate-200 dark:bg-slate-700'
                )}
                aria-label="Toggle screen keep awake"
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full bg-white transition-transform shadow-xs',
                    alwaysOn ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* 5. Help Center (Moved from top header!) */}
            <button
              type="button"
              onClick={() => navigate('/customer/support')}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Help Center</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* 6. Trade market overview */}
            <button
              type="button"
              onClick={() => setActiveModal('market_overview_modal')}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Trade market overview</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#f7a83b] font-bold">
                <span>₹89.95</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* 7. Contact Support */}
            <button
              type="button"
              onClick={() => setActiveModal('contact_support')}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Contact Support</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* 8. User feedback */}
            <button
              type="button"
              onClick={() => setActiveModal('share_feedback')}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">User feedback</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        )}

        {profileTab === 'security' && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {/* 1. 2FA */}
            <button
              type="button"
              onClick={() => setActiveModal('2fa_modal')}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer text-left"
            >
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">2-Factor Authentication</span>
                <span className="text-[11px] text-slate-400">Google Authenticator (TOTP)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn('text-xs font-bold px-2.5 py-0.5 rounded-full', totpEnabled ? 'text-orange-600 dark:text-orange-400 bg-orange-500/10' : 'text-slate-500 bg-slate-100 dark:bg-slate-800')}>
                  {totpEnabled ? 'Active' : 'Disabled'}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* 2. KYC */}
            <button
              type="button"
              onClick={() => setActiveModal('kyc_modal')}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer text-left"
            >
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">Identity Verification (KYC)</span>
                <span className="text-[11px] text-slate-400">Aadhaar & PAN Linked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-full">Tier 2 Verified</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* 3. Login Password */}
            <button
              type="button"
              onClick={() => setActiveModal('password_modal')}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer text-left"
            >
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">Login Password</span>
                <span className="text-[11px] text-slate-400">Tap to change password</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* 4. Anti-Phishing Code */}
            <button
              type="button"
              onClick={() => setActiveModal('anti_phishing_modal')}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer text-left"
            >
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">Anti-Phishing Code</span>
                <span className="text-[11px] text-slate-400">Protects official emails</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 font-mono">{antiPhishingCode}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* 5. Device Sessions */}
            <button
              type="button"
              onClick={() => setActiveModal('sessions_modal')}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer text-left"
            >
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">Device Management</span>
                <span className="text-[11px] text-slate-400">{sessions.length} Active devices</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#f7a83b] font-bold">Online</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>
          </div>
        )}

        {profileTab === 'my_info' && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {/* 1. Nickname */}
            <div className="flex items-center justify-between py-3.5 px-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Nickname</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">@{displayName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setNicknameInput(displayName)
                    setActiveModal('edit_name_modal')
                  }}
                  className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Edit Display Name"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 2. UID */}
            <div className="flex items-center justify-between py-3.5 px-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">UID</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">8920194</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('8920194')
                    showToast('UID 8920194 copied!')
                  }}
                  className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Copy UID"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* 3. Email */}
            <div className="flex items-center justify-between py-3.5 px-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Email Address</span>
              <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                {showFullEmail ? userEmail : maskedEmail}
              </span>
            </div>

            {/* 4. VIP Level */}
            <button
              type="button"
              onClick={() => setActiveModal('vip_modal')}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer text-left"
            >
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">VIP Level</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Award className="w-3 h-3" /> VIP 1
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* 5. Account Status */}
            <div className="flex items-center justify-between py-3.5 px-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Account Status</span>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Good Standing
              </span>
            </div>

            {/* 6. Referral Code */}
            <div className="flex items-center justify-between py-3.5 px-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Referral Code</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">FF-892019</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('FF-892019')
                    showToast('Referral code copied to clipboard!')
                  }}
                  className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Copy Referral Code"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* 7. Registration Date */}
            <div className="flex items-center justify-between py-3.5 px-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Registration Date</span>
              <span className="text-xs text-slate-400 font-mono">Nov 2026</span>
            </div>
          </div>
        )}

        {profileTab === 'preference' && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            <button
              type="button"
              onClick={() => setActiveModal('manage_payments')}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors text-left"
            >
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Payment Accounts</span>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="font-semibold">{paymentMethods.length} Methods</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('withdraw_address')}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors text-left"
            >
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Withdraw Addresses</span>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="font-semibold">{withdrawAddresses.length} Saved</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('notification_settings')}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors text-left"
            >
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Push & Trade Notifications</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('rate_alerts')}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors text-left"
            >
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Custom Rate Alerts</span>
              <span className="text-xs font-bold text-emerald-600">Active</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTourStep(0)
                setActiveModal('app_tour')
              }}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors text-left"
            >
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">App Tour & Overview</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        )}

        {/* Log Out Button at the Bottom */}
        <div className="pt-8 pb-12">
          <button
            type="button"
            onClick={() => setActiveModal('logout_confirm')}
            className="w-full py-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/15 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
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
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setActiveModal(null)
                  await logout()
                  navigate('/')
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 16. 2FA AUTHENTICATOR MODAL */}
      {activeModal === '2fa_modal' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">2-Factor Authentication</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-slate-900 dark:text-white block">Google Authenticator (TOTP)</span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Active & Protecting Trades</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !totpEnabled
                    setTotpEnabled(next)
                    showToast(next ? '2FA Authenticator activated' : '2FA Authenticator temporarily paused')
                  }}
                  className={cn(
                    'w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer flex items-center',
                    totpEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  )}
                >
                  <div className={cn('w-5 h-5 rounded-full bg-white transition-transform shadow-xs', totpEnabled ? 'translate-x-5' : 'translate-x-0')} />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Backup Secret Key</span>
                <div className="flex items-center justify-between font-mono bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-white">JBSW Y3DP EHPK 3PXP</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('JBSWY3DPEHPK3PXP')
                      showToast('2FA Secret Key copied!')
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Save this key in a secure place. If you lose your phone, you can restore your authenticator codes.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveModal(null)
                  showToast('Security settings verified')
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 17. KYC MODAL */}
      {activeModal === 'kyc_modal' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">KYC Verification Status</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-black text-emerald-700 dark:text-emerald-400">Tier 2 Verified</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">Full Access</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Government ID (Aadhaar & PAN) and selfie match successfully completed.
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <span className="text-slate-500 font-bold">Daily P2P Buy/Sell Limit</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">$50,000 USDT</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <span className="text-slate-500 font-bold">Daily Crypto Withdrawal</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">100,000 USDT</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <span className="text-slate-500 font-bold">Bank / UPI Settlement</span>
                  <span className="text-emerald-600 font-bold">Instant Instant 24×7</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 18. LOGIN PASSWORD MODAL */}
      {activeModal === 'password_modal' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Change Password</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">Current Password</label>
                <input
                  type="password"
                  value={currPassInput}
                  onChange={(e) => setCurrPassInput(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">New Password</label>
                <input
                  type="password"
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassInput}
                  onChange={(e) => setConfirmPassInput(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newPassInput || newPassInput.length < 6) {
                      showToast('Password must be at least 6 characters.')
                      return
                    }
                    if (newPassInput !== confirmPassInput) {
                      showToast('New passwords do not match.')
                      return
                    }
                    setCurrPassInput('')
                    setNewPassInput('')
                    setConfirmPassInput('')
                    setActiveModal(null)
                    showToast('Login password updated successfully!')
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 19. ANTI-PHISHING CODE MODAL */}
      {activeModal === 'anti_phishing_modal' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Anti-Phishing Code</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Your Anti-Phishing code is included in every genuine email from FundFusion. If an email does not contain this exact code, it is fraudulent.
              </p>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-600">Active Anti-Phishing Code</span>
                <p className="text-xl font-mono font-black text-slate-900 dark:text-white">{antiPhishingCode}</p>
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-bold text-slate-500">Change Custom Code</label>
                <input
                  type="text"
                  maxLength={16}
                  placeholder="Enter new 4-16 letter code"
                  value={newAntiPhishingInput}
                  onChange={(e) => setNewAntiPhishingInput(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white text-xs font-bold"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (newAntiPhishingInput.trim().length >= 4) {
                    setAntiPhishingCode(newAntiPhishingInput.trim())
                    setNewAntiPhishingInput('')
                    setActiveModal(null)
                    showToast('Anti-phishing code updated!')
                  } else {
                    showToast('Code must be at least 4 characters.')
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
              >
                Save Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 20. SESSIONS MODAL */}
      {activeModal === 'sessions_modal' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-indigo-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Active Device Sessions</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {sessions.map((s) => (
                <div key={s.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-900 dark:text-white">{s.device}</span>
                    {s.isCurrent ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600">Current</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">{s.time}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">{s.location} · {s.ip}</p>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  setSessions(sessions.filter((s) => s.isCurrent))
                  showToast('All other device sessions terminated!')
                }}
                className="w-full mt-2 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-rose-600 font-bold text-xs"
              >
                Log Out All Other Devices
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 21. VIP MODAL */}
      {activeModal === 'vip_modal' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">VIP Trader Perks</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/10 border border-amber-500/30 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400">VIP Level 1</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950">Active Tier</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Qualified via 30-day volume & Tier 2 bank verification.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { label: '0% Maker Trading Fees', desc: 'No platform commission on standard P2P orders' },
                  { label: 'Tier 1 Local Vault Delivery', desc: 'Guaranteed local voucher fulfillment under 15 seconds' },
                  { label: '24/7 Dedicated Desk Support', desc: 'Average ticket resolution under 3 minutes' },
                  { label: 'Maximum Escrow Protection', desc: 'Triple check smart contract guarantee' },
                ].map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white block">{item.label}</span>
                      <span className="text-[10px] text-slate-400">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 22. EDIT NICKNAME MODAL */}
      {activeModal === 'edit_name_modal' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Change Nickname</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">New Display Name</label>
                <input
                  type="text"
                  maxLength={24}
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder="Enter custom nickname"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (nicknameInput.trim()) {
                      setDisplayName(nicknameInput.trim())
                      setActiveModal(null)
                      showToast('Nickname updated!')
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 23. LIVE MARKET OVERVIEW MODAL */}
      {activeModal === 'market_overview_modal' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-[360px] p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">P2P Market Overview</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase block">Buy USDT</span>
                  <span className="text-lg font-black font-mono text-slate-900 dark:text-white">₹89.95</span>
                  <span className="text-[10px] text-emerald-500 font-bold">+0.12%</span>
                </div>
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <span className="text-[10px] font-bold text-blue-600 uppercase block">Sell USDT</span>
                  <span className="text-lg font-black font-mono text-slate-900 dark:text-white">₹89.80</span>
                  <span className="text-[10px] text-emerald-500 font-bold">+0.08%</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-bold">24h P2P Volume</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">$1,420,890 USDT</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-bold">Avg. Escrow Release</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">42 seconds</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-bold">Dispute Rate</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">0.04% (Protected)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveModal(null)
                  navigate('/customer/dashboard?tab=leaderboard')
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Open Full Orderbook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
