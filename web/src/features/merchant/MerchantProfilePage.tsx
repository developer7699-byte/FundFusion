import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Store,
  Building2,
  Sliders,
  TrendingUp,
  Moon,
  Sun,
  Globe,
  ShieldCheck,
  Headphones,
  LogOut,
  ChevronRight,
  Sparkles,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  X,
} from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { useLanguage } from '@/lib/language'
import { useMerchantStore } from '@/lib/merchant-store'
import { cn } from '@/lib/utils'

export function MerchantProfile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  const {
    deskName,
    isOnline,
    toggleDeskOnline,
    rating,
    totalTrades,
    accounts,
    minLimit,
    maxLimit,
    updateLimits,
  } = useMerchantStore()

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false)
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false)
  const [newMin, setNewMin] = useState(String(minLimit))
  const [newMax, setNewMax] = useState(String(maxLimit))

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleSaveLimits = (e: React.FormEvent) => {
    e.preventDefault()
    const minVal = parseFloat(newMin) || 500
    const maxVal = parseFloat(newMax) || 100000
    updateLimits(minVal, maxVal)
    setIsLimitsModalOpen(false)
    showToast(`Trading limits updated: ₹${minVal.toLocaleString('en-IN')} - ₹${maxVal.toLocaleString('en-IN')}`)
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-slate-900/90 text-white text-xs font-bold shadow-2xl backdrop-blur-md border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top duration-300">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/merchant/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Merchant Desk Profile
            </h1>
            <p className="text-[11px] text-slate-500">Desk credentials & operational settings</p>
          </div>
        </div>
      </div>

      {/* Hero Desk Card */}
      <div className="rounded-3xl bg-gradient-to-tr from-[#0a2316] via-[#0d3420] to-[#0a2316] text-white p-5 shadow-xl border border-emerald-500/30 relative overflow-hidden space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black tracking-tight">{deskName}</h2>
                <span className="p-0.5 rounded-full bg-emerald-400 text-slate-950 text-[9px] font-bold">
                  ✓
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 font-medium">
                Verified OTC Desk Partner · {rating} Rating
              </p>
              <p className="text-[10px] text-slate-400 font-mono pt-0.5">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Online Switch & Customer Mode Quick Nav */}
        <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full',
                isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              )}
            />
            <span className="text-[11px] font-bold text-emerald-100">
              {isOnline ? 'Taking Orders (Online)' : 'Paused (Offline)'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              toggleDeskOnline()
              showToast(isOnline ? 'Desk set to Offline' : 'Desk set to Online!')
            }}
            className="px-3 py-1 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-[10px] transition-transform active:scale-95 cursor-pointer"
          >
            {isOnline ? 'Pause' : 'Go Online'}
          </button>
        </div>
      </div>

      {/* Switch to Customer App Pill */}
      <Link
        to="/customer/dashboard"
        className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-500/20 flex items-center justify-between text-xs hover:border-indigo-500/40 transition-all group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 dark:text-white block">Switch to Customer Mode</span>
            <span className="text-[10px] text-slate-400">Buy, sell, recharge bills & scan UPI QR codes</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
      </Link>

      {/* Desk Settings Group */}
      <div className="space-y-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1">
          Desk Preferences & Rails
        </span>

        <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-2xs overflow-hidden text-xs">
          {/* Settlement Accounts */}
          <Link
            to="/merchant/payment-methods"
            className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span className="font-bold text-slate-900 dark:text-white">Settlement Accounts</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span>{accounts.length} Accounts</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Trade Limits */}
          <button
            type="button"
            onClick={() => {
              setNewMin(String(minLimit))
              setNewMax(String(maxLimit))
              setIsLimitsModalOpen(true)
            }}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-slate-900 dark:text-white">Trading Ticket Limits</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="font-mono">₹{minLimit.toLocaleString()} - ₹{maxLimit.toLocaleString()}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Earnings & Tier */}
          <Link
            to="/merchant/earnings"
            className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-slate-900 dark:text-white">Earnings & Tier Status</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-amber-500 font-bold">Gold 1.50%</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Appearance Toggle */}
          <button
            type="button"
            onClick={(e) => {
              toggle(e)
              showToast(theme === 'dark' ? 'Switched to Light Mode' : 'Switched to Dark Mode')
            }}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span className="font-bold text-slate-900 dark:text-white">Appearance</span>
            </div>
            <span className="font-bold text-slate-400">
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
          </button>

          {/* Language */}
          <button
            type="button"
            onClick={() => setIsLanguageModalOpen(true)}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-cyan-500" />
              <span className="font-bold text-slate-900 dark:text-white">Language</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span>{language === 'hi' ? 'हिंदी (Hindi)' : 'English'}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Arbitrator Support */}
          <Link
            to="/customer/support"
            className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-500" />
              <span className="font-bold text-slate-900 dark:text-white">Arbitrator Support Desk</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-emerald-500 font-bold">24/7 Desk</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Sign Out */}
          <button
            type="button"
            onClick={async () => {
              await logout()
              navigate('/login')
            }}
            className="w-full p-3.5 flex items-center justify-between text-rose-500 hover:bg-rose-500/10 transition-colors group cursor-pointer text-left font-bold"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </div>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Ticket Limits Modal */}
      {isLimitsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleSaveLimits}
            className="w-full max-w-[360px] bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Set Trading Ticket Limits
              </h3>
              <button
                type="button"
                onClick={() => setIsLimitsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-500 font-bold">Minimum Order Value (INR)</label>
                <input
                  type="number"
                  required
                  value={newMin}
                  onChange={(e) => setNewMin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold">Maximum Order Value (INR)</label>
                <input
                  type="number"
                  required
                  value={newMax}
                  onChange={(e) => setNewMax(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md"
            >
              Save Limits
            </button>
          </form>
        </div>
      )}

      {/* Language Modal */}
      {isLanguageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-[360px] bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Select Language</h3>
              <button
                type="button"
                onClick={() => setIsLanguageModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setLanguage('en')
                  setIsLanguageModalOpen(false)
                  showToast('Language updated to English')
                }}
                className={cn(
                  'w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer',
                  language === 'en'
                    ? 'border-emerald-500 bg-emerald-500/10 font-bold text-emerald-600'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                )}
              >
                <span>🇬🇧 English</span>
                {language === 'en' && <Check className="w-4 h-4 text-emerald-500" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setLanguage('hi')
                  setIsLanguageModalOpen(false)
                  showToast('भाषा हिंदी में सेट हो गई है')
                }}
                className={cn(
                  'w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer',
                  language === 'hi'
                    ? 'border-emerald-500 bg-emerald-500/10 font-bold text-emerald-600'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                )}
              >
                <span>🇮🇳 हिंदी (Hindi)</span>
                {language === 'hi' && <Check className="w-4 h-4 text-emerald-500" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

