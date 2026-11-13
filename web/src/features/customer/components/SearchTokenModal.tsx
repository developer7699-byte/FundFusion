import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, X, Gift, Smartphone, Zap, ArrowRight, ShieldCheck, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchTokenModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectService?: (serviceType: string) => void
}

interface SearchItem {
  id: string
  title: string
  category: 'Gifts' | 'Bills' | 'Crypto'
  meta: string
  link?: string
  action?: string
}

const SEARCH_CATALOG: SearchItem[] = [
  // Gift Cards
  { id: 'amz', title: 'Amazon Pay Gift Voucher', category: 'Gifts', meta: '5% Cashback · Instant code', link: '/customer/gift-cards' },
  { id: 'flp', title: 'Flipkart Shopping Voucher', category: 'Gifts', meta: '4% Cashback · E-Gift PIN', link: '/customer/gift-cards' },
  { id: 'gpl', title: 'Google Play Gift Card', category: 'Gifts', meta: 'Apps, Games & In-app', link: '/customer/gift-cards' },
  { id: 'swg', title: 'Swiggy Food & Instamart', category: 'Gifts', meta: 'Food delivery vouchers', link: '/customer/gift-cards' },
  { id: 'apl', title: 'Apple App Store Code', category: 'Gifts', meta: 'Music & iCloud storage', link: '/customer/gift-cards' },
  { id: 'zom', title: 'Zomato Dining & Delivery', category: 'Gifts', meta: 'Instant dinner savings', link: '/customer/gift-cards' },
  { id: 'myn', title: 'Myntra Fashion Voucher', category: 'Gifts', meta: 'Clothing & footwear', link: '/customer/gift-cards' },

  // Bills & Utilities
  { id: 'jio', title: 'Jio Mobile Recharge', category: 'Bills', meta: 'Prepaid & Postpaid · 0% fee', link: '/customer/utilities' },
  { id: 'art', title: 'Airtel Recharge & Fiber', category: 'Bills', meta: 'Data packs & Validity', link: '/customer/utilities' },
  { id: 'ele', title: 'Electricity Bill Payment', category: 'Bills', meta: 'BESCOM, Adani, Tata Power', link: '/customer/utilities' },
  { id: 'dth', title: 'DTH TV Recharge', category: 'Bills', meta: 'Tata Play, Airtel, Dish TV', link: '/customer/utilities' },
  { id: 'fas', title: 'FASTag Highway Toll', category: 'Bills', meta: 'Instant RFID wallet reload', link: '/customer/utilities' },
  { id: 'gas', title: 'Piped Cooking Gas', category: 'Bills', meta: 'Mahanagar Gas, IGL', link: '/customer/utilities' },

  // Crypto P2P
  { id: 'req', title: 'Request Money via UPI / USDT', category: 'Payments', meta: 'Generate custom QR & pay link', link: '/customer/request' },
  { id: 'usdt', title: 'Buy / Sell USDT via UPI', category: 'Crypto', meta: '₹91.45 · Escrow verified', link: '/customer/buy' },
  { id: 'btc', title: 'Bitcoin P2P Trading', category: 'Crypto', meta: 'Instant Bank & IMPS', link: '/customer/buy' },
  { id: 'eth', title: 'Ethereum P2P Swaps', category: 'Crypto', meta: 'Sub-minute settlement', link: '/customer/buy' },
]

export function SearchTokenModal({ isOpen, onClose }: SearchTokenModalProps) {
  const [query, setQuery] = useState('')
  if (!isOpen) return null

  const filtered = SEARCH_CATALOG.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()) ||
      item.meta.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-[360px] bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85%]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search gift vouchers, bills, recharges..."
            autoFocus
            className="flex-1 bg-transparent border-0 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Tag Pills */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 shrink-0">
            <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
            Hot:
          </span>
          {['Amazon', 'Flipkart', 'Mobile Recharge', 'Electricity', 'USDT'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setQuery(p)}
              className="px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-semibold text-[11px] shrink-0 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition-colors border border-slate-200/60 dark:border-slate-700/60"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/50">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching vouchers or bills found for "{query}".
            </div>
          ) : (
            filtered.map((item) => (
              <Link
                key={item.id}
                to={item.link || '/customer/dashboard'}
                onClick={onClose}
                className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors group cursor-pointer"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    {item.category === 'Gifts' ? (
                      <Gift className="w-4 h-4 text-amber-500" />
                    ) : item.category === 'Bills' ? (
                      <Zap className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <span className="text-xs font-mono font-bold text-blue-500">₮</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors block truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">{item.meta}</span>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                  {item.category}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
