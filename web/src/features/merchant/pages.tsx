export { MerchantHome } from './MerchantDashboardPage'
export { MerchantAvailable } from './MerchantAvailablePage'
export { MerchantOrders } from './MerchantOrdersPage'
export { MerchantOrderDetail } from './MerchantOrderDetailPage'
export { MerchantWallet } from './MerchantWalletPage'
export { MerchantEarnings } from './MerchantEarningsPage'
export { MerchantProfile } from './MerchantProfilePage'
export { MerchantPaymentMethods } from './MerchantPaymentMethodsPage'
export { MerchantNotices } from './MerchantNoticesPage'

// Legacy fallback component
export function MerchantNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="p-4 space-y-2">
      <h1 className="text-lg font-black text-slate-900 dark:text-white">{title}</h1>
      <p className="text-xs text-slate-500">{body}</p>
    </div>
  )
}
