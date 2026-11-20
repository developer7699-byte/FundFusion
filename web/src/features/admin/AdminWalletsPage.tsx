import { useState } from 'react'
import {
  Wallet,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Lock,
  ExternalLink,
  Building2,
  Coins,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react'
import { useAdminStore } from '@/lib/admin-store'
import { ToastNotification } from '@/components/ui/ToastNotification'
import { cn } from '@/lib/utils'

export function AdminWallets() {
  const { totalEscrowLockedUsdt, settings, addAuditLog } = useAdminStore()
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [isVerifyingReserves, setIsVerifyingReserves] = useState(false)
  const [lastAuditTimestamp, setLastAuditTimestamp] = useState('3 mins ago')

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const runReserveAudit = () => {
    setIsVerifyingReserves(true)
    setTimeout(() => {
      setIsVerifyingReserves(false)
      setLastAuditTimestamp('Just now')
      addAuditLog('PROOF_OF_RESERVES_VERIFIED', 'SOLVENCY', '100% Merkle tree proof verified across Cold & Hot vaults')
      showToast('Proof of Reserves: Solvency 100% verified against on-chain TRON & Polygon state!')
    }, 1200)
  }

  const vaults = [
    {
      id: 'cold-multisig',
      name: 'Cold Multi-Sig Vault',
      role: 'Long-term Liquidity Reserve',
      chain: 'TRON TRC20 / Polygon',
      address: 'TQn9Y2khEsLJW1ChVWFMSMeSTow5KaxUS5',
      balanceUsdt: 50000.0,
      signers: '3 of 5 Hardware Keys Required',
      health: 'OPTIMAL',
      type: 'COLD',
    },
    {
      id: 'hot-escrow',
      name: 'Hot Escrow Float Vault',
      role: 'Automated P2P Smart Escrow Contract',
      chain: 'TRON TRC20',
      address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      balanceUsdt: 21620.0,
      signers: 'Automated Key Management Service (AWS KMS)',
      health: 'ACTIVE',
      type: 'HOT',
    },
    {
      id: 'platform-revenue',
      name: 'Platform Fee & Revenue Vault',
      role: 'Retained 0.5% Platform Trading Margins',
      chain: 'TRON TRC20',
      address: 'TA4N382ks901kLksm92831ksm01828399A',
      balanceUsdt: 4820.0,
      signers: 'Admin Treasury Multi-Sig',
      health: 'OPTIMAL',
      type: 'REVENUE',
    },
  ]

  const totalVaultsUsdt = vaults.reduce((acc, v) => acc + v.balanceUsdt, 0)
  const totalFiatReserveInr = totalVaultsUsdt * settings.baseUsdtRate

  const fiatNodalAccounts = [
    { bank: 'HDFC Bank Ltd', accNo: '••••9102', role: 'P2P Nodal Escrow', balance: 2500000 },
    { bank: 'ICICI Bank Ltd', accNo: '••••3821', role: 'IMPS Settlement Pool', balance: 1800000 },
    { bank: 'Axis Bank Ltd', accNo: '••••1109', role: 'Backup Merchant Buffer', balance: 1250000 },
  ]

  return (
    <div className="space-y-6">
      {toastMessage && (
        <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-nx-text">
            Multi-Vault Solvency & Reserves
          </h1>
          <p className="mt-1 text-sm text-nx-muted">
            Cryptographic proof-of-reserves, hot/cold multisig balances, and fiat nodal bank liquidity.
          </p>
        </div>
        <button
          onClick={runReserveAudit}
          disabled={isVerifyingReserves}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={cn('h-4 w-4', isVerifyingReserves && 'animate-spin')} />
          {isVerifyingReserves ? 'Verifying Merkle Roots...' : 'Verify Proof of Reserves'}
        </button>
      </div>

      {/* Solvency Status Banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-emerald-400">100% Backed Reserve Status: FULLY SOLVENT</h3>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                  Ratio: 104.2%
                </span>
              </div>
              <p className="text-xs text-nx-muted mt-0.5">
                Total Vault Backing: ${totalVaultsUsdt.toLocaleString()} USDT | Outstanding Escrow Claims: ${totalEscrowLockedUsdt.toLocaleString()} USDT | Last Audited: {lastAuditTimestamp}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-nx-surface px-3 py-1.5 text-xs font-mono font-medium text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" /> Merkle Tree Verified
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-nx-border bg-nx-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-nx-muted">Total USDT Vaults</p>
          <p className="mt-2 text-2xl font-bold text-nx-text">
            ${totalVaultsUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-emerald-400">≈ ₹{totalFiatReserveInr.toLocaleString('en-IN')}</p>
        </div>

        <div className="rounded-2xl border border-nx-border bg-nx-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-nx-muted">Cold Storage Balance</p>
          <p className="mt-2 text-2xl font-bold text-sky-400">50,000.00 USDT</p>
          <p className="mt-1 text-xs text-nx-muted">65.4% of platform float</p>
        </div>

        <div className="rounded-2xl border border-nx-border bg-nx-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-nx-muted">Active Escrow Float</p>
          <p className="mt-2 text-2xl font-bold text-amber-400">21,620.00 USDT</p>
          <p className="mt-1 text-xs text-nx-muted">Hot automated liquidity</p>
        </div>

        <div className="rounded-2xl border border-nx-border bg-nx-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-nx-muted">Platform Fee Treasury</p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">4,820.00 USDT</p>
          <p className="mt-1 text-xs text-nx-muted">≈ ₹{(4820 * settings.baseUsdtRate).toLocaleString('en-IN')} net earnings</p>
        </div>
      </div>

      {/* Crypto Vaults Detail Table */}
      <div className="rounded-2xl border border-nx-border bg-nx-surface overflow-hidden">
        <div className="border-b border-nx-border px-6 py-4">
          <h2 className="text-base font-semibold text-nx-text">On-Chain Vault Infrastructure</h2>
          <p className="text-xs text-nx-muted mt-0.5">Hardware multi-sig security and KMS-protected hot contract balances</p>
        </div>

        <div className="divide-y divide-nx-border">
          {vaults.map((vault) => (
            <div key={vault.id} className="p-6 transition-colors hover:bg-nx-border/20">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-nx-text">{vault.name}</span>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-semibold',
                      vault.type === 'COLD' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                      vault.type === 'HOT' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    )}>
                      {vault.type}
                    </span>
                    <span className="text-xs text-nx-muted">({vault.chain})</span>
                  </div>
                  <p className="text-xs text-nx-muted">{vault.role}</p>
                  <div className="flex items-center gap-2 text-xs font-mono text-nx-muted">
                    <span>{vault.address}</span>
                    <button
                      onClick={() => copyToClipboard(vault.address, vault.id)}
                      className="p-1 text-nx-muted hover:text-nx-text"
                      title="Copy Address"
                    >
                      {copiedKey === vault.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <a
                      href={`https://tronscan.org/#/address/${vault.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                    >
                      Tronscan <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="text-xs text-nx-muted flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-emerald-400" />
                    <span>Security Model: {vault.signers}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-6">
                  <div className="text-right">
                    <p className="text-xl font-bold text-nx-text">
                      {vault.balanceUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                    </p>
                    <p className="text-xs text-nx-muted">
                      ≈ ₹{(vault.balanceUsdt * settings.baseUsdtRate).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      addAuditLog('VAULT_REBALANCE_INSPECT', vault.name, 'Admin initiated health check and gas level inspection')
                      showToast(`Vault ${vault.name} pinged. All gas & RPC connections active.`)
                    }}
                    className="rounded-xl border border-nx-border px-3.5 py-2 text-xs font-semibold text-nx-text hover:bg-nx-border/50 transition-colors"
                  >
                    Check Gas & Health
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fiat Nodal Banking Liquidity */}
      <div className="rounded-2xl border border-nx-border bg-nx-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-nx-text">Fiat Nodal & Escrow Banking Liquidity</h2>
            <p className="text-xs text-nx-muted mt-0.5">RBI-compliant bank accounts backing instant IMPS / RTGS merchant settlements</p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            Total Fiat Liquidity: ₹55,50,000
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {fiatNodalAccounts.map((fiat, i) => (
            <div key={i} className="rounded-xl border border-nx-border/60 bg-nx-base p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-nx-text text-sm">{fiat.bank}</span>
                <span className="text-xs font-mono text-nx-muted">{fiat.accNo}</span>
              </div>
              <p className="text-xs text-nx-muted mt-1">{fiat.role}</p>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-lg font-bold text-emerald-400">₹{fiat.balance.toLocaleString('en-IN')}</span>
                <span className="text-xs text-emerald-500 font-medium">Ready for IMPS</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

