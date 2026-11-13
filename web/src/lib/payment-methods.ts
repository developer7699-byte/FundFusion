import { useState, useEffect, useCallback } from 'react'

export interface PaymentMethod {
  id: string
  type: 'UPI' | 'BANK'
  label: string
  details: string
  isDefault: boolean
  upiId?: string
  accountNumber?: string
  ifsc?: string
}

const STORAGE_KEY = 'fundfusion_saved_payment_methods'
const EVENT_NAME = 'fundfusion_payments_change'

const DEFAULT_METHODS: PaymentMethod[] = [
  {
    id: 'pay-1',
    type: 'UPI',
    label: 'Google Pay / PhonePe',
    details: 'user@okicici',
    isDefault: true,
    upiId: 'user@okicici',
  },
  {
    id: 'pay-2',
    type: 'BANK',
    label: 'HDFC Bank Ltd',
    details: 'A/C ****4892 (IFSC: HDFC0001234)',
    isDefault: false,
    accountNumber: 'XXXX4892',
    ifsc: 'HDFC0001234',
  },
]

function getInitialMethods(): PaymentMethod[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return DEFAULT_METHODS
}

function persistMethods(methods: PaymentMethod[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(methods))
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: methods }))
}

export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(getInitialMethods)

  useEffect(() => {
    const handleChange = () => {
      setPaymentMethods(getInitialMethods())
    }
    window.addEventListener(EVENT_NAME, handleChange)
    window.addEventListener('storage', handleChange)
    return () => {
      window.removeEventListener(EVENT_NAME, handleChange)
      window.removeEventListener('storage', handleChange)
    }
  }, [])

  const addPaymentMethod = useCallback(
    (item: Omit<PaymentMethod, 'id' | 'isDefault'>) => {
      const current = getInitialMethods()
      const newMethod: PaymentMethod = {
        ...item,
        id: `pay-${Date.now()}`,
        isDefault: current.length === 0,
      }
      const updated = [...current, newMethod]
      persistMethods(updated)
      setPaymentMethods(updated)
      return newMethod
    },
    []
  )

  const deletePaymentMethod = useCallback(
    (id: string) => {
      const current = getInitialMethods()
      const updated = current.filter((m) => m.id !== id)
      // If deleted was default, make first remaining default
      if (updated.length > 0 && !updated.some((m) => m.isDefault)) {
        updated[0].isDefault = true
      }
      persistMethods(updated)
      setPaymentMethods(updated)
    },
    []
  )

  const setDefaultPaymentMethod = useCallback(
    (id: string) => {
      const current = getInitialMethods()
      const updated = current.map((m) => ({
        ...m,
        isDefault: m.id === id,
      }))
      persistMethods(updated)
      setPaymentMethods(updated)
    },
    []
  )

  return {
    paymentMethods,
    addPaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod,
  }
}

