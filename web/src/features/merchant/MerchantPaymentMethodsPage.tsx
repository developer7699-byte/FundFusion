import { useState } from 'react'
import {
  Building2,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Check,
} from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { useMerchantStore, type SettlementAccount } from '@/lib/merchant-store'
import { cn } from '@/lib/utils'
import { ToastNotification } from '@/components/ui/ToastNotification'

export function MerchantPaymentMethods() {
  const { accounts, addAccount, deleteAccount } = useMerchantStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [type, setType] = useState<'BANK' | 'UPI'>('BANK')
  const [label, setLabel] = useState('')
  const [holderName, setHolderName] = useState('Orbit Desk LLP')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [upiVpa, setUpiVpa] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault()
    if (type === 'BANK') {
      if (!label || !accountNumber || !ifsc) return
      addAccount({
        type: 'BANK',
        label,
        details: `A/C: •••• ${accountNumber.slice(-4)} · ${ifsc.toUpperCase()}`,
        holderName,
        accountNumber,
        ifsc: ifsc.toUpperCase(),
        isDefault: accounts.length === 0,
      })
      showToast(`${label} added to settlement accounts!`)
    } else {
      if (!label || !upiVpa) return
      addAccount({
        type: 'UPI',
        label,
        details: upiVpa.toLowerCase(),
        holderName,
        upiVpa: upiVpa.toLowerCase(),
        isDefault: accounts.length === 0,
      })
      showToast(`${label} UPI ID added!`)
    }

    setLabel('')
    setAccountNumber('')
    setIfsc('')
    setUpiVpa('')
    setShowAddForm(false)
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4 relative">
      {/* Toast Notification */}
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/merchant/dashboard" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Settlement Accounts
            </h1>
            <p className="text-[11px] text-slate-500">Bank accounts & UPI IDs for customer INR payments</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-transform active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Account</span>
        </button>
      </div>

      {/* Add Account Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddAccount}
          className="p-4 rounded-3xl bg-white dark:bg-[#111827] border-2 border-emerald-500/40 shadow-xl space-y-3 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-xs text-slate-900 dark:text-white">Add Receiving Method</span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('BANK')}
              className={cn(
                'flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                type === 'BANK'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              )}
            >
              Bank Account
            </button>
            <button
              type="button"
              onClick={() => setType('UPI')}
              className={cn(
                'flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                type === 'UPI'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              )}
            >
              UPI VPA
            </button>
          </div>

          <input
            type="text"
            required
            placeholder={type === 'BANK' ? 'Label (e.g. HDFC Main Current)' : 'Label (e.g. Desk GPay UPI)'}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          />

          <input
            type="text"
            required
            placeholder="Account Holder Name"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          />

          {type === 'BANK' ? (
            <>
              <input
                type="text"
                required
                placeholder="Bank Account Number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white"
              />
              <input
                type="text"
                required
                placeholder="IFSC Code (e.g. HDFC0000128)"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono uppercase text-slate-900 dark:text-white"
              />
            </>
          ) : (
            <input
              type="text"
              required
              placeholder="UPI ID (e.g. orbitdesk@okaxis)"
              value={upiVpa}
              onChange={(e) => setUpiVpa(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white"
            />
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md"
          >
            Save Settlement Method
          </button>
        </form>
      )}

      {/* Accounts List */}
      <div className="space-y-2.5">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800/80 shadow-2xs flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                {acc.type === 'BANK' ? <Building2 className="w-5 h-5 text-blue-500" /> : <CreditCard className="w-5 h-5 text-emerald-500" />}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white">{acc.label}</span>
                  {acc.isDefault && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono pt-0.5">{acc.details}</p>
                <p className="text-[10px] text-slate-500">Holder: {acc.holderName}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                deleteAccount(acc.id)
                showToast(`${acc.label} deleted.`)
              }}
              className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

