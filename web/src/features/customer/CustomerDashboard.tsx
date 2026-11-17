import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

import { TotalAssetsCard } from './components/TotalAssetsCard'
import { QuickActionGrid } from './components/QuickActionGrid'
import { P2PRatesSection } from './components/P2PRatesSection'
import { DepositModal } from './components/DepositModal'
import { AboutModal, BecomeMerchantModal } from './components/InfoModals'

type Overview = {
  simulated: boolean
  usdtInrRate: string
  wallet: { availableUsdt: string; lockedUsdt: string; totalUsdt: string; inrEstimate: string }
  totals: { transactions: number }
  recent: { id: string; type: string; status: string; amount: string; asset: string; createdAt: string }[]
}

export function CustomerDashboard() {
  const navigate = useNavigate()

  const [isDepositOpen, setIsDepositOpen] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isMerchantOpen, setIsMerchantOpen] = useState(false)
  const [addedDepositBalance, setAddedDepositBalance] = useState(0)

  const q = useQuery({
    queryKey: ['overview'],
    queryFn: () => api<Overview>('/customer/overview').catch(() => null),
    retry: false,
  })

  if (q.isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto w-full p-2">
        <Skeleton className="h-40 rounded-[28px]" />
        <div className="grid grid-cols-4 gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="h-28 rounded-[28px]" />
        <Skeleton className="h-36 rounded-[28px]" />
      </div>
    )
  }

  const d = q.data
  const usdtInrRate = d?.usdtInrRate || '91.50'
  const rateNum = parseFloat(usdtInrRate) || 91.5
  const baseUsdt = parseFloat(d?.wallet?.totalUsdt || '0.00') || 0
  const netBalance = Math.max(0, baseUsdt + addedDepositBalance)
  const totalUsdt = netBalance.toFixed(2)
  const inrEstimate = (netBalance * rateNum).toFixed(2)

  return (
    <div className="space-y-3.5 sm:space-y-4 max-w-5xl mx-auto w-full pb-1 overflow-x-hidden min-w-0 transition-all">
      <TotalAssetsCard
        totalUsdt={totalUsdt}
        inrEstimate={inrEstimate}
        usdtInrRate={usdtInrRate}
        onOpenDeposit={() => setIsDepositOpen(true)}
        onOpenSell={() => navigate('/customer/sell')}
      />

      <QuickActionGrid onOpenMore={() => navigate('/customer/wallet')} />

      <P2PRatesSection />

      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onDepositSuccess={(amt) => setAddedDepositBalance((prev) => prev + amt)}
      />

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <BecomeMerchantModal isOpen={isMerchantOpen} onClose={() => setIsMerchantOpen(false)} />
    </div>
  )
}
