import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, CreditCard, Plus, Trash2, Star } from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { ToastNotification } from '@/components/ui/ToastNotification'
import { v1 } from '@/lib/api'
import { cn } from '@/lib/utils'

type MethodType = 'BANK' | 'UPI'

interface PaymentMethod {
  id: string
  type: MethodType
  label: string
  holderName: string
  accountNumber: string | null
  ifsc: string | null
  upiVpa: string | null
  isDefault: boolean
}

interface NewMethod {
  type: MethodType
  label: string
  holderName: string
  accountNumber?: string
  ifsc?: string
  upiVpa?: string
}

const KEY = ['payment-methods'] as const
const PATH = '/wallet/payment-methods'

const inputCls =
  'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white'

/**
 * The customer's INR payout destinations (PRD §6.3). Reference data: no ledger
 * and no money, so none of these calls carries an Idempotency-Key.
 */
export function PaymentMethodsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<MethodType>('BANK')
  const [label, setLabel] = useState('')
  const [holderName, setHolderName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [upiVpa, setUpiVpa] = useState('')
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const say = (text: string, kind: 'success' | 'error' = 'success') => {
    setToast({ text, type: kind })
    setTimeout(() => setToast(null), 3500)
  }

  const list = useQuery({
    queryKey: KEY,
    queryFn: () => v1<PaymentMethod[]>(PATH),
  })

  const done = (msg: string) => () => {
    void qc.invalidateQueries({ queryKey: KEY })
    say(msg)
  }
  const failed = (e: unknown) => say(e instanceof Error ? e.message : 'That failed.', 'error')

  const add = useMutation({
    mutationFn: (body: NewMethod) => v1(PATH, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      done('Payment method added.')()
      setLabel('')
      setAccountNumber('')
      setIfsc('')
      setUpiVpa('')
      setShowForm(false)
    },
    onError: failed,
  })
  const makeDefault = useMutation({
    mutationFn: (id: string) => v1(`${PATH}/${id}/default`, { method: 'PATCH' }),
    onSuccess: done('Default updated.'),
    onError: failed,
  })
  const remove = useMutation({
    mutationFn: (id: string) => v1(`${PATH}/${id}`, { method: 'DELETE' }),
    onSuccess: done('Payment method deleted.'),
    onError: failed,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (type === 'BANK') {
      add.mutate({
        type,
        label: label.trim(),
        holderName: holderName.trim(),
        accountNumber: accountNumber.trim(),
        ifsc: ifsc.trim().toUpperCase(),
      })
    } else {
      add.mutate({
        type,
        label: label.trim(),
        holderName: holderName.trim(),
        upiVpa: upiVpa.trim().toLowerCase(),
      })
    }
  }

  const methods = list.data ?? []

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-4 relative">
      <ToastNotification message={toast?.text ?? null} type={toast?.type} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/customer/profile" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Payment methods</h1>
            <p className="text-[11px] text-slate-500">Bank accounts and UPI IDs where you receive INR</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add method</span>
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="p-4 rounded-3xl bg-white dark:bg-[#111827] border-2 border-emerald-500/40 shadow-xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-xs text-slate-900 dark:text-white">New payment method</span>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-slate-400 hover:text-slate-600">
              Cancel
            </button>
          </div>

          <div className="flex gap-2">
            {(['BANK', 'UPI'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  'flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                  type === t
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
                )}
              >
                {t === 'BANK' ? 'Bank Account' : 'UPI ID'}
              </button>
            ))}
          </div>

          <input
            required
            placeholder={type === 'BANK' ? 'Label (e.g. HDFC Savings)' : 'Label (e.g. GPay)'}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className={inputCls}
          />
          <input
            required
            placeholder="Account holder name"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            className={inputCls}
          />
          {type === 'BANK' ? (
            <>
              <input
                required
                placeholder="Bank account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className={cn(inputCls, 'font-mono')}
              />
              <input
                required
                placeholder="IFSC code (e.g. HDFC0000128)"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value)}
                className={cn(inputCls, 'font-mono uppercase')}
              />
            </>
          ) : (
            <input
              required
              placeholder="UPI ID (e.g. name@okaxis)"
              value={upiVpa}
              onChange={(e) => setUpiVpa(e.target.value)}
              className={cn(inputCls, 'font-mono')}
            />
          )}

          <button
            type="submit"
            disabled={add.isPending}
            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md disabled:opacity-60"
          >
            Save payment method
          </button>
        </form>
      )}

      {list.isError && (
        <p role="alert" className="text-xs text-rose-500">
          {list.error instanceof Error ? list.error.message : 'Could not load payment methods.'}
        </p>
      )}
      {list.isSuccess && methods.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-6">No payment methods yet.</p>
      )}

      <div className="space-y-2.5">
        {methods.map((m) => (
          <div
            key={m.id}
            className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800/80 shadow-2xs flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                {m.type === 'BANK' ? (
                  <Building2 className="w-5 h-5 text-blue-500" />
                ) : (
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white">{m.label}</span>
                  {m.isDefault && (
                    <span className="px-1.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono pt-0.5">
                  {m.type === 'BANK'
                    ? `A/C •••• ${(m.accountNumber ?? '').slice(-4)} · ${m.ifsc ?? ''}`
                    : (m.upiVpa ?? '')}
                </p>
                <p className="text-[10px] text-slate-500">Holder: {m.holderName}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {!m.isDefault && (
                <button
                  type="button"
                  aria-label={`Make ${m.label} default`}
                  onClick={() => makeDefault.mutate(m.id)}
                  className="p-2 rounded-xl text-amber-500 hover:bg-amber-500/10 transition-colors"
                >
                  <Star className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                aria-label={`Delete ${m.label}`}
                onClick={() => remove.mutate(m.id)}
                className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
