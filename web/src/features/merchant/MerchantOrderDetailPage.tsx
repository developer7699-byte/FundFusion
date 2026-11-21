import { OrderDetail } from '@/features/customer/ops-pages'

/**
 * The merchant's view of one order. Identical to the customer's, because an
 * order has one state machine and one allowed action per party (PRD §6.6,
 * §6.8) — only the way back differs.
 */
export function MerchantOrderDetail() {
  return <OrderDetail backTo="/merchant/orders" />
}
