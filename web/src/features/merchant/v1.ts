import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { newIdempotencyKey, v1 } from '@/lib/api'
import {
  connectBroadcast,
  disconnectBroadcast,
  ORDER_BROADCAST,
} from '@/lib/order-broadcast'

/** `GET /v1/p2p/merchant/feed` (PRD §6.7). Every figure is a string. */
export interface FeedOrder {
  orderId: string
  side: 'BUY' | 'SELL'
  usdtAmount: string
  inrAmount: string
  customerRate: string
  platformFeeUsdt: string
  broadcastAt: string
  expiresAt: string
  /** What this merchant bonds or locks to take it (PRD §6.5). */
  obligationUsdt: string
}

export interface MerchantDesk {
  id: string
  deskName: string
  status: string
  buyEnabled: boolean
  sellEnabled: boolean
}

export interface MerchantOrder {
  orderId: string
  status: string
  side: 'BUY' | 'SELL'
  usdtAmount: string
  inrAmount: string
  customerRate: string
  platformFeeUsdt: string
  role: 'CUSTOMER' | 'MERCHANT'
  merchantUserId: string | null
  utr: string | null
  broadcastAt: string | null
  updatedAt: string
}

export function useDesk() {
  return useQuery({
    queryKey: ['merchant', 'desk'],
    queryFn: () => v1<MerchantDesk | null>('/p2p/merchant/desk'),
    retry: false,
  })
}

export async function openDesk(deskName: string): Promise<MerchantDesk> {
  return v1<MerchantDesk>('/p2p/merchant/desk', {
    method: 'POST',
    body: JSON.stringify({ deskName }),
  })
}

/**
 * What this merchant may accept right now, kept live by the broadcast.
 *
 * The feed is refetched on the event rather than appended to from its
 * payload: an order in the payload that this merchant is not eligible for —
 * their own, or one their balance cannot cover — would be listed and then
 * refused, which costs them a lost race and costs us their trust in the
 * queue. The server decides what is offered.
 */
export function useFeed() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['merchant', 'feed'],
    queryFn: () => v1<FeedOrder[]>('/p2p/merchant/feed'),
    retry: false,
  })

  useEffect(() => {
    connectBroadcast()
    const refetch = () => {
      void qc.invalidateQueries({ queryKey: ['merchant', 'feed'] })
    }
    window.addEventListener(ORDER_BROADCAST, refetch)
    return () => {
      window.removeEventListener(ORDER_BROADCAST, refetch)
      disconnectBroadcast()
    }
  }, [qc])

  return query
}

export function useMerchantOrders() {
  return useQuery({
    queryKey: ['merchant', 'orders'],
    queryFn: () => v1<MerchantOrder[]>('/p2p/orders'),
    retry: false,
  })
}

/** Losing the race is a 409, and the engine is the only thing that decides. */
export async function acceptOrder(orderId: string): Promise<void> {
  await v1(`/p2p/orders/${orderId}/accept`, {
    method: 'POST',
    idempotencyKey: newIdempotencyKey(),
  })
}
