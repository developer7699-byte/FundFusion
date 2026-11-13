import { useState, useEffect, useCallback } from 'react'

export interface MerchantOrder {
  id: string
  buyerName: string
  buyerRating: string
  buyerTrades: number
  usdtAmount: number
  inrAmount: number
  rate: number
  paymentMethod: string
  paymentType: 'UPI' | 'IMPS' | 'RTGS' | 'BANK'
  status: 'AVAILABLE' | 'AWAITING_PAYMENT' | 'UTR_SUBMITTED' | 'COMPLETED' | 'DISPUTED'
  createdAt: string
  expiresInMinutes: number
  utr?: string
  disputeReason?: string
  commissionEarned?: number
}

export interface SettlementAccount {
  id: string
  type: 'BANK' | 'UPI'
  label: string
  details: string
  holderName: string
  accountNumber?: string
  ifsc?: string
  upiVpa?: string
  isDefault: boolean
}

export interface MerchantLedgerItem {
  id: string
  title: string
  type: 'CREDIT' | 'DEBIT' | 'ESCROW_LOCK' | 'ESCROW_RELEASE' | 'COMMISSION'
  amount: string
  secondaryAmount?: string
  timestamp: string
  status: 'COMPLETED' | 'PENDING'
}

export interface MerchantNotice {
  id: string
  title: string
  desc: string
  time: string
  read: boolean
  type: 'ORDER' | 'UTR' | 'COMMISSION' | 'SYSTEM'
  link?: string
}

export interface MerchantState {
  availableOrders: MerchantOrder[]
  myOrders: MerchantOrder[]
  availableUsdt: number
  lockedUsdt: number
  inrReserve: number
  deskName: string
  isOnline: boolean
  minLimit: number
  maxLimit: number
  rating: string
  totalTrades: number
  completionRate: number
  commissionRate: number // e.g. 0.015 = 1.5%
  accounts: SettlementAccount[]
  ledger: MerchantLedgerItem[]
  notices: MerchantNotice[]
  earnings: {
    todayVolumeInr: number
    todayCommissionUsdt: number
    totalVolumeInr: number
    totalCommissionUsdt: number
  }
}

const STORAGE_KEY = 'fundfusion_merchant_state_v1'
const EVENT_KEY = 'fundfusion_merchant_sync'

const INITIAL_STATE: MerchantState = {
  deskName: 'Orbit Desk LLP',
  isOnline: true,
  minLimit: 500,
  maxLimit: 100000,
  rating: '99.8%',
  totalTrades: 418,
  completionRate: 99.4,
  commissionRate: 0.015, // 1.5%
  availableUsdt: 5420.0,
  lockedUsdt: 350.0,
  inrReserve: 145000.0,
  earnings: {
    todayVolumeInr: 142500,
    todayCommissionUsdt: 23.36,
    totalVolumeInr: 892400,
    totalCommissionUsdt: 146.3,
  },
  accounts: [
    {
      id: 'acc-1',
      type: 'BANK',
      label: 'HDFC Current Account',
      details: 'A/C: •••• 9102 · HDFC0000128',
      holderName: 'Orbit Desk LLP',
      accountNumber: '50200049289102',
      ifsc: 'HDFC0000128',
      isDefault: true,
    },
    {
      id: 'acc-2',
      type: 'UPI',
      label: 'Desk Instant UPI',
      details: 'orbitdesk@okaxis',
      holderName: 'Orbit Desk LLP',
      upiVpa: 'orbitdesk@okaxis',
      isDefault: false,
    },
    {
      id: 'acc-3',
      type: 'BANK',
      label: 'ICICI Escrow Backup',
      details: 'A/C: •••• 4421 · ICIC0001048',
      holderName: 'Orbit Desk LLP',
      accountNumber: '104805004421',
      ifsc: 'ICIC0001048',
      isDefault: false,
    },
  ],
  // Prepopulated active and completed orders for realistic P2P workflow
  myOrders: [
    {
      id: 'FF-8921',
      buyerName: '@aarav_crypto',
      buyerRating: '99.8%',
      buyerTrades: 142,
      usdtAmount: 100.0,
      inrAmount: 9150.0,
      rate: 91.5,
      paymentMethod: 'UPI (Google Pay)',
      paymentType: 'UPI',
      status: 'UTR_SUBMITTED', // BUYER SENT INR & SUBMITTED UTR - READY FOR MERCHANT TO RELEASE!
      createdAt: '6 mins ago',
      expiresInMinutes: 9,
      utr: '429104829104',
      commissionEarned: 1.5,
    },
    {
      id: 'FF-8922',
      buyerName: '@priya_trader',
      buyerRating: '100%',
      buyerTrades: 89,
      usdtAmount: 250.0,
      inrAmount: 22875.0,
      rate: 91.5,
      paymentMethod: 'IMPS (HDFC Bank)',
      paymentType: 'IMPS',
      status: 'AWAITING_PAYMENT',
      createdAt: '11 mins ago',
      expiresInMinutes: 4,
      commissionEarned: 3.75,
    },
    {
      id: 'FF-8920',
      buyerName: '@rohit_mumbai',
      buyerRating: '99.5%',
      buyerTrades: 320,
      usdtAmount: 500.0,
      inrAmount: 45750.0,
      rate: 91.5,
      paymentMethod: 'IMPS (ICICI Bank)',
      paymentType: 'IMPS',
      status: 'COMPLETED',
      createdAt: '45 mins ago',
      expiresInMinutes: 0,
      utr: '429100871249',
      commissionEarned: 7.5,
    },
    {
      id: 'FF-8919',
      buyerName: '@vikram_delhi',
      buyerRating: '99.1%',
      buyerTrades: 64,
      usdtAmount: 75.0,
      inrAmount: 6862.5,
      rate: 91.5,
      paymentMethod: 'PhonePe UPI',
      paymentType: 'UPI',
      status: 'COMPLETED',
      createdAt: '2 hrs ago',
      expiresInMinutes: 0,
      utr: '429099418291',
      commissionEarned: 1.12,
    },
  ],
  // Available order matching book ready for merchant to pick up
  availableOrders: [
    {
      id: 'FF-8925',
      buyerName: '@karan_singh',
      buyerRating: '99.4%',
      buyerTrades: 58,
      usdtAmount: 150.0,
      inrAmount: 13725.0,
      rate: 91.5,
      paymentMethod: 'Google Pay UPI',
      paymentType: 'UPI',
      status: 'AVAILABLE',
      createdAt: 'Just now',
      expiresInMinutes: 15,
      commissionEarned: 2.25,
    },
    {
      id: 'FF-8926',
      buyerName: '@neha_p2p',
      buyerRating: '100%',
      buyerTrades: 210,
      usdtAmount: 300.0,
      inrAmount: 27450.0,
      rate: 91.5,
      paymentMethod: 'IMPS Bank Transfer',
      paymentType: 'IMPS',
      status: 'AVAILABLE',
      createdAt: '2 mins ago',
      expiresInMinutes: 15,
      commissionEarned: 4.5,
    },
    {
      id: 'FF-8927',
      buyerName: '@amit_verma',
      buyerRating: '98.9%',
      buyerTrades: 41,
      usdtAmount: 80.0,
      inrAmount: 7320.0,
      rate: 91.5,
      paymentMethod: 'Paytm UPI',
      paymentType: 'UPI',
      status: 'AVAILABLE',
      createdAt: '4 mins ago',
      expiresInMinutes: 15,
      commissionEarned: 1.2,
    },
    {
      id: 'FF-8928',
      buyerName: '@suresh_otc',
      buyerRating: '100%',
      buyerTrades: 512,
      usdtAmount: 1000.0,
      inrAmount: 91500.0,
      rate: 91.5,
      paymentMethod: 'RTGS / Priority Bank',
      paymentType: 'RTGS',
      status: 'AVAILABLE',
      createdAt: '5 mins ago',
      expiresInMinutes: 15,
      commissionEarned: 15.0,
    },
    {
      id: 'FF-8929',
      buyerName: '@ananya_crypto',
      buyerRating: '99.7%',
      buyerTrades: 174,
      usdtAmount: 50.0,
      inrAmount: 4575.0,
      rate: 91.5,
      paymentMethod: 'PhonePe UPI',
      paymentType: 'UPI',
      status: 'AVAILABLE',
      createdAt: '7 mins ago',
      expiresInMinutes: 15,
      commissionEarned: 0.75,
    },
  ],
  ledger: [
    {
      id: 'led-1',
      title: 'Commission Credited · Order #FF-8920',
      type: 'COMMISSION',
      amount: '+7.50 USDT',
      secondaryAmount: '₹686.25',
      timestamp: '45 mins ago',
      status: 'COMPLETED',
    },
    {
      id: 'led-2',
      title: 'Escrow Locked · Order #FF-8921',
      type: 'ESCROW_LOCK',
      amount: '-100.00 USDT',
      secondaryAmount: 'Locked in vault',
      timestamp: '6 mins ago',
      status: 'COMPLETED',
    },
    {
      id: 'led-3',
      title: 'Liquidity Top-up (TRC20)',
      type: 'CREDIT',
      amount: '+2,000.00 USDT',
      secondaryAmount: 'Direct deposit',
      timestamp: 'Yesterday',
      status: 'COMPLETED',
    },
    {
      id: 'led-4',
      title: 'Bank Settlement Payout',
      type: 'DEBIT',
      amount: '-₹50,000.00',
      secondaryAmount: 'HDFC Bank ••••9102',
      timestamp: 'Yesterday',
      status: 'COMPLETED',
    },
  ],
  notices: [
    {
      id: 'n1',
      title: 'Action Needed: Bank UTR Submitted',
      desc: 'Buyer @aarav_crypto submitted UTR: 429104829104 for ₹9,150. Please check your bank and release USDT.',
      time: '6 mins ago',
      read: false,
      type: 'UTR',
      link: '/merchant/orders/FF-8921',
    },
    {
      id: 'n2',
      title: 'Commission Credited (+7.50 USDT)',
      desc: 'Order #FF-8920 successfully settled. 1.5% desk volume rebate has been added to your available vault balance.',
      time: '45 mins ago',
      read: false,
      type: 'COMMISSION',
      link: '/merchant/earnings',
    },
    {
      id: 'n3',
      title: 'Order Matched: 250 USDT',
      desc: 'Order #FF-8922 accepted for buyer @priya_trader. 250 USDT locked safely in multi-sig escrow.',
      time: '1 hr ago',
      read: true,
      type: 'ORDER',
      link: '/merchant/orders/FF-8922',
    },
    {
      id: 'n4',
      title: 'Zero Bank Payout Fees Active',
      desc: 'All IMPS & RTGS settlement payouts to your registered bank account carry 0% network fees today.',
      time: 'Yesterday',
      read: true,
      type: 'SYSTEM',
    },
  ],
}

function loadState(): MerchantState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...INITIAL_STATE,
        ...parsed,
        notices: parsed.notices || INITIAL_STATE.notices,
      }
    }
  } catch {}
  return INITIAL_STATE
}

function saveState(state: MerchantState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    window.dispatchEvent(new Event(EVENT_KEY))
  } catch {}
}

export function useMerchantStore() {
  const [state, setState] = useState<MerchantState>(loadState)

  useEffect(() => {
    const handleSync = () => setState(loadState())
    window.addEventListener(EVENT_KEY, handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener(EVENT_KEY, handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  // 1. Accept Order from Available Book
  const acceptOrder = useCallback(
    (orderId: string): boolean => {
      const current = loadState()
      const target = current.availableOrders.find((o) => o.id === orderId)
      if (!target) return false

      if (current.availableUsdt < target.usdtAmount) {
        return false // Insufficient liquidity
      }

      // Deduct from available, add to locked in escrow
      const nextAvailable = current.availableUsdt - target.usdtAmount
      const nextLocked = current.lockedUsdt + target.usdtAmount

      const acceptedOrder: MerchantOrder = {
        ...target,
        status: 'AWAITING_PAYMENT',
        createdAt: 'Just now',
        expiresInMinutes: 15,
      }

      const updatedAvailable = current.availableOrders.filter((o) => o.id !== orderId)
      const updatedMyOrders = [acceptedOrder, ...current.myOrders]

      const newLedgerItem: MerchantLedgerItem = {
        id: `led-${Date.now()}`,
        title: `Escrow Locked · Order #${orderId}`,
        type: 'ESCROW_LOCK',
        amount: `-${target.usdtAmount.toFixed(2)} USDT`,
        secondaryAmount: `₹${target.inrAmount.toLocaleString('en-IN')}`,
        timestamp: 'Just now',
        status: 'COMPLETED',
      }

      const nextState: MerchantState = {
        ...current,
        availableUsdt: nextAvailable,
        lockedUsdt: nextLocked,
        availableOrders: updatedAvailable,
        myOrders: updatedMyOrders,
        ledger: [newLedgerItem, ...current.ledger],
      }

      saveState(nextState)
      setState(nextState)
      return true
    },
    []
  )

  // 2. Submit / Update UTR for an order
  const submitUtr = useCallback((orderId: string, utr: string) => {
    const current = loadState()
    const updatedMyOrders = current.myOrders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          utr,
          status: 'UTR_SUBMITTED' as const,
        }
      }
      return o
    })

    const nextState: MerchantState = {
      ...current,
      myOrders: updatedMyOrders,
    }
    saveState(nextState)
    setState(nextState)
  }, [])

  // 3. Confirm INR Receipt & Release USDT from Escrow
  const releaseEscrow = useCallback((orderId: string): boolean => {
    const current = loadState()
    const target = current.myOrders.find((o) => o.id === orderId)
    if (!target) return false

    // Release locked USDT
    const nextLocked = Math.max(0, current.lockedUsdt - target.usdtAmount)
    const commission = (target.usdtAmount * current.commissionRate)

    // Commission gets credited to available USDT balance
    const nextAvailable = current.availableUsdt + commission

    const updatedMyOrders = current.myOrders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'COMPLETED' as const,
          commissionEarned: commission,
        }
      }
      return o
    })

    const newLedgerItem: MerchantLedgerItem = {
      id: `led-${Date.now()}`,
      title: `Order Settled · #${orderId}`,
      type: 'ESCROW_RELEASE',
      amount: `+${commission.toFixed(2)} USDT Fee`,
      secondaryAmount: `₹${target.inrAmount.toLocaleString('en-IN')} Received`,
      timestamp: 'Just now',
      status: 'COMPLETED',
    }

    const nextState: MerchantState = {
      ...current,
      availableUsdt: nextAvailable,
      lockedUsdt: nextLocked,
      myOrders: updatedMyOrders,
      totalTrades: current.totalTrades + 1,
      earnings: {
        todayVolumeInr: current.earnings.todayVolumeInr + target.inrAmount,
        todayCommissionUsdt: current.earnings.todayCommissionUsdt + commission,
        totalVolumeInr: current.earnings.totalVolumeInr + target.inrAmount,
        totalCommissionUsdt: current.earnings.totalCommissionUsdt + commission,
      },
      ledger: [newLedgerItem, ...current.ledger],
    }

    saveState(nextState)
    setState(nextState)
    return true
  }, [])

  // 4. Raise Dispute on Order
  const disputeOrder = useCallback((orderId: string, reason: string) => {
    const current = loadState()
    const updatedMyOrders = current.myOrders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'DISPUTED' as const,
          disputeReason: reason,
        }
      }
      return o
    })

    const nextState: MerchantState = {
      ...current,
      myOrders: updatedMyOrders,
    }
    saveState(nextState)
    setState(nextState)
  }, [])

  // 5. Deposit USDT Liquidity Vault
  const depositLiquidity = useCallback((amount: number, network = 'TRC20') => {
    const current = loadState()
    const nextAvailable = current.availableUsdt + amount

    const newLedgerItem: MerchantLedgerItem = {
      id: `led-${Date.now()}`,
      title: `Liquidity Vault Deposit (${network})`,
      type: 'CREDIT',
      amount: `+${amount.toFixed(2)} USDT`,
      secondaryAmount: 'Direct on-chain credit',
      timestamp: 'Just now',
      status: 'COMPLETED',
    }

    const nextState: MerchantState = {
      ...current,
      availableUsdt: nextAvailable,
      ledger: [newLedgerItem, ...current.ledger],
    }
    saveState(nextState)
    setState(nextState)
  }, [])

  // 6. Withdraw USDT Liquidity
  const withdrawLiquidity = useCallback(
    (amount: number, address: string, network = 'TRC20'): boolean => {
      const current = loadState()
      if (current.availableUsdt < amount) return false

      const nextAvailable = current.availableUsdt - amount

      const newLedgerItem: MerchantLedgerItem = {
        id: `led-${Date.now()}`,
        title: `USDT Withdrawal (${network})`,
        type: 'DEBIT',
        amount: `-${amount.toFixed(2)} USDT`,
        secondaryAmount: `Sent to ${address.slice(0, 6)}...${address.slice(-4)}`,
        timestamp: 'Just now',
        status: 'COMPLETED',
      }

      const nextState: MerchantState = {
        ...current,
        availableUsdt: nextAvailable,
        ledger: [newLedgerItem, ...current.ledger],
      }
      saveState(nextState)
      setState(nextState)
      return true
    },
    []
  )

  // 7. Settle INR to Bank Account
  const settleToBank = useCallback(
    (amountInr: number, accountLabel: string): boolean => {
      const current = loadState()
      const usdtEquivalent = amountInr / 91.5
      if (current.availableUsdt < usdtEquivalent) return false

      const nextAvailable = current.availableUsdt - usdtEquivalent

      const newLedgerItem: MerchantLedgerItem = {
        id: `led-${Date.now()}`,
        title: `Settlement to ${accountLabel}`,
        type: 'DEBIT',
        amount: `-₹${amountInr.toLocaleString('en-IN')}`,
        secondaryAmount: `-${usdtEquivalent.toFixed(2)} USDT`,
        timestamp: 'Just now',
        status: 'COMPLETED',
      }

      const nextState: MerchantState = {
        ...current,
        availableUsdt: nextAvailable,
        ledger: [newLedgerItem, ...current.ledger],
      }
      saveState(nextState)
      setState(nextState)
      return true
    },
    []
  )

  // 8. Toggle Desk Status (Online / Offline)
  const toggleDeskOnline = useCallback(() => {
    const current = loadState()
    const nextState: MerchantState = {
      ...current,
      isOnline: !current.isOnline,
    }
    saveState(nextState)
    setState(nextState)
  }, [])

  // 9. Update Ticket Limits
  const updateLimits = useCallback((minLimit: number, maxLimit: number) => {
    const current = loadState()
    const nextState: MerchantState = {
      ...current,
      minLimit,
      maxLimit,
    }
    saveState(nextState)
    setState(nextState)
  }, [])

  // 10. Add Settlement Account
  const addAccount = useCallback((account: Omit<SettlementAccount, 'id'>) => {
    const current = loadState()
    const newAcc: SettlementAccount = {
      ...account,
      id: `acc-${Date.now()}`,
    }
    const nextState: MerchantState = {
      ...current,
      accounts: [...current.accounts, newAcc],
    }
    saveState(nextState)
    setState(nextState)
  }, [])

  // 11. Delete Settlement Account
  const deleteAccount = useCallback((id: string) => {
    const current = loadState()
    const nextState: MerchantState = {
      ...current,
      accounts: current.accounts.filter((a) => a.id !== id),
    }
    saveState(nextState)
    setState(nextState)
  }, [])

  // 12. Mark All Notices As Read
  const markAllNoticesRead = useCallback(() => {
    const current = loadState()
    const list = current.notices || INITIAL_STATE.notices
    const nextState: MerchantState = {
      ...current,
      notices: list.map((n) => ({ ...n, read: true })),
    }
    saveState(nextState)
    setState(nextState)
  }, [])

  // 13. Mark Single Notice Read
  const markNoticeRead = useCallback((id: string) => {
    const current = loadState()
    const list = current.notices || INITIAL_STATE.notices
    const nextState: MerchantState = {
      ...current,
      notices: list.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }
    saveState(nextState)
    setState(nextState)
  }, [])

  const unreadNoticesCount = (state.notices || INITIAL_STATE.notices).filter((n) => !n.read).length

  return {
    ...state,
    unreadNoticesCount,
    markAllNoticesRead,
    markNoticeRead,
    acceptOrder,
    submitUtr,
    releaseEscrow,
    disputeOrder,
    depositLiquidity,
    withdrawLiquidity,
    settleToBank,
    toggleDeskOnline,
    updateLimits,
    addAccount,
    deleteAccount,
  }
}

