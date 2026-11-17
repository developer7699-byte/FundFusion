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
  LogOut,
  ChevronRight,
  Check,
  X,
  Copy,
  Send,
} from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { useLanguage } from '@/lib/language'
import { useMerchantStore } from '@/lib/merchant-store'
import { cn } from '@/lib/utils'
import { ToastNotification } from '@/components/ui/ToastNotification'

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
    accounts,
    minLimit,
    maxLimit,
    updateLimits,
  } = useMerchantStore()

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false)
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false)
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)
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
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/merchant/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {t('merchantProfile.title')}
            </h1>
            <p className="text-[11px] text-slate-500">{t('merchantProfile.subtitle')}</p>
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
                {t('merchantProfile.verified')} · {rating}
              </p>
              <p className="text-[10px] text-slate-400 font-mono pt-0.5">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Online Switch */}
        <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full',
                isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              )}
            />
            <span className="text-[11px] font-bold text-emerald-100">
              {isOnline ? t('merchantProfile.online') : t('merchantProfile.offline')}
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
            {isOnline ? t('merchantProfile.pause') : t('merchantProfile.resume')}
          </button>
        </div>
      </div>

      {/* Desk Settings Group */}
      <div className="space-y-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1">
          {t('merchantProfile.preferences')}
        </span>

        <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-2xs overflow-hidden text-xs">
          {/* Settlement Accounts */}
          <Link
            to="/merchant/payment-methods"
            className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span className="font-bold text-slate-900 dark:text-white">{t('merchantProfile.settlementAccounts')}</span>
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
              <span className="font-bold text-slate-900 dark:text-white">{t('merchantProfile.tradingLimits')}</span>
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
              <span className="font-bold text-slate-900 dark:text-white">{t('merchantProfile.earningsTier')}</span>
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
              <span className="font-bold text-slate-900 dark:text-white">{t('merchantProfile.appearance')}</span>
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
              <span className="font-bold text-slate-900 dark:text-white">{t('merchantProfile.language')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span>{language === 'hi' ? 'हिंदी (Hindi)' : 'English'}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Arbitrator Support */}
          <button
            type="button"
            onClick={() => setIsSupportModalOpen(true)}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-500" />
              <span className="font-bold text-slate-900 dark:text-white">{t('merchantProfile.supportDesk')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-emerald-500 font-bold">24/7 Desk</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

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
              <span>{t('merchantProfile.logout')}</span>
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

      {/* Merchant Desk Arbitrator Support Modal */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-[360px] bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-500" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Merchant Arbitrator Support
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSupportModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400 block">
                  Dedicated Desk SLA: &lt; 15 Minutes
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Fast-track dispute resolution and trade arbitration for verified OTC liquidity partners.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                  support@fundfusion.io
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('support@fundfusion.io')
                    showToast('Support email copied to clipboard!')
                  }}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer border"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>

              <a
                href="mailto:support@fundfusion.io?subject=Merchant%20Desk%20Dispute%20-%20Orbit%20Desk%20LLP"
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Email Arbitrator Desk</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

