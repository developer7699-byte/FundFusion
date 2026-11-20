import { useState } from 'react'
import {
  Gift,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  Zap,
  Store,
  Sliders,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  X,
  ExternalLink,
  ShieldCheck,
  Layers,
  Sparkles,
  Server,
} from 'lucide-react'
import {
  useAdminStore,
  type GiftCardInventoryItem,
  type GiftCardOrderRouteLog,
} from '@/lib/admin-store'
import { ToastNotification } from '@/components/ui/ToastNotification'
import { cn } from '@/lib/utils'

export function AdminGiftCards() {
  const {
    giftCardInventory,
    giftCardApiRouter,
    giftCardRouteLogs,
    addInventoryItem,
    deleteInventoryItem,
    updateApiRouterConfig,
    toggleApiStockAvailability,
    fulfillGiftCardOrder,
    merchantFulfillGiftCard,
    availableInventoryCount,
    forwardedGiftCardsCount,
  } = useAdminStore()

  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'ROUTER' | 'FORWARDED' | 'SIMULATOR' | 'LOGS'>('INVENTORY')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('ALL')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [revealedCodes, setRevealedCodes] = useState<Record<string, boolean>>({})
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Add Voucher Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newCard, setNewCard] = useState({
    brand: 'Amazon Pay',
    denominationInr: 1000,
    code: '',
    pin: '',
    expiryDate: '31 Dec 2027',
  })

  // Fulfill Forwarded Order Modal
  const [selectedForwardedOrder, setSelectedForwardedOrder] = useState<GiftCardOrderRouteLog | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [manualPin, setManualPin] = useState('')

  // Simulator State
  const [simBrand, setSimBrand] = useState('Amazon Pay')
  const [simDenom, setSimDenom] = useState(1000)
  const [simResult, setSimResult] = useState<any>(null)
  const [isSimulating, setIsSimulating] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const toggleReveal = (id: string) => {
    setRevealedCodes((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCard.code.trim()) {
      showToast('Please enter a valid voucher code')
      return
    }
    addInventoryItem({
      brand: newCard.brand,
      denominationInr: Number(newCard.denominationInr),
      code: newCard.code.trim(),
      pin: newCard.pin.trim() || '—',
      expiryDate: newCard.expiryDate,
    })
    showToast(`Added ₹${newCard.denominationInr} ${newCard.brand} card to in-house inventory!`)
    setIsAddModalOpen(false)
    setNewCard({ brand: 'Amazon Pay', denominationInr: 1000, code: '', pin: '', expiryDate: '31 Dec 2027' })
  }

  const handleManualFulfill = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedForwardedOrder || !manualCode.trim()) return
    merchantFulfillGiftCard(
      selectedForwardedOrder.id,
      manualCode.trim(),
      manualPin.trim() || '—',
      'Orbit Desk LLP'
    )
    showToast(`Order ${selectedForwardedOrder.id} successfully fulfilled and dispatched!`)
    setSelectedForwardedOrder(null)
    setManualCode('')
    setManualPin('')
  }

  const runSimulation = () => {
    setIsSimulating(true)
    setSimResult(null)
    setTimeout(() => {
      const res = fulfillGiftCardOrder(simBrand, Number(simDenom), '@test_customer')
      setSimResult(res)
      setIsSimulating(false)
      showToast(res.message)
    }, 600)
  }

  const filteredInventory = giftCardInventory.filter((item) => {
    if (selectedBrandFilter !== 'ALL' && item.brand !== selectedBrandFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return item.brand.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)
    }
    return true
  })

  const totalVaultValueInr = giftCardInventory
    .filter((i) => i.status === 'AVAILABLE')
    .reduce((sum, i) => sum + i.denominationInr, 0)

  const forwardedOrders = giftCardRouteLogs.filter((l) => l.status === 'FORWARDED_TO_MERCHANT')

  return (
    <div className="space-y-6">
      {toastMessage && (
        <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-nx-text">
              Gift Cards & 3-Tier Smart Router
            </h1>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              Auto-Routing Active
            </span>
          </div>
          <p className="mt-1 text-sm text-nx-muted">
            Tier 1: In-House Vault ➔ Tier 2: Pine Labs/Qwikcilver API Router ➔ Tier 3: Merchant Manual Procurement Desk.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Voucher to Vault
          </button>
        </div>
      </div>

      {/* 3-Tier Architecture Flow Banner */}
      <div className="rounded-2xl border border-nx-border bg-nx-surface p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              <h3 className="font-semibold text-nx-text text-sm">3-Tier Automated Fallback Pipeline</h3>
            </div>
            <p className="text-xs text-nx-muted leading-relaxed">
              When an order arrives, FundFusion checks local vault stock first. If unavailable, Pine Labs API issues it instantly. If API is out-of-stock, it auto-forwards to verified OTC Merchant Desks for manual retail procurement.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono shrink-0 overflow-x-auto pb-1">
            <div className="flex items-center gap-1.5 rounded-xl bg-nx-base px-3 py-2 border border-nx-border">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-nx-text font-bold">1. In-House Vault</span>
              <span className="text-nx-muted">({availableInventoryCount} in stock)</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-nx-muted shrink-0" />
            <div className="flex items-center gap-1.5 rounded-xl bg-nx-base px-3 py-2 border border-nx-border">
              <span className={cn('w-2 h-2 rounded-full', giftCardApiRouter.isApiStockAvailable ? 'bg-sky-400' : 'bg-rose-400')} />
              <span className="text-nx-text font-bold">2. API Router</span>
              <span className={giftCardApiRouter.isApiStockAvailable ? 'text-sky-400' : 'text-rose-400'}>
                ({giftCardApiRouter.isApiStockAvailable ? 'Stock OK' : 'Out of Stock'})
              </span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-nx-muted shrink-0" />
            <div className="flex items-center gap-1.5 rounded-xl bg-nx-base px-3 py-2 border border-nx-border">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-nx-text font-bold">3. Merchant Desk</span>
              <span className="text-amber-400">({forwardedOrders.length} pending)</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-nx-border bg-nx-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-nx-muted">In-House Vault Stock</p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{availableInventoryCount} Vouchers</p>
          <p className="mt-1 text-xs text-nx-muted">Face Value: ₹{totalVaultValueInr.toLocaleString('en-IN')}</p>
        </div>

        <div className="rounded-2xl border border-nx-border bg-nx-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-nx-muted">API Router Health</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-sky-400 animate-pulse" />
            <p className="text-lg font-bold text-sky-400">{giftCardApiRouter.providerName.split('/')[0]}</p>
          </div>
          <p className="mt-1 text-xs text-nx-muted">Avg Response: 650ms | Latency: 99.9%</p>
        </div>

        <div className="rounded-2xl border border-nx-border bg-nx-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-nx-muted">API Stock Status</p>
          <div className="mt-2 flex items-center justify-between">
            <span className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-bold border',
              giftCardApiRouter.isApiStockAvailable
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            )}>
              {giftCardApiRouter.isApiStockAvailable ? 'IN STOCK' : 'OUT OF STOCK'}
            </span>
            <button
              onClick={() => {
                const next = toggleApiStockAvailability()
                showToast(`API stock simulated as: ${next ? 'IN STOCK' : 'OUT OF STOCK'}`)
              }}
              className="text-xs font-bold text-sky-400 hover:underline"
            >
              Toggle Test
            </button>
          </div>
          <p className="mt-1 text-[11px] text-nx-muted">Simulate API stock for fallback testing</p>
        </div>

        <div className="rounded-2xl border border-nx-border bg-nx-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-nx-muted">Forwarded to Merchants</p>
          <p className="mt-2 text-2xl font-bold text-amber-400">{forwardedOrders.length} Pending</p>
          <p className="mt-1 text-xs text-nx-muted">Manual OTC retail procurement</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-nx-border gap-2 overflow-x-auto no-scrollbar">
        {[
          { key: 'INVENTORY', label: 'In-House Vault (Tier 1)', count: availableInventoryCount },
          { key: 'ROUTER', label: 'Automation API Gateway (Tier 2)' },
          { key: 'FORWARDED', label: 'Merchant Forwarded (Tier 3)', count: forwardedOrders.length },
          { key: 'SIMULATOR', label: '🧪 3-Tier Dispatch Simulator' },
          { key: 'LOGS', label: 'Order Route Trace Logs' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              'flex items-center gap-2 pb-3 pt-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors px-2',
              activeTab === tab.key
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-nx-muted hover:text-nx-text'
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={cn(
                'rounded-full px-2 py-0.2 text-[10px] font-bold',
                tab.key === 'FORWARDED' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500/20 text-emerald-300'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* =========================================================================
          TAB 1: IN-HOUSE INVENTORY VAULT (TIER 1)
          ========================================================================= */}
      {activeTab === 'INVENTORY' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'Amazon Pay', 'Flipkart', 'Google Play', 'Swiggy', 'Steam Wallet', 'Apple Store'].map((brand) => (
                <button
                  key={brand}
                  onClick={() => setSelectedBrandFilter(brand)}
                  className={cn(
                    'rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
                    selectedBrandFilter === brand
                      ? 'bg-emerald-600 text-white'
                      : 'bg-nx-surface text-nx-muted border border-nx-border hover:text-nx-text'
                  )}
                >
                  {brand}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nx-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search brand or code..."
                className="w-full rounded-xl border border-nx-border bg-nx-surface pl-9 pr-4 py-2 text-xs text-nx-text placeholder:text-nx-muted focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Inventory Table */}
          <div className="rounded-2xl border border-nx-border bg-nx-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-nx-base text-nx-muted uppercase text-[10px] tracking-wider border-b border-nx-border">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">Item ID</th>
                    <th className="px-5 py-3.5 font-bold">Brand & Face Value</th>
                    <th className="px-5 py-3.5 font-bold">Voucher Code & PIN</th>
                    <th className="px-5 py-3.5 font-bold">Expiry Date</th>
                    <th className="px-5 py-3.5 font-bold">Status</th>
                    <th className="px-5 py-3.5 font-bold">Added Date</th>
                    <th className="px-5 py-3.5 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nx-border">
                  {filteredInventory.map((item) => {
                    const isRevealed = !!revealedCodes[item.id]
                    return (
                      <tr key={item.id} className="hover:bg-nx-border/20 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-nx-text">{item.id}</td>
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-nx-text block">{item.brand}</span>
                          <span className="text-emerald-400 font-mono font-bold">₹{item.denominationInr.toLocaleString('en-IN')}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-nx-text">
                              {isRevealed ? item.code : `${item.code.slice(0, 4)}-••••-••••`}
                            </span>
                            <button
                              onClick={() => toggleReveal(item.id)}
                              className="text-nx-muted hover:text-nx-text p-0.5"
                              title={isRevealed ? 'Hide Code' : 'Reveal Code'}
                            >
                              {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(item.code, item.id)}
                              className="text-nx-muted hover:text-nx-text p-0.5"
                              title="Copy Code"
                            >
                              {copiedKey === item.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          {item.pin && item.pin !== '—' && (
                            <span className="text-[10px] text-nx-muted font-mono block">PIN: {item.pin}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-nx-muted">{item.expiryDate}</td>
                        <td className="px-5 py-3.5">
                          <span className={cn(
                            'rounded-full px-2.5 py-0.5 text-[10px] font-bold border',
                            item.status === 'AVAILABLE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          )}>
                            {item.status}
                          </span>
                          {item.deliveredToOrder && (
                            <span className="text-[10px] text-nx-muted block font-mono">Ord: {item.deliveredToOrder}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-nx-muted">{item.addedAt}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => deleteInventoryItem(item.id)}
                            className="text-rose-400 hover:text-rose-300 p-1 rounded-lg hover:bg-rose-500/10"
                            title="Delete Voucher"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: AUTOMATION API GATEWAY (TIER 2)
          ========================================================================= */}
      {activeTab === 'ROUTER' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Gateway Settings Form */}
          <div className="rounded-2xl border border-nx-border bg-nx-surface p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-nx-text">B2B Aggregator API Configuration</h2>
              <p className="text-xs text-nx-muted mt-0.5">Automated Pine Labs / Qwikcilver / Gyftr Gateway Router</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-nx-muted uppercase tracking-wider">Provider Name</label>
                <input
                  type="text"
                  value={giftCardApiRouter.providerName}
                  onChange={(e) => updateApiRouterConfig({ providerName: e.target.value })}
                  className="w-full rounded-xl border border-nx-border bg-nx-base px-3.5 py-2 text-sm text-nx-text focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-nx-muted uppercase tracking-wider">API Endpoint URL</label>
                <input
                  type="text"
                  value={giftCardApiRouter.endpoint}
                  onChange={(e) => updateApiRouterConfig({ endpoint: e.target.value })}
                  className="w-full rounded-xl border border-nx-border bg-nx-base px-3.5 py-2 text-xs font-mono text-nx-text focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-nx-muted uppercase tracking-wider">API Secret Key</label>
                <input
                  type="password"
                  value={giftCardApiRouter.apiKey}
                  onChange={(e) => updateApiRouterConfig({ apiKey: e.target.value })}
                  className="w-full rounded-xl border border-nx-border bg-nx-base px-3.5 py-2 text-xs font-mono text-nx-text focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-nx-border">
                <div>
                  <span className="font-semibold text-nx-text text-sm block">Auto-Router Routing</span>
                  <span className="text-xs text-nx-muted">Fallback to API when local vault is empty</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !giftCardApiRouter.isAutoRouterActive
                    updateApiRouterConfig({ isAutoRouterActive: next })
                    showToast(`Auto-Router ${next ? 'enabled' : 'disabled'}`)
                  }}
                  className={cn(
                    'rounded-xl px-4 py-2 text-xs font-bold transition-colors',
                    giftCardApiRouter.isAutoRouterActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-nx-base border border-nx-border text-nx-muted'
                  )}
                >
                  {giftCardApiRouter.isAutoRouterActive ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-nx-border">
                <div>
                  <span className="font-semibold text-nx-text text-sm block">API Stock Simulation Mode</span>
                  <span className="text-xs text-nx-muted">Toggle off to force Tier 3 Merchant Forwarding</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = toggleApiStockAvailability()
                    showToast(`API stock availability set to: ${next ? 'IN STOCK' : 'OUT OF STOCK'}`)
                  }}
                  className={cn(
                    'rounded-xl px-4 py-2 text-xs font-bold transition-colors',
                    giftCardApiRouter.isApiStockAvailable
                      ? 'bg-sky-600 text-white'
                      : 'bg-rose-600 text-white'
                  )}
                >
                  {giftCardApiRouter.isApiStockAvailable ? 'IN STOCK' : 'OUT OF STOCK'}
                </button>
              </div>
            </div>
          </div>

          {/* Router Diagnostics Card */}
          <div className="rounded-2xl border border-nx-border bg-nx-surface p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-nx-text">Router Diagnostics & Telemetry</h2>
              <p className="text-xs text-nx-muted mt-0.5">Real-time health, response latency, and failover metrics</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-nx-border bg-nx-base flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-emerald-400" />
                  <div>
                    <span className="font-semibold text-nx-text text-sm block">API Cluster Health</span>
                    <span className="text-xs text-nx-muted">Active Node: Mumbai AWS ap-south-1</span>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                  HEALTHY
                </span>
              </div>

              <div className="p-4 rounded-xl border border-nx-border bg-nx-base flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-sky-400" />
                  <div>
                    <span className="font-semibold text-nx-text text-sm block">Voucher Mint Latency</span>
                    <span className="text-xs text-nx-muted">p95 round-trip response time</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-sky-400 text-sm">650ms</span>
              </div>

              <div className="p-4 rounded-xl border border-nx-border bg-nx-base flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-amber-400" />
                  <div>
                    <span className="font-semibold text-nx-text text-sm block">Tier 3 Fallback Dispatch</span>
                    <span className="text-xs text-nx-muted">Dispatches to OTC Merchant Desks</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-amber-400 text-sm">Auto 0.2s</span>
              </div>
            </div>

            <button
              onClick={() => showToast('Ping successful: API Router responded in 642ms with status 200 OK')}
              className="w-full rounded-xl border border-nx-border bg-nx-base py-2.5 text-xs font-bold text-nx-text hover:bg-nx-border/50 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Test API Router Ping
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: MERCHANT FORWARDED (TIER 3)
          ========================================================================= */}
      {activeTab === 'FORWARDED' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-300 text-sm">Manual OTC Procurement Desk Queue</h3>
                <p className="text-xs text-nx-muted">
                  These orders were out-of-stock in local vault AND the router API, so they were automatically routed to merchant desks for manual retail purchase.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 shrink-0">
              {forwardedOrders.length} Pending Actions
            </span>
          </div>

          <div className="rounded-2xl border border-nx-border bg-nx-surface overflow-hidden">
            {forwardedOrders.length === 0 ? (
              <div className="p-12 text-center text-nx-muted">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-2 opacity-80" />
                <p className="text-sm font-semibold text-nx-text">Zero Pending Forwarded Orders</p>
                <p className="text-xs text-nx-muted mt-0.5">All customer gift card requests fulfilled via Tier 1 or Tier 2.</p>
              </div>
            ) : (
              <div className="divide-y divide-nx-border">
                {forwardedOrders.map((ord) => (
                  <div key={ord.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-nx-border/20 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-400 text-sm">{ord.id}</span>
                        <span className="font-bold text-nx-text text-sm">{ord.brand}</span>
                        <span className="rounded-full bg-amber-500/10 text-amber-400 px-2 py-0.5 text-xs font-semibold border border-amber-500/20">
                          ₹{ord.denominationInr.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-xs text-nx-muted">
                        Buyer: <strong className="text-nx-text">{ord.buyerName}</strong> | Value: ${ord.usdtAmount} USDT | Ordered: {ord.orderedAt}
                      </p>
                      <p className="text-xs text-amber-400 font-medium">
                        Assigned OTC Desk: {ord.merchantAssigned}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedForwardedOrder(ord)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-sm"
                      >
                        Enter Code & Fulfill
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: 3-TIER DISPATCH SIMULATOR (TEST BENCH)
          ========================================================================= */}
      {activeTab === 'SIMULATOR' && (
        <div className="rounded-2xl border border-nx-border bg-nx-surface p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-nx-text">Interactive 3-Tier Order Dispatch Simulator</h2>
            </div>
            <p className="text-xs text-nx-muted mt-0.5">
              Simulate an incoming gift card order and observe live routing decisions through In-House Vault, API Router, and Merchant Desk.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-nx-muted uppercase">Select Brand</label>
              <select
                value={simBrand}
                onChange={(e) => setSimBrand(e.target.value)}
                className="w-full rounded-xl border border-nx-border bg-nx-base px-3.5 py-2.5 text-sm font-semibold text-nx-text focus:border-emerald-500 focus:outline-none"
              >
                {['Amazon Pay', 'Flipkart', 'Google Play', 'Swiggy', 'Steam Wallet', 'Apple Store', 'Zomato Pro', 'BookMyShow'].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-nx-muted uppercase">Face Value (INR)</label>
              <select
                value={simDenom}
                onChange={(e) => setSimDenom(Number(e.target.value))}
                className="w-full rounded-xl border border-nx-border bg-nx-base px-3.5 py-2.5 text-sm font-semibold text-nx-text focus:border-emerald-500 focus:outline-none"
              >
                {[250, 500, 1000, 2000, 5000].map((v) => (
                  <option key={v} value={v}>₹{v.toLocaleString('en-IN')}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={runSimulation}
                disabled={isSimulating}
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <Zap className={cn('h-4 w-4', isSimulating && 'animate-spin')} />
                {isSimulating ? 'Executing Routing Logic...' : 'Simulate Order Placement'}
              </button>
            </div>
          </div>

          {/* Simulation Output Card */}
          {simResult && (
            <div className="p-5 rounded-xl border border-emerald-500/40 bg-nx-base space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Routing Outcome: {simResult.tier}
                </span>
                <span className="text-xs font-mono text-nx-muted">Order ID: {simResult.orderId}</span>
              </div>

              <p className="text-sm text-nx-text font-medium">{simResult.message}</p>

              {simResult.code && (
                <div className="p-3.5 rounded-xl bg-nx-surface border border-nx-border font-mono text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-nx-muted">Issued Code:</span>
                    <span className="text-emerald-400 font-bold">{simResult.code}</span>
                  </div>
                  {simResult.pin && (
                    <div className="flex justify-between">
                      <span className="text-nx-muted">Security PIN:</span>
                      <span className="text-nx-text font-bold">{simResult.pin}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 5: ORDER ROUTE TRACE LOGS
          ========================================================================= */}
      {activeTab === 'LOGS' && (
        <div className="rounded-2xl border border-nx-border bg-nx-surface overflow-hidden">
          <div className="border-b border-nx-border px-6 py-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-nx-text">Voucher Routing Lifecycle History</h2>
            <span className="text-xs text-nx-muted">{giftCardRouteLogs.length} orders logged</span>
          </div>

          <div className="divide-y divide-nx-border">
            {giftCardRouteLogs.map((log) => (
              <div key={log.id} className="p-5 space-y-3 hover:bg-nx-border/20 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400 text-xs">{log.id}</span>
                    <span className="font-bold text-nx-text text-sm">{log.brand}</span>
                    <span className="font-mono text-xs text-nx-muted">₹{log.denominationInr} (${log.usdtAmount} USDT)</span>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold border',
                      log.fulfillmentTier === 'TIER_1_LOCAL_INVENTORY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      log.fulfillmentTier === 'TIER_2_ROUTER_API' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    )}>
                      {log.fulfillmentTier}
                    </span>
                  </div>
                  <span className="text-xs text-nx-muted">{log.orderedAt} by {log.buyerName}</span>
                </div>

                {/* Stepper Trace */}
                <div className="space-y-1.5 pl-2 border-l-2 border-nx-border text-xs">
                  {log.routeTrace.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className={cn(
                        'font-mono font-bold text-[10px] px-1.5 py-0.2 rounded mt-0.5',
                        step.status === 'HIT' || step.status === 'FULFILLED' ? 'bg-emerald-500/20 text-emerald-400' :
                        step.status === 'MISS' ? 'bg-rose-500/20 text-rose-400' :
                        'bg-amber-500/20 text-amber-400'
                      )}>
                        {step.status}
                      </span>
                      <span className="text-nx-muted leading-relaxed">
                        <strong className="text-nx-text">{step.stage}:</strong> {step.note}
                      </span>
                    </div>
                  ))}
                </div>

                {log.voucherCode && (
                  <div className="p-2.5 rounded-xl bg-nx-base font-mono text-xs flex items-center justify-between">
                    <span>Delivered Code: <strong className="text-emerald-400">{log.voucherCode}</strong></span>
                    {log.voucherPin && <span>PIN: <strong>{log.voucherPin}</strong></span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD VOUCHER MODAL
          ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleAddSubmit} className="w-full max-w-md rounded-2xl border border-nx-border bg-nx-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-nx-text">Add Voucher to In-House Vault</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-nx-muted hover:text-nx-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-nx-muted uppercase">Brand Name</label>
                <select
                  value={newCard.brand}
                  onChange={(e) => setNewCard({ ...newCard, brand: e.target.value })}
                  className="w-full rounded-xl border border-nx-border bg-nx-base px-3 py-2 text-sm text-nx-text focus:outline-none"
                >
                  {['Amazon Pay', 'Flipkart', 'Google Play', 'Swiggy', 'Steam Wallet', 'Apple Store', 'Zomato Pro', 'BookMyShow'].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-nx-muted uppercase">Denomination (INR)</label>
                <select
                  value={newCard.denominationInr}
                  onChange={(e) => setNewCard({ ...newCard, denominationInr: Number(e.target.value) })}
                  className="w-full rounded-xl border border-nx-border bg-nx-base px-3 py-2 text-sm text-nx-text focus:outline-none"
                >
                  {[250, 500, 1000, 2000, 5000].map((v) => (
                    <option key={v} value={v}>₹{v.toLocaleString('en-IN')}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-nx-muted uppercase">Voucher Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AMZN-8921-9923-LK91"
                  value={newCard.code}
                  onChange={(e) => setNewCard({ ...newCard, code: e.target.value })}
                  className="w-full rounded-xl border border-nx-border bg-nx-base px-3 py-2 font-mono text-sm text-nx-text focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-nx-muted uppercase">Security PIN (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 8829"
                  value={newCard.pin}
                  onChange={(e) => setNewCard({ ...newCard, pin: e.target.value })}
                  className="w-full rounded-xl border border-nx-border bg-nx-base px-3 py-2 font-mono text-sm text-nx-text focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-nx-muted uppercase">Expiry Date</label>
                <input
                  type="text"
                  value={newCard.expiryDate}
                  onChange={(e) => setNewCard({ ...newCard, expiryDate: e.target.value })}
                  className="w-full rounded-xl border border-nx-border bg-nx-base px-3 py-2 text-sm text-nx-text focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl border border-nx-border px-4 py-2 text-xs font-semibold text-nx-muted hover:text-nx-text"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm"
              >
                Save to Vault
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MANUAL FULFILL FORWARDED ORDER MODAL
          ========================================================================= */}
      {selectedForwardedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleManualFulfill} className="w-full max-w-md rounded-2xl border border-nx-border bg-nx-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-400">{selectedForwardedOrder.id}</span>
                <h3 className="text-base font-bold text-nx-text">Manual Procurement Dispatch</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForwardedOrder(null)}
                className="text-nx-muted hover:text-nx-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-nx-muted">
              Enter the purchased retail voucher details for <strong>{selectedForwardedOrder.brand} (₹{selectedForwardedOrder.denominationInr})</strong> ordered by {selectedForwardedOrder.buyerName}.
            </p>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-nx-muted uppercase">Purchased Voucher Code</label>
                <input
                  type="text"
                  required
                  placeholder="Enter 16-digit code"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full rounded-xl border border-nx-border bg-nx-base px-3 py-2 font-mono text-sm text-nx-text focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-nx-muted uppercase">Voucher PIN</label>
                <input
                  type="text"
                  placeholder="e.g. 1029"
                  value={manualPin}
                  onChange={(e) => setManualPin(e.target.value)}
                  className="w-full rounded-xl border border-nx-border bg-nx-base px-3 py-2 font-mono text-sm text-nx-text focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedForwardedOrder(null)}
                className="rounded-xl border border-nx-border px-4 py-2 text-xs font-semibold text-nx-muted hover:text-nx-text"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm"
              >
                Confirm & Dispatch
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

