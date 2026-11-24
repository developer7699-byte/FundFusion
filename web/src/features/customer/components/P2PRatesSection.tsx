import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, ArrowRight, Zap, RefreshCw, CheckCircle2, UserCheck, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface P2PRatesSectionProps {
  onOpenQuickBuy?: () => void
  onOpenQuickSell?: () => void
}

export function P2PRatesSection({ onOpenQuickBuy, onOpenQuickSell }: P2PRatesSectionProps) {
  const [activeTab, setActiveTab] = useState<'BUY' | 'SELL'>('BUY')

  const buyDealers = [
    {
      id: 'd1',
      name: 'NexoraEscrow_Fast',
      orders: '1,420 orders',
      completion: '99.8%',
      price: '₹91.45',
      cryptoPrice: '1.00 USDT',
      limits: '₹500 - ₹50,000',
      payments: ['UPI', 'IMPS', 'Paytm'],
    },
    {
      id: 'd2',
      name: 'MumbaiCryptoDesk',
      orders: '890 orders',
      completion: '99.4%',
      price: '₹91.50',
      cryptoPrice: '1.00 USDT',
      limits: '₹1,000 - ₹1,00,000',
      payments: ['UPI', 'Google Pay'],
    },
    {
      id: 'd3',
      name: 'DirectInstant_24x7',
      orders: '2,100 orders',
      completion: '100%',
      price: '₹91.58',
      cryptoPrice: '1.00 USDT',
      limits: '₹200 - ₹25,000',
      payments: ['UPI', 'PhonePe', 'IMPS'],
    },
  ]

  const sellDealers = [
    {
      id: 's1',
      name: 'PrimeP2P_Payouts',
      orders: '3,240 orders',
      completion: '99.9%',
      price: '₹97.10',
      cryptoPrice: '1.00 USDT',
      limits: '₹1,000 - ₹2,00,000',
      payments: ['IMPS 24/7', 'UPI'],
    },
    {
      id: 's2',
      name: 'InstantRupeeDesk',
      orders: '1,120 orders',
      completion: '99.5%',
      price: '₹96.95',
      cryptoPrice: '1.00 USDT',
      limits: '₹500 - ₹80,000',
      payments: ['UPI', 'Bank Transfer'],
    },
  ]

  const currentList = activeTab === 'BUY' ? buyDealers : sellDealers

  return (
    <div className="w-full rounded-2xl sm:rounded-3xl bg-white dark:bg-[#121829] border border-slate-100 dark:border-slate-800/80 p-3.5 sm:p-4 shadow-xs space-y-3">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('BUY')}
            className={cn(
              'px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer',
              activeTab === 'BUY'
                ? 'bg-[#f7a83b] text-slate-950 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            Buy USDT (P2P)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SELL')}
            className={cn(
              'px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer',
              activeTab === 'SELL'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            Sell USDT (P2P)
          </button>
        </div>

        <Link
          to={activeTab === 'BUY' ? '/customer/buy' : '/customer/sell'}
          className="text-[11px] font-bold text-[#f7a83b] dark:text-[#f7a83b] hover:underline flex items-center gap-0.5"
        >
          <span>All P2P Ads</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Dealer Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {currentList.map((dealer) => (
          <div key={dealer.id} className="py-2.5 flex items-center justify-between gap-2">
            {/* Left Dealer Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f7a83b] shrink-0" />
                <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  {dealer.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {dealer.completion}
                </span>
              </div>

              <div className="text-[10px] text-slate-400 mt-0.5">
                Limit: {dealer.limits}
              </div>

              {/* Payment badges */}
              <div className="flex items-center gap-1 mt-1">
                {dealer.payments.map((p) => (
                  <span
                    key={p}
                    className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Price & Trade Action */}
            <div className="text-right shrink-0 space-y-1">
              <div>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono block">
                  {dealer.price}
                </span>
                <span className="text-[10px] text-slate-400">per USDT</span>
              </div>

              <Link to={activeTab === 'BUY' ? '/customer/buy' : '/customer/sell'}>
                <button
                  type="button"
                  className={cn(
                    'px-3 py-1 rounded-xl text-[11px] font-black cursor-pointer transition-transform active:scale-95 shadow-xs',
                    activeTab === 'BUY'
                      ? 'bg-[#f7a83b] hover:bg-[#f59e26] text-slate-950'
                      : 'bg-rose-500 hover:bg-rose-600 text-white'
                  )}
                >
                  {activeTab === 'BUY' ? 'Buy USDT' : 'Sell USDT'}
                </button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

