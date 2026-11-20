import { useState, useEffect, useCallback } from 'react'

export interface AdminDispute {
  id: string
  orderId: string
  buyer: string
  merchant: string
  usdtAmount: number
  inrAmount: number
  rate: number
  reason: string
  utr?: string
  paymentMethod: string
  proofFile?: string
  createdAt: string
  status: 'PENDING' | 'RESOLVED_RELEASE' | 'RESOLVED_REFUND'
  resolutionNote?: string
  resolvedAt?: string
  chatSnippet?: string
}

export interface AdminUser {
  id: string
  displayName: string
  email: string
  roles: string[]
  status: 'ACTIVE' | 'SUSPENDED'
  kycStatus: 'VERIFIED' | 'PENDING' | 'UNVERIFIED'
  walletBalanceUsdt: number
  totalTrades: number
  totalVolumeInr: number
  joinedDate: string
}

export interface AdminMerchant {
  id: string
  deskName: string
  ownerEmail: string
  rating: number
  totalOrders: number
  completionRate: number
  status: 'ACTIVE' | 'PAUSED' | 'PENDING'
  commissionRate: number // e.g. 0.015 for 1.5%
  vaultBalanceUsdt: number
  lockedEscrowUsdt: number
  todayVolumeInr: number
  settlementBank: string
  settlementAccount: string
  ifsc: string
}

export interface AdminOrder {
  id: string
  buyerName: string
  merchantName: string
  usdtAmount: number
  inrAmount: number
  rate: number
  paymentMethod: string
  utr?: string
  status: 'ESCROW_LOCKED' | 'UTR_SUBMITTED' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED'
  createdAt: string
  completedAt?: string
}

export interface AdminSettlement {
  id: string
  merchantName: string
  bankName: string
  accountNumber: string
  ifsc: string
  amountInr: number
  usdtDeducted: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  utr?: string
  requestedAt: string
  processedAt?: string
}

export interface AdminSupportTicket {
  id: string
  user: string
  email: string
  subject: string
  category: 'P2P Escrow' | 'Bank Transfer' | 'Account' | 'Technical'
  priority: 'URGENT' | 'HIGH' | 'NORMAL'
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
  createdAt: string
  lastMessage: string
}

export interface AdminAuditLog {
  id: string
  timestamp: string
  actor: string
  action: string
  entity: string
  details: string
  ipAddress: string
}

export interface AdminSettings {
  baseUsdtRate: number
  platformFeePercent: number
  merchantBaseTier: number
  minTradeLimit: number
  maxTradeLimit: number
  isMaintenanceMode: boolean
  isEscrowFrozen: boolean
}

// ---------------------------------------------------------------------------
// GIFT CARD INVENTORY & 3-TIER SMART ROUTER SYSTEM
// ---------------------------------------------------------------------------
export interface GiftCardInventoryItem {
  id: string
  brand: string // 'Amazon Pay', 'Flipkart', 'Google Play', 'Swiggy', 'Apple Store', 'Steam', 'Zomato', 'BookMyShow'
  denominationInr: number
  code: string
  pin: string
  status: 'AVAILABLE' | 'DELIVERED' | 'RESERVED'
  expiryDate: string
  addedAt: string
  deliveredToOrder?: string
  deliveredAt?: string
}

export interface GiftCardApiRouterConfig {
  providerName: string // e.g. 'Pine Labs / Qwikcilver B2B Router'
  endpoint: string
  apiKey: string
  isAutoRouterActive: boolean
  isApiStockAvailable: boolean // Toggle to simulate API out-of-stock and test Tier 3 fallback!
  timeoutMs: number
  autoRetryCount: number
}

export interface RouteTraceStep {
  stage: 'LOCAL_INVENTORY' | 'API_ROUTER' | 'MERCHANT_DESK'
  status: 'HIT' | 'MISS' | 'DISPATCHED' | 'FULFILLED'
  note: string
  timestamp: string
}

export interface GiftCardOrderRouteLog {
  id: string
  brand: string
  denominationInr: number
  usdtAmount: number
  buyerName: string
  orderedAt: string
  fulfillmentTier: 'TIER_1_LOCAL_INVENTORY' | 'TIER_2_ROUTER_API' | 'TIER_3_MERCHANT_DESK'
  status: 'DELIVERED' | 'FORWARDED_TO_MERCHANT' | 'MERCHANT_COMPLETED' | 'CANCELLED'
  voucherCode?: string
  voucherPin?: string
  merchantAssigned?: string
  routeTrace: RouteTraceStep[]
}

export interface AdminState {
  disputes: AdminDispute[]
  users: AdminUser[]
  merchants: AdminMerchant[]
  orders: AdminOrder[]
  settlements: AdminSettlement[]
  supportTickets: AdminSupportTicket[]
  auditLogs: AdminAuditLog[]
  settings: AdminSettings
  giftCardInventory: GiftCardInventoryItem[]
  giftCardApiRouter: GiftCardApiRouterConfig
  giftCardRouteLogs: GiftCardOrderRouteLog[]
}

const STORAGE_KEY = 'fundfusion_admin_state_v2'
const EVENT_KEY = 'fundfusion_admin_sync_v2'

const INITIAL_STATE: AdminState = {
  settings: {
    baseUsdtRate: 91.5,
    platformFeePercent: 0.5,
    merchantBaseTier: 1.5,
    minTradeLimit: 500,
    maxTradeLimit: 500000,
    isMaintenanceMode: false,
    isEscrowFrozen: false,
  },
  giftCardApiRouter: {
    providerName: 'Pine Labs / Qwikcilver Enterprise Router',
    endpoint: 'https://api.qwikcilver.com/v2/cards/instant-issue',
    apiKey: 'live_qwik_992109841289_prod',
    isAutoRouterActive: true,
    isApiStockAvailable: true,
    timeoutMs: 2500,
    autoRetryCount: 2,
  },
  giftCardInventory: [
    {
      id: 'INV-101',
      brand: 'Amazon Pay',
      denominationInr: 1000,
      code: 'AMZN-9921-4820-KMS2',
      pin: '8829',
      status: 'AVAILABLE',
      expiryDate: '31 Dec 2027',
      addedAt: '10 Nov 2026',
    },
    {
      id: 'INV-102',
      brand: 'Amazon Pay',
      denominationInr: 500,
      code: 'AMZN-4412-9901-LK89',
      pin: '1049',
      status: 'AVAILABLE',
      expiryDate: '31 Dec 2027',
      addedAt: '11 Nov 2026',
    },
    {
      id: 'INV-103',
      brand: 'Flipkart',
      denominationInr: 1000,
      code: 'FKRT-7739-1029-MM31',
      pin: '3910',
      status: 'AVAILABLE',
      expiryDate: '15 Jan 2028',
      addedAt: '12 Nov 2026',
    },
    {
      id: 'INV-104',
      brand: 'Google Play',
      denominationInr: 500,
      code: 'GPLY-2910-4820-PP90',
      pin: '0019',
      status: 'AVAILABLE',
      expiryDate: '30 Jun 2028',
      addedAt: '12 Nov 2026',
    },
    {
      id: 'INV-105',
      brand: 'Swiggy',
      denominationInr: 250,
      code: 'SWIG-1102-4910-SS22',
      pin: '7721',
      status: 'AVAILABLE',
      expiryDate: '31 Mar 2027',
      addedAt: '13 Nov 2026',
    },
    {
      id: 'INV-106',
      brand: 'Steam Wallet',
      denominationInr: 1000,
      code: 'STEM-9920-1120-VV09',
      pin: '5510',
      status: 'AVAILABLE',
      expiryDate: '31 Dec 2028',
      addedAt: '13 Nov 2026',
    },
    {
      id: 'INV-100',
      brand: 'Apple Store',
      denominationInr: 2000,
      code: 'APPL-8839-2019-AA11',
      pin: '9021',
      status: 'DELIVERED',
      expiryDate: '31 Dec 2027',
      addedAt: '05 Nov 2026',
      deliveredToOrder: 'GC-7790',
      deliveredAt: '08 Nov 2026',
    },
  ],
  giftCardRouteLogs: [
    {
      id: 'GC-7801',
      brand: 'Apple Store',
      denominationInr: 5000,
      usdtAmount: 54.64,
      buyerName: '@aarav_crypto',
      orderedAt: '12 mins ago',
      fulfillmentTier: 'TIER_3_MERCHANT_DESK',
      status: 'FORWARDED_TO_MERCHANT',
      merchantAssigned: 'Orbit Desk LLP',
      routeTrace: [
        {
          stage: 'LOCAL_INVENTORY',
          status: 'MISS',
          note: 'Local stock 0 units for Apple Store ₹5,000.',
          timestamp: '12m ago',
        },
        {
          stage: 'API_ROUTER',
          status: 'MISS',
          note: 'Pine Labs API returned: 404 Out of Stock for ₹5,000 face value.',
          timestamp: '12m ago',
        },
        {
          stage: 'MERCHANT_DESK',
          status: 'DISPATCHED',
          note: 'Broadcasted to OTC Merchant Desks. Picked up by Orbit Desk LLP for manual procurement.',
          timestamp: '11m ago',
        },
      ],
    },
    {
      id: 'GC-7802',
      brand: 'Amazon Pay',
      denominationInr: 1000,
      usdtAmount: 10.92,
      buyerName: '@priya_trader',
      orderedAt: '45 mins ago',
      fulfillmentTier: 'TIER_1_LOCAL_INVENTORY',
      status: 'DELIVERED',
      voucherCode: 'AMZN-9921-4820-KMS2',
      voucherPin: '8829',
      routeTrace: [
        {
          stage: 'LOCAL_INVENTORY',
          status: 'HIT',
          note: 'Matched in local inventory vault (Card #INV-101). Delivered instantly in 120ms.',
          timestamp: '45m ago',
        },
      ],
    },
    {
      id: 'GC-7803',
      brand: 'Zomato Pro',
      denominationInr: 500,
      usdtAmount: 5.46,
      buyerName: '@vikram_delhi',
      orderedAt: '2 hrs ago',
      fulfillmentTier: 'TIER_2_ROUTER_API',
      status: 'DELIVERED',
      voucherCode: 'API-ZOM-99210984',
      voucherPin: '1192',
      routeTrace: [
        {
          stage: 'LOCAL_INVENTORY',
          status: 'MISS',
          note: 'Local stock empty for Zomato Pro ₹500.',
          timestamp: '2h ago',
        },
        {
          stage: 'API_ROUTER',
          status: 'HIT',
          note: 'Pine Labs Qwikcilver API generated voucher code in 780ms.',
          timestamp: '2h ago',
        },
      ],
    },
  ],
  disputes: [
    {
      id: 'DISP-101',
      orderId: 'FF-8921',
      buyer: '@aarav_crypto',
      merchant: 'Orbit Desk LLP',
      usdtAmount: 100.0,
      inrAmount: 9150.0,
      rate: 91.5,
      reason: 'Buyer claims UPI money transferred via Google Pay. Merchant claims funds not reflected in HDFC Bank account statement.',
      utr: '429104829104',
      paymentMethod: 'UPI (Google Pay)',
      proofFile: 'gpay_receipt_4291.pdf',
      createdAt: '18 mins ago',
      status: 'PENDING',
      chatSnippet: 'Buyer: Transfer screenshot attached. Merchant: Bank app shows no incoming credits for this reference yet.',
    },
    {
      id: 'DISP-102',
      orderId: 'FF-8919',
      buyer: '@rohit_sharma',
      merchant: 'Apex OTC Liquidity',
      usdtAmount: 500.0,
      inrAmount: 45750.0,
      rate: 91.5,
      reason: 'Partial payment received. Buyer transferred ₹40,000 instead of ₹45,750.',
      utr: '429019284102',
      paymentMethod: 'IMPS Bank Transfer',
      createdAt: '2 hrs ago',
      status: 'PENDING',
      chatSnippet: 'Merchant: ₹5,750 short. Buyer: Bank daily limit hit, transferring rest in 10 mins.',
    },
    {
      id: 'DISP-100',
      orderId: 'FF-8890',
      buyer: '@sunil_verma',
      merchant: 'Zeta Crypto Desk',
      usdtAmount: 250.0,
      inrAmount: 22875.0,
      rate: 91.5,
      reason: 'Merchant release delayed by 3 hours. Both parties confirmed payment verified.',
      utr: '428919284011',
      paymentMethod: 'Paytm UPI',
      createdAt: 'Yesterday',
      status: 'RESOLVED_RELEASE',
      resolutionNote: 'Admin verified HDFC bank statement. Escrow released to buyer safely.',
      resolvedAt: 'Yesterday 19:40',
    },
  ],
  users: [
    {
      id: 'usr-1',
      displayName: '@aarav_crypto',
      email: 'aarav.crypto@gmail.com',
      roles: ['CUSTOMER'],
      status: 'ACTIVE',
      kycStatus: 'VERIFIED',
      walletBalanceUsdt: 1420.5,
      totalTrades: 48,
      totalVolumeInr: 439200,
      joinedDate: '12 Oct 2026',
    },
    {
      id: 'usr-2',
      displayName: '@priya_trader',
      email: 'priya.trader@yahoo.com',
      roles: ['CUSTOMER'],
      status: 'ACTIVE',
      kycStatus: 'VERIFIED',
      walletBalanceUsdt: 850.0,
      totalTrades: 32,
      totalVolumeInr: 292800,
      joinedDate: '18 Oct 2026',
    },
    {
      id: 'usr-3',
      displayName: '@orbit_admin',
      email: 'developer7699@fundfusion.io',
      roles: ['CUSTOMER', 'MERCHANT', 'ADMIN'],
      status: 'ACTIVE',
      kycStatus: 'VERIFIED',
      walletBalanceUsdt: 5770.0,
      totalTrades: 421,
      totalVolumeInr: 3845000,
      joinedDate: '01 Oct 2026',
    },
    {
      id: 'usr-4',
      displayName: '@vikram_delhi',
      email: 'vikram.p2p@hotmail.com',
      roles: ['CUSTOMER'],
      status: 'ACTIVE',
      kycStatus: 'VERIFIED',
      walletBalanceUsdt: 210.0,
      totalTrades: 19,
      totalVolumeInr: 173850,
      joinedDate: '22 Oct 2026',
    },
    {
      id: 'usr-5',
      displayName: '@suspicious_bot',
      email: 'fast_pay_99@proton.me',
      roles: ['CUSTOMER'],
      status: 'SUSPENDED',
      kycStatus: 'UNVERIFIED',
      walletBalanceUsdt: 0.0,
      totalTrades: 2,
      totalVolumeInr: 18300,
      joinedDate: '02 Nov 2026',
    },
    {
      id: 'usr-6',
      displayName: '@neha_sharma',
      email: 'neha.sharma88@gmail.com',
      roles: ['CUSTOMER'],
      status: 'ACTIVE',
      kycStatus: 'PENDING',
      walletBalanceUsdt: 420.0,
      totalTrades: 8,
      totalVolumeInr: 73200,
      joinedDate: '05 Nov 2026',
    },
  ],
  merchants: [
    {
      id: 'mer-1',
      deskName: 'Orbit Desk LLP',
      ownerEmail: 'developer7699@fundfusion.io',
      rating: 99.8,
      totalOrders: 421,
      completionRate: 99.4,
      status: 'ACTIVE',
      commissionRate: 0.015,
      vaultBalanceUsdt: 5696.78,
      lockedEscrowUsdt: 800.0,
      todayVolumeInr: 142500,
      settlementBank: 'HDFC Bank',
      settlementAccount: '••••9102',
      ifsc: 'HDFC0000128',
    },
    {
      id: 'mer-2',
      deskName: 'Apex OTC Liquidity',
      ownerEmail: 'apex.liquidity@gmail.com',
      rating: 98.9,
      totalOrders: 214,
      completionRate: 98.2,
      status: 'ACTIVE',
      commissionRate: 0.018,
      vaultBalanceUsdt: 12500.0,
      lockedEscrowUsdt: 2100.0,
      todayVolumeInr: 285000,
      settlementBank: 'ICICI Bank',
      settlementAccount: '••••3821',
      ifsc: 'ICIC0000412',
    },
    {
      id: 'mer-3',
      deskName: 'Zeta Crypto Hub',
      ownerEmail: 'zeta.desk@protonmail.com',
      rating: 97.4,
      totalOrders: 119,
      completionRate: 97.0,
      status: 'PAUSED',
      commissionRate: 0.015,
      vaultBalanceUsdt: 3400.0,
      lockedEscrowUsdt: 0.0,
      todayVolumeInr: 45000,
      settlementBank: 'Axis Bank',
      settlementAccount: '••••1109',
      ifsc: 'UTIB0000219',
    },
  ],
  orders: [
    {
      id: 'FF-8921',
      buyerName: '@aarav_crypto',
      merchantName: 'Orbit Desk LLP',
      usdtAmount: 100.0,
      inrAmount: 9150.0,
      rate: 91.5,
      paymentMethod: 'UPI (Google Pay)',
      utr: '429104829104',
      status: 'DISPUTED',
      createdAt: '18 mins ago',
    },
    {
      id: 'FF-8920',
      buyerName: '@aarav_crypto',
      merchantName: 'Orbit Desk LLP',
      usdtAmount: 50.0,
      inrAmount: 4575.0,
      rate: 91.5,
      paymentMethod: 'UPI (Google Pay)',
      utr: '429104829104',
      status: 'UTR_SUBMITTED',
      createdAt: '6 mins ago',
    },
    {
      id: 'FF-8922',
      buyerName: '@priya_trader',
      merchantName: 'Orbit Desk LLP',
      usdtAmount: 250.0,
      inrAmount: 22875.0,
      rate: 91.5,
      paymentMethod: 'UPI (PhonePe)',
      status: 'ESCROW_LOCKED',
      createdAt: '1 hr ago',
    },
    {
      id: 'FF-8919',
      buyerName: '@rohit_sharma',
      merchantName: 'Apex OTC Liquidity',
      usdtAmount: 500.0,
      inrAmount: 45750.0,
      rate: 91.5,
      paymentMethod: 'IMPS Bank Transfer',
      utr: '429019284102',
      status: 'DISPUTED',
      createdAt: '2 hrs ago',
    },
    {
      id: 'FF-8918',
      buyerName: '@vikram_delhi',
      merchantName: 'Apex OTC Liquidity',
      usdtAmount: 200.0,
      inrAmount: 18300.0,
      rate: 91.5,
      paymentMethod: 'UPI (Paytm)',
      utr: '429001928341',
      status: 'COMPLETED',
      createdAt: '3 hrs ago',
      completedAt: '2.5 hrs ago',
    },
  ],
  settlements: [
    {
      id: 'SET-901',
      merchantName: 'Orbit Desk LLP',
      bankName: 'HDFC Bank',
      accountNumber: '••••9102',
      ifsc: 'HDFC0000128',
      amountInr: 25000.0,
      usdtDeducted: 273.22,
      status: 'APPROVED',
      utr: 'SETTL-89210984',
      requestedAt: '30 mins ago',
      processedAt: '25 mins ago',
    },
    {
      id: 'SET-902',
      merchantName: 'Apex OTC Liquidity',
      bankName: 'ICICI Bank',
      accountNumber: '••••3821',
      ifsc: 'ICIC0000412',
      amountInr: 120000.0,
      usdtDeducted: 1311.47,
      status: 'PENDING',
      requestedAt: '1 hr ago',
    },
  ],
  supportTickets: [
    {
      id: 'TCK-401',
      user: '@aarav_crypto',
      email: 'aarav.crypto@gmail.com',
      subject: 'Dispute filed on Order #FF-8921',
      category: 'P2P Escrow',
      priority: 'URGENT',
      status: 'OPEN',
      createdAt: '15 mins ago',
      lastMessage: 'I transferred ₹9,150. Please resolve the dispute and release my USDT.',
    },
    {
      id: 'TCK-402',
      user: '@neha_sharma',
      email: 'neha.sharma88@gmail.com',
      subject: 'KYC Level 2 Pan Card Verification Pending',
      category: 'Account',
      priority: 'NORMAL',
      status: 'IN_PROGRESS',
      createdAt: '3 hrs ago',
      lastMessage: 'Uploaded my PAN Card and Aadhaar for higher limits 24h ago.',
    },
  ],
  auditLogs: [
    {
      id: 'log-1',
      timestamp: 'Just now',
      actor: 'SuperAdmin (@developer7699)',
      action: 'LOGIN_CONSOLE',
      entity: 'AUTH',
      details: 'Admin authenticated from 103.21.244.18 (Secure 2FA)',
      ipAddress: '103.21.244.18',
    },
    {
      id: 'log-2',
      timestamp: '25 mins ago',
      actor: 'Automated Engine',
      action: 'SETTLEMENT_PROCESSED',
      entity: 'SET-901',
      details: '₹25,000 paid to Orbit Desk LLP (HDFC ••••9102) with UTR SETTL-89210984',
      ipAddress: 'Internal Server',
    },
  ],
}

function loadAdminState(): AdminState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...INITIAL_STATE,
        ...parsed,
        settings: { ...INITIAL_STATE.settings, ...(parsed.settings || {}) },
        giftCardApiRouter: { ...INITIAL_STATE.giftCardApiRouter, ...(parsed.giftCardApiRouter || {}) },
        giftCardInventory: parsed.giftCardInventory || INITIAL_STATE.giftCardInventory,
        giftCardRouteLogs: parsed.giftCardRouteLogs || INITIAL_STATE.giftCardRouteLogs,
        disputes: parsed.disputes || INITIAL_STATE.disputes,
        users: parsed.users || INITIAL_STATE.users,
        merchants: parsed.merchants || INITIAL_STATE.merchants,
        orders: parsed.orders || INITIAL_STATE.orders,
        settlements: parsed.settlements || INITIAL_STATE.settlements,
        supportTickets: parsed.supportTickets || INITIAL_STATE.supportTickets,
        auditLogs: parsed.auditLogs || INITIAL_STATE.auditLogs,
      }
    }
  } catch {}
  return INITIAL_STATE
}

function saveAdminState(state: AdminState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    window.dispatchEvent(new Event(EVENT_KEY))
  } catch {}
}

export function useAdminStore() {
  const [state, setState] = useState<AdminState>(loadAdminState)

  useEffect(() => {
    const handleSync = () => setState(loadAdminState())
    window.addEventListener(EVENT_KEY, handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener(EVENT_KEY, handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  const addAuditLog = useCallback((action: string, entity: string, details: string) => {
    const current = loadAdminState()
    const newLog: AdminAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: 'Just now',
      actor: 'SuperAdmin (@developer7699)',
      action,
      entity,
      details,
      ipAddress: '103.21.244.18',
    }
    const nextState = {
      ...current,
      auditLogs: [newLog, ...current.auditLogs].slice(0, 50),
    }
    saveAdminState(nextState)
    setState(nextState)
  }, [])

  // 1. Resolve Dispute
  const resolveDispute = useCallback(
    (disputeId: string, decision: 'RELEASE_TO_BUYER' | 'REFUND_TO_MERCHANT', note: string) => {
      const current = loadAdminState()
      const dispute = current.disputes.find((d) => d.id === disputeId)
      if (!dispute) return false

      const nextStatus = decision === 'RELEASE_TO_BUYER' ? 'RESOLVED_RELEASE' : 'RESOLVED_REFUND'
      const updatedDisputes = current.disputes.map((d) =>
        d.id === disputeId
          ? {
              ...d,
              status: nextStatus as 'RESOLVED_RELEASE' | 'RESOLVED_REFUND',
              resolutionNote: note,
              resolvedAt: 'Just now',
            }
          : d
      )

      const updatedOrders = current.orders.map((o) =>
        o.id === dispute.orderId
          ? {
              ...o,
              status: (decision === 'RELEASE_TO_BUYER' ? 'COMPLETED' : 'CANCELLED') as AdminOrder['status'],
              completedAt: 'Just now',
            }
          : o
      )

      const nextState: AdminState = {
        ...current,
        disputes: updatedDisputes,
        orders: updatedOrders,
      }

      saveAdminState(nextState)
      setState(nextState)

      addAuditLog(
        decision === 'RELEASE_TO_BUYER' ? 'DISPUTE_RELEASE_BUYER' : 'DISPUTE_REFUND_MERCHANT',
        dispute.orderId,
        `Arbitration ruled in favor of ${decision === 'RELEASE_TO_BUYER' ? dispute.buyer : dispute.merchant}. Note: ${note}`
      )
      return true
    },
    [addAuditLog]
  )

  // 2. Toggle User Status
  const toggleUserStatus = useCallback(
    (userId: string) => {
      const current = loadAdminState()
      const user = current.users.find((u) => u.id === userId)
      if (!user) return

      const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
      const updatedUsers = current.users.map((u) =>
        u.id === userId ? { ...u, status: nextStatus as 'ACTIVE' | 'SUSPENDED' } : u
      )

      const nextState = { ...current, users: updatedUsers }
      saveAdminState(nextState)
      setState(nextState)

      addAuditLog(
        nextStatus === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
        user.displayName,
        `User status changed to ${nextStatus}`
      )
    },
    [addAuditLog]
  )

  // 3. Verify User KYC
  const verifyUserKyc = useCallback(
    (userId: string) => {
      const current = loadAdminState()
      const user = current.users.find((u) => u.id === userId)
      if (!user) return

      const updatedUsers = current.users.map((u) =>
        u.id === userId ? { ...u, kycStatus: 'VERIFIED' as const } : u
      )
      const nextState = { ...current, users: updatedUsers }
      saveAdminState(nextState)
      setState(nextState)

      addAuditLog('KYC_VERIFIED', user.displayName, 'Aadhaar / PAN documentation manually approved by Admin')
    },
    [addAuditLog]
  )

  // 4. Adjust User Balance
  const adjustUserBalance = useCallback(
    (userId: string, deltaUsdt: number, reason: string) => {
      const current = loadAdminState()
      const user = current.users.find((u) => u.id === userId)
      if (!user) return

      const newBalance = Math.max(0, user.walletBalanceUsdt + deltaUsdt)
      const updatedUsers = current.users.map((u) =>
        u.id === userId ? { ...u, walletBalanceUsdt: parseFloat(newBalance.toFixed(2)) } : u
      )
      const nextState = { ...current, users: updatedUsers }
      saveAdminState(nextState)
      setState(nextState)

      addAuditLog(
        'USER_BALANCE_ADJUSTED',
        user.displayName,
        `${deltaUsdt >= 0 ? 'Credited' : 'Debited'} ${Math.abs(deltaUsdt)} USDT. Reason: ${reason}. New Balance: ${newBalance.toFixed(2)} USDT`
      )
    },
    [addAuditLog]
  )

  // 5. Toggle Merchant Status
  const toggleMerchantStatus = useCallback(
    (merchantId: string, newStatus?: 'ACTIVE' | 'PAUSED') => {
      const current = loadAdminState()
      const mer = current.merchants.find((m) => m.id === merchantId)
      if (!mer) return

      const status = newStatus || (mer.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')
      const updated = current.merchants.map((m) =>
        m.id === merchantId ? { ...m, status } : m
      )
      const nextState = { ...current, merchants: updated }
      saveAdminState(nextState)
      setState(nextState)

      addAuditLog('MERCHANT_STATUS_CHANGE', mer.deskName, `Desk status updated to ${status}`)
    },
    [addAuditLog]
  )

  // 6. Update Merchant Commission Tier
  const updateMerchantCommission = useCallback(
    (merchantId: string, newRate: number) => {
      const current = loadAdminState()
      const mer = current.merchants.find((m) => m.id === merchantId)
      if (!mer) return

      const updated = current.merchants.map((m) =>
        m.id === merchantId ? { ...m, commissionRate: newRate } : m
      )
      const nextState = { ...current, merchants: updated }
      saveAdminState(nextState)
      setState(nextState)

      addAuditLog(
        'MERCHANT_TIER_ADJUSTED',
        mer.deskName,
        `Commission rate updated to ${(newRate * 100).toFixed(2)}%`
      )
    },
    [addAuditLog]
  )

  // 7. Approve Settlement
  const approveSettlement = useCallback(
    (settlementId: string, utrRef?: string) => {
      const current = loadAdminState()
      const set = current.settlements.find((s) => s.id === settlementId)
      if (!set) return

      const generatedUtr = utrRef || `SETTL-${Math.floor(10000000 + Math.random() * 90000000)}`
      const updated = current.settlements.map((s) =>
        s.id === settlementId
          ? {
              ...s,
              status: 'APPROVED' as const,
              utr: generatedUtr,
              processedAt: 'Just now',
            }
          : s
      )
      const nextState = { ...current, settlements: updated }
      saveAdminState(nextState)
      setState(nextState)

      addAuditLog(
        'SETTLEMENT_APPROVED',
        settlementId,
        `₹${set.amountInr.toLocaleString('en-IN')} approved for ${set.merchantName} (${set.bankName}) with UTR ${generatedUtr}`
      )
    },
    [addAuditLog]
  )

  // 8. Reject Settlement
  const rejectSettlement = useCallback(
    (settlementId: string, reason: string) => {
      const current = loadAdminState()
      const set = current.settlements.find((s) => s.id === settlementId)
      if (!set) return

      const updated = current.settlements.map((s) =>
        s.id === settlementId ? { ...s, status: 'REJECTED' as const } : s
      )
      const nextState = { ...current, settlements: updated }
      saveAdminState(nextState)
      setState(nextState)

      addAuditLog(
        'SETTLEMENT_REJECTED',
        settlementId,
        `Payout of ₹${set.amountInr.toLocaleString('en-IN')} for ${set.merchantName} rejected. Reason: ${reason}`
      )
    },
    [addAuditLog]
  )

  // 9. Update Settings
  const updateSettings = useCallback(
    (newSettings: Partial<AdminSettings>) => {
      const current = loadAdminState()
      const nextSettings = { ...current.settings, ...newSettings }
      const nextState = { ...current, settings: nextSettings }
      saveAdminState(nextState)
      setState(nextState)

      addAuditLog(
        'PLATFORM_SETTINGS_UPDATED',
        'SYSTEM_CONFIG',
        `Updated settings: Rate ₹${nextSettings.baseUsdtRate}, Fee ${nextSettings.platformFeePercent}%`
      )
    },
    [addAuditLog]
  )

  // 10. Support Ticket
  const updateSupportTicket = useCallback(
    (ticketId: string, newStatus: AdminSupportTicket['status'], replyText?: string) => {
      const current = loadAdminState()
      const updated = current.supportTickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: newStatus,
              lastMessage: replyText ? `Admin: ${replyText}` : t.lastMessage,
            }
          : t
      )
      const nextState = { ...current, supportTickets: updated }
      saveAdminState(nextState)
      setState(nextState)

      addAuditLog('SUPPORT_TICKET_UPDATED', ticketId, `Ticket status changed to ${newStatus}`)
    },
    [addAuditLog]
  )

  // 11. Override Order
  const overrideOrder = useCallback(
    (orderId: string, action: 'FORCE_COMPLETE' | 'FORCE_CANCEL') => {
      const current = loadAdminState()
      const target = current.orders.find((o) => o.id === orderId)
      if (!target) return

      const nextStatus = action === 'FORCE_COMPLETE' ? 'COMPLETED' : 'CANCELLED'
      const updated = current.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: nextStatus as AdminOrder['status'],
              completedAt: 'Just now',
            }
          : o
      )
      const nextState = { ...current, orders: updated }
      saveAdminState(nextState)
      setState(nextState)

      addAuditLog('ORDER_OVERRIDE', orderId, `Emergency admin override: Order marked as ${nextStatus}`)
    },
    [addAuditLog]
  )

  // =========================================================================
  // GIFT CARD 3-TIER SMART ROUTER ACTIONS
  // =========================================================================

  // A. Add In-House Inventory Item
  const addInventoryItem = useCallback(
    (item: Omit<GiftCardInventoryItem, 'id' | 'status' | 'addedAt'>) => {
      const current = loadAdminState()
      const newItem: GiftCardInventoryItem = {
        ...item,
        id: `INV-${Math.floor(100 + Math.random() * 900)}`,
        status: 'AVAILABLE',
        addedAt: 'Just now',
      }
      const nextState = {
        ...current,
        giftCardInventory: [newItem, ...current.giftCardInventory],
      }
      saveAdminState(nextState)
      setState(nextState)

      addAuditLog(
        'GIFT_CARD_ADDED',
        item.brand,
        `Added ₹${item.denominationInr} voucher (${item.code.slice(0, 8)}••••) to local inventory vault`
      )
    },
    [addAuditLog]
  )

  // B. Delete Inventory Item
  const deleteInventoryItem = useCallback(
    (itemId: string) => {
      const current = loadAdminState()
      const target = current.giftCardInventory.find((i) => i.id === itemId)
      if (!target) return

      const nextState = {
        ...current,
        giftCardInventory: current.giftCardInventory.filter((i) => i.id !== itemId),
      }
      saveAdminState(nextState)
      setState(nextState)

      addAuditLog(
        'GIFT_CARD_DELETED',
        target.brand,
        `Removed voucher ${target.id} (₹${target.denominationInr}) from inventory`
      )
    },
    [addAuditLog]
  )

  // C. Update API Router Config
  const updateApiRouterConfig = useCallback(
    (config: Partial<GiftCardApiRouterConfig>) => {
      const current = loadAdminState()
      const updated = { ...current.giftCardApiRouter, ...config }
      const nextState = { ...current, giftCardApiRouter: updated }
      saveAdminState(nextState)
      setState(nextState)

      addAuditLog(
        'API_ROUTER_UPDATED',
        updated.providerName,
        `Router settings changed. Auto-Router: ${updated.isAutoRouterActive}, Stock: ${updated.isApiStockAvailable ? 'IN_STOCK' : 'OUT_OF_STOCK'}`
      )
    },
    [addAuditLog]
  )

  // D. Quick Toggle API Stock Availability
  const toggleApiStockAvailability = useCallback(() => {
    const current = loadAdminState()
    const nextVal = !current.giftCardApiRouter.isApiStockAvailable
    const updated = { ...current.giftCardApiRouter, isApiStockAvailable: nextVal }
    const nextState = { ...current, giftCardApiRouter: updated }
    saveAdminState(nextState)
    setState(nextState)

    addAuditLog(
      'API_ROUTER_STOCK_TOGGLE',
      current.giftCardApiRouter.providerName,
      `API Stock availability set to: ${nextVal ? 'IN STOCK' : 'OUT OF STOCK (Forces Tier 3 Forwarding)'}`
    )
    return nextVal
  }, [addAuditLog])

  // E. 3-TIER SMART ORDER FULFILLMENT ENGINE
  const fulfillGiftCardOrder = useCallback(
    (brand: string, denominationInr: number, buyerName = '@aarav_crypto') => {
      const current = loadAdminState()
      const rate = current.settings.baseUsdtRate || 91.5
      const usdtAmount = parseFloat((denominationInr / rate).toFixed(2))
      const orderId = `GC-${Math.floor(7800 + Math.random() * 2000)}`

      // --- TIER 1 CHECK: Local In-House Inventory Vault ---
      const availableItem = current.giftCardInventory.find(
        (i) => i.brand.toLowerCase() === brand.toLowerCase() && i.denominationInr === denominationInr && i.status === 'AVAILABLE'
      )

      if (availableItem) {
        // TIER 1 MATCHED!
        const updatedInventory = current.giftCardInventory.map((i) =>
          i.id === availableItem.id
            ? { ...i, status: 'DELIVERED' as const, deliveredToOrder: orderId, deliveredAt: 'Just now' }
            : i
        )

        const newLog: GiftCardOrderRouteLog = {
          id: orderId,
          brand,
          denominationInr,
          usdtAmount,
          buyerName,
          orderedAt: 'Just now',
          fulfillmentTier: 'TIER_1_LOCAL_INVENTORY',
          status: 'DELIVERED',
          voucherCode: availableItem.code,
          voucherPin: availableItem.pin,
          routeTrace: [
            {
              stage: 'LOCAL_INVENTORY',
              status: 'HIT',
              note: `Matched in local inventory vault (#${availableItem.id}). Instant zero-latency delivery.`,
              timestamp: 'Just now',
            },
          ],
        }

        const nextState = {
          ...current,
          giftCardInventory: updatedInventory,
          giftCardRouteLogs: [newLog, ...current.giftCardRouteLogs],
        }
        saveAdminState(nextState)
        setState(nextState)

        addAuditLog(
          'GIFT_CARD_TIER1_DELIVERY',
          orderId,
          `Delivered ₹${denominationInr} ${brand} directly from in-house vault to ${buyerName}`
        )

        return {
          success: true,
          tier: 'TIER_1_LOCAL_INVENTORY' as const,
          code: availableItem.code,
          pin: availableItem.pin,
          orderId,
          message: 'Delivered instantly from local in-house inventory vault!',
        }
      }

      // --- TIER 2 CHECK: Automation Router API ---
      const routerConfig = current.giftCardApiRouter
      if (routerConfig.isAutoRouterActive && routerConfig.isApiStockAvailable) {
        // TIER 2 MATCHED! (Simulated instant API voucher issuance)
        const brandCode = brand.replace(/\s+/g, '').slice(0, 4).toUpperCase()
        const apiCode = `API-${brandCode}-${Math.floor(10000000 + Math.random() * 90000000)}`
        const apiPin = `${Math.floor(1000 + Math.random() * 9000)}`

        const newLog: GiftCardOrderRouteLog = {
          id: orderId,
          brand,
          denominationInr,
          usdtAmount,
          buyerName,
          orderedAt: 'Just now',
          fulfillmentTier: 'TIER_2_ROUTER_API',
          status: 'DELIVERED',
          voucherCode: apiCode,
          voucherPin: apiPin,
          routeTrace: [
            {
              stage: 'LOCAL_INVENTORY',
              status: 'MISS',
              note: `Local stock empty for ${brand} ₹${denominationInr}. Routed to Automation API.`,
              timestamp: 'Just now',
            },
            {
              stage: 'API_ROUTER',
              status: 'HIT',
              note: `${routerConfig.providerName} issued digital voucher code in 650ms.`,
              timestamp: 'Just now',
            },
          ],
        }

        const nextState = {
          ...current,
          giftCardRouteLogs: [newLog, ...current.giftCardRouteLogs],
        }
        saveAdminState(nextState)
        setState(nextState)

        addAuditLog(
          'GIFT_CARD_TIER2_API_DELIVERY',
          orderId,
          `Local stock empty. Auto-routed to ${routerConfig.providerName} API. Code generated for ${buyerName}`
        )

        return {
          success: true,
          tier: 'TIER_2_ROUTER_API' as const,
          code: apiCode,
          pin: apiPin,
          orderId,
          message: `Issued automatically via ${routerConfig.providerName}!`,
        }
      }

      // --- TIER 3 FALLBACK: Auto-Forward to OTC Merchant Desk ---
      // Both Local Inventory and Router API are out of stock!
      const fallbackMerchant = current.merchants.find((m) => m.status === 'ACTIVE')?.deskName || 'Orbit Desk LLP'

      const newLog: GiftCardOrderRouteLog = {
        id: orderId,
        brand,
        denominationInr,
        usdtAmount,
        buyerName,
        orderedAt: 'Just now',
        fulfillmentTier: 'TIER_3_MERCHANT_DESK',
        status: 'FORWARDED_TO_MERCHANT',
        merchantAssigned: fallbackMerchant,
        routeTrace: [
          {
            stage: 'LOCAL_INVENTORY',
            status: 'MISS',
            note: `Local vault out of stock for ${brand} ₹${denominationInr}.`,
            timestamp: 'Just now',
          },
          {
            stage: 'API_ROUTER',
            status: 'MISS',
            note: `${routerConfig.providerName} returned 404: Aggregator Out of Stock.`,
            timestamp: 'Just now',
          },
          {
            stage: 'MERCHANT_DESK',
            status: 'DISPATCHED',
            note: `Auto-forwarded to Merchant Desk (${fallbackMerchant}) for rapid manual procurement.`,
            timestamp: 'Just now',
          },
        ],
      }

      const nextState = {
        ...current,
        giftCardRouteLogs: [newLog, ...current.giftCardRouteLogs],
      }
      saveAdminState(nextState)
      setState(nextState)

      addAuditLog(
        'GIFT_CARD_TIER3_MERCHANT_FORWARDED',
        orderId,
        `API Out-of-Stock. Order forwarded to OTC Merchant Desk (${fallbackMerchant}) for manual fulfillment`
      )

      return {
        success: false,
        isForwarded: true,
        tier: 'TIER_3_MERCHANT_DESK' as const,
        orderId,
        merchantAssigned: fallbackMerchant,
        message: `Local & API stock empty. Auto-forwarded to Merchant Desk (${fallbackMerchant}) for manual dispatch!`,
      }
    },
    [addAuditLog]
  )

  // F. Merchant / Admin Fulfill Forwarded Order
  const merchantFulfillGiftCard = useCallback(
    (orderId: string, voucherCode: string, voucherPin: string, merchantName = 'Orbit Desk LLP') => {
      const current = loadAdminState()
      const target = current.giftCardRouteLogs.find((l) => l.id === orderId)
      if (!target) return false

      const updatedLogs = current.giftCardRouteLogs.map((l) =>
        l.id === orderId
          ? {
              ...l,
              status: 'MERCHANT_COMPLETED' as const,
              voucherCode,
              voucherPin,
              merchantAssigned: merchantName,
              routeTrace: [
                ...l.routeTrace,
                {
                  stage: 'MERCHANT_DESK' as const,
                  status: 'FULFILLED' as const,
                  note: `Procured & verified manually by ${merchantName}. Delivered to ${l.buyerName}.`,
                  timestamp: 'Just now',
                },
              ],
            }
          : l
      )

      const nextState = {
        ...current,
        giftCardRouteLogs: updatedLogs,
      }
      saveAdminState(nextState)
      setState(nextState)

      addAuditLog(
        'GIFT_CARD_MERCHANT_FULFILLED',
        orderId,
        `Forwarded order fulfilled manually by ${merchantName} with code ${voucherCode}`
      )
      return true
    },
    [addAuditLog]
  )

  // Computations
  const activeDisputesCount = state.disputes.filter((d) => d.status === 'PENDING').length
  const pendingSettlementsCount = state.settlements.filter((s) => s.status === 'PENDING').length
  const pendingMerchantsCount = state.merchants.filter((m) => m.status === 'PENDING').length
  const totalVolumeInr = state.orders
    .filter((o) => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + o.inrAmount, 1425000)
  const totalEscrowLockedUsdt = state.orders
    .filter((o) => o.status === 'ESCROW_LOCKED' || o.status === 'DISPUTED')
    .reduce((sum, o) => sum + o.usdtAmount, 1250)
  const availableInventoryCount = state.giftCardInventory.filter((i) => i.status === 'AVAILABLE').length
  const forwardedGiftCardsCount = state.giftCardRouteLogs.filter((l) => l.status === 'FORWARDED_TO_MERCHANT').length

  return {
    ...state,
    activeDisputesCount,
    pendingSettlementsCount,
    pendingMerchantsCount,
    totalVolumeInr,
    totalEscrowLockedUsdt,
    availableInventoryCount,
    forwardedGiftCardsCount,
    resolveDispute,
    toggleUserStatus,
    verifyUserKyc,
    adjustUserBalance,
    toggleMerchantStatus,
    updateMerchantCommission,
    approveSettlement,
    rejectSettlement,
    updateSettings,
    updateSupportTicket,
    overrideOrder,
    addInventoryItem,
    deleteInventoryItem,
    updateApiRouterConfig,
    toggleApiStockAvailability,
    fulfillGiftCardOrder,
    merchantFulfillGiftCard,
    addAuditLog,
  }
}
