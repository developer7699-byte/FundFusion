import { useState, useEffect, useCallback } from 'react'

export interface AppNotification {
  id: string
  title: string
  body: string
  time: string
  type: 'ORDERS' | 'SYSTEM'
  unread: boolean
}

export const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n-1',
    title: 'P2P Escrow Succeeded',
    body: 'Your buy order of 50.00 USDT has been released safely to your wallet vault.',
    time: '12m ago',
    type: 'ORDERS',
    unread: true,
  },
  {
    id: 'n-2',
    title: 'Amazon Voucher Delivered',
    body: 'Your ₹1,000 Amazon Pay gift voucher code is now active and ready to use.',
    time: '1h ago',
    type: 'ORDERS',
    unread: true,
  },
  {
    id: 'n-3',
    title: 'Instant Bill Payment Complete',
    body: 'Jio Mobile Prepaid ₹299 recharge completed successfully via USDT.',
    time: '2h ago',
    type: 'ORDERS',
    unread: true,
  },
  {
    id: 'n-4',
    title: 'Login from New Device',
    body: 'Chrome on Windows 11 was authenticated successfully at 14:02 IST.',
    time: '3h ago',
    type: 'SYSTEM',
    unread: true,
  },
  {
    id: 'n-5',
    title: 'USDT Deposit Confirmed',
    body: '100.00 USDT deposit via TRC20 network has been credited to your vault.',
    time: '5h ago',
    type: 'ORDERS',
    unread: true,
  },
  {
    id: 'n-6',
    title: 'Zero-Fee Weekend Promo',
    body: 'Enjoy zero merchant fees on all UPI QR code transactions this Saturday & Sunday!',
    time: 'Yesterday',
    type: 'SYSTEM',
    unread: false,
  },
  {
    id: 'n-7',
    title: 'Price Alert: USDT hit ₹91.50',
    body: 'USDT/INR exchange rate reached your target alert threshold.',
    time: 'Yesterday',
    type: 'SYSTEM',
    unread: true,
  },
  {
    id: 'n-8',
    title: 'Referral Reward Credited',
    body: 'You earned +12.40 USDT from your tier-1 invited friend trade.',
    time: '2d ago',
    type: 'ORDERS',
    unread: true,
  },
  {
    id: 'n-9',
    title: 'Security: 2FA Authentication Active',
    body: 'Your account security level was upgraded to Maximum.',
    time: '3d ago',
    type: 'SYSTEM',
    unread: true,
  },
  {
    id: 'n-10',
    title: 'Welcome to FundFusion 2.0',
    body: 'Explore instant UPI scan & pay, digital gift cards, and P2P trading.',
    time: '4d ago',
    type: 'SYSTEM',
    unread: true,
  },
]

const STORAGE_KEY = 'fundfusion_notifications_state'
const EVENT_NAME = 'fundfusion_notifs_change'

let memoryNotifs: AppNotification[] | null = null

function getInitialNotifs(): AppNotification[] {
  if (memoryNotifs) return memoryNotifs
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      memoryNotifs = JSON.parse(raw)
      return memoryNotifs!
    }
  } catch {
    // fallback
  }
  memoryNotifs = DEFAULT_NOTIFICATIONS
  return memoryNotifs
}

function saveNotifs(notifs: AppNotification[]) {
  memoryNotifs = notifs
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(notifs))
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: notifs }))
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(getInitialNotifs)

  useEffect(() => {
    const handleChange = () => {
      setNotifications([...getInitialNotifs()])
    }
    window.addEventListener(EVENT_NAME, handleChange)
    return () => window.removeEventListener(EVENT_NAME, handleChange)
  }, [])

  const unreadCount = notifications.filter((n) => n.unread).length

  const markAllAsRead = useCallback(() => {
    const updated = notifications.map((n) => ({ ...n, unread: false }))
    saveNotifs(updated)
    setNotifications(updated)
  }, [notifications])

  const markAsRead = useCallback(
    (id: string) => {
      const updated = notifications.map((n) => (n.id === id ? { ...n, unread: false } : n))
      saveNotifs(updated)
      setNotifications(updated)
    },
    [notifications]
  )

  const toggleRead = useCallback(
    (id: string) => {
      const updated = notifications.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n))
      saveNotifs(updated)
      setNotifications(updated)
    },
    [notifications]
  )

  return {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    toggleRead,
  }
}

