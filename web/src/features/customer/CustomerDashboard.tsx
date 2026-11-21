import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { useWalletSummary } from './wallet-flows'

import { TotalAssetsCard } from './components/TotalAssetsCard'
import { QuickActionGrid } from './components/QuickActionGrid'
import { P2PRatesSection } from './components/P2PRatesSection'
import { DepositModal } from './components/DepositModal'
import { AboutModal, BecomeMerchantModal } from './components/InfoModals'

export function CustomerDashboard() {
  const navigate = useNavigate()

  const [isDepositOpen, setIsDepositOpen] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isMerchantOpen, setIsMerchantOpen] = useState(false)

  const q = useWalletSummary()

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


  return (
    <div className="space-y-3.5 sm:space-y-4 max-w-5xl mx-auto w-full pb-1 overflow-x-hidden min-w-0 transition-all">
      <TotalAssetsCard
        availableUsdt={q.data?.balances.AVAILABLE}
        onOpenDeposit={() => setIsDepositOpen(true)}
        onOpenSell={() => navigate('/customer/sell')}
      />

      <QuickActionGrid onOpenMore={() => navigate('/customer/wallet')} />

      <P2PRatesSection />

      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        address={q.data?.address ?? null}
        network={q.data?.network ?? ''}
      />

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <BecomeMerchantModal isOpen={isMerchantOpen} onClose={() => setIsMerchantOpen(false)} />
    </div>
  )
}
