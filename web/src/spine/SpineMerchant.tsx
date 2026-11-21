import { useCallback, useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { newIdempotencyKey, TOKEN_KEY, v1 } from './api'

interface FeedOrder {
  orderId: string
  side: 'BUY' | 'SELL'
  usdtAmount: string
  inrAmount: string
  customerRate: string
  obligationUsdt: string
}

interface OrderDetail {
  orderId: string
  status: string
  side: 'BUY' | 'SELL'
  usdtAmount: string
  inrAmount: string
  customerRate: string
  role: 'CUSTOMER' | 'MERCHANT'
  utr: string | null
}

/**
 * The merchant path (PRD §6.7, §11).
 *
 * The socket is a prompt, not a source: it says an order exists, and the
 * feed is then re-read. That keeps one authority for what a merchant may
 * accept — the obligation and the window are per-merchant and derived from
 * settings, so a payload shared by every merchant could not carry them
 * truthfully.
 */
export function SpineMerchant() {
  const [feed, setFeed] = useState<FeedOrder[]>([])
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [utr, setUtr] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await work()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work.')
    } finally {
      setBusy(false)
    }
  }, [])

  const refreshFeed = useCallback(
    () =>
      run(async () => {
        setFeed(await v1<FeedOrder[]>('/p2p/merchant/feed'))
      }),
    [run],
  )

  useEffect(() => {
    void refreshFeed()
  }, [refreshFeed])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return

    let socket: Socket
    try {
      socket = io('/p2p', { auth: { token } })
    } catch {
      // No live feed is a slower desk, not a broken one.
      return
    }
    socket.on('order.broadcast', () => {
      void refreshFeed()
    })
    return () => {
      socket.close()
    }
  }, [refreshFeed])

  const accept = (orderId: string) =>
    run(async () => {
      await v1(`/p2p/orders/${orderId}/accept`, {
        method: 'POST',
        idempotencyKey: newIdempotencyKey(),
      })
      setOrder(await v1<OrderDetail>(`/p2p/orders/${orderId}`))
      await refreshFeed()
    })

  const refreshOrder = () =>
    run(async () => {
      if (!order) return
      setOrder(await v1<OrderDetail>(`/p2p/orders/${order.orderId}`))
    })

  const submitUtr = () =>
    run(async () => {
      if (!order) return
      await v1(`/p2p/orders/${order.orderId}/utr`, {
        method: 'POST',
        body: JSON.stringify({ utr }),
      })
      setUtr('')
      setOrder(await v1<OrderDetail>(`/p2p/orders/${order.orderId}`))
    })

  const confirmReceipt = () =>
    run(async () => {
      if (!order) return
      await v1(`/p2p/orders/${order.orderId}/confirm`, {
        method: 'POST',
        idempotencyKey: newIdempotencyKey(),
      })
      setOrder(await v1<OrderDetail>(`/p2p/orders/${order.orderId}`))
    })

  return (
    <section>
      <h2>Merchant</h2>
      {error && <p role="alert">{error}</p>}

      <h3>Available orders</h3>
      <button onClick={refreshFeed} disabled={busy}>
        Refresh feed
      </button>
      {feed.length === 0 && <p>Nothing available right now.</p>}
      <ul>
        {feed.map((o) => (
          <li key={o.orderId} aria-label={`Order ${o.orderId}`}>
            <span aria-label={`Side ${o.orderId}`}>{o.side}</span>
            <span aria-label={`Amount ${o.orderId}`}>{o.usdtAmount}</span>
            <span aria-label={`Rupees ${o.orderId}`}>{o.inrAmount}</span>
            {/* What this merchant would bond — the figure that decides it. */}
            <span aria-label={`Obligation ${o.orderId}`}>
              {o.obligationUsdt}
            </span>
            <button onClick={() => accept(o.orderId)} disabled={busy}>
              Accept {o.orderId}
            </button>
          </li>
        ))}
      </ul>

      {order && (
        <div>
          <h3>My order</h3>
          <p aria-label="Order status">{order.status}</p>
          {order.utr && <p aria-label="Payment reference">{order.utr}</p>}
          <button onClick={refreshOrder} disabled={busy}>
            Refresh
          </button>

          {order.side === 'SELL' && order.status === 'ACCEPTED' && (
            <>
              <label>
                Payment reference
                <input
                  aria-label="Payment reference input"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                />
              </label>
              <button onClick={submitUtr} disabled={busy}>
                I have paid
              </button>
            </>
          )}
          {order.side === 'BUY' && order.status === 'PAYMENT_SUBMITTED' && (
            <button onClick={confirmReceipt} disabled={busy}>
              The rupees arrived
            </button>
          )}
        </div>
      )}
    </section>
  )
}
