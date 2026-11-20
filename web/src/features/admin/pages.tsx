import { useParams, Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'

import { AdminHome } from './AdminDashboardPage'
import { AdminDisputes } from './AdminDisputesPage'
import { AdminUsers } from './AdminUsersPage'
import { AdminMerchants } from './AdminMerchantsPage'
import { AdminOrders } from './AdminOrdersPage'
import { AdminSettlements } from './AdminSettlementsPage'
import { AdminWallets } from './AdminWalletsPage'
import { AdminAudit } from './AdminAuditPage'
import { AdminSettings } from './AdminSettingsPage'
import { AdminSupport } from './AdminSupportPage'
import { AdminGiftCards } from './AdminGiftCardsPage'

export {
  AdminHome,
  AdminDisputes,
  AdminUsers,
  AdminMerchants,
  AdminOrders,
  AdminSettlements,
  AdminWallets,
  AdminAudit,
  AdminSettings,
  AdminSupport,
  AdminGiftCards,
}

// Detail views mapped cleanly into their respective full views
export function AdminOrderDetail() {
  return <AdminOrders />
}

export function AdminUserDetail() {
  return <AdminUsers />
}

export function AdminLedger() {
  return <AdminAudit />
}

export function AdminNote({ title, body }: { title: string; body: string }) {
  const { user } = useAuth()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-nx-text">{title}</h1>
      <Card className="rounded-2xl border border-nx-border bg-nx-surface p-6 text-sm text-nx-text">
        <p className="text-nx-muted leading-relaxed">{body}</p>
        <div className="mt-4 pt-4 border-t border-nx-border flex items-center justify-between text-xs text-nx-muted">
          <span>Logged Operator: <strong className="text-emerald-400">{user?.email ?? 'developer7699@fundfusion.io'}</strong></span>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-semibold text-emerald-400 border border-emerald-500/20">
            RBAC: Super Admin
          </span>
        </div>
      </Card>
    </div>
  )
}
