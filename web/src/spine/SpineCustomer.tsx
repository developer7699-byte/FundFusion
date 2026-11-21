import { useCallback, useEffect, useState } from 'react'
import { newIdempotencyKey, v1 } from './api'

interface Quote {
  id: string
  side: 'BUY' | 'SELL'
  usdtAmount: string
  inrAmount: string
  customerRate: string
  platformFeeUsdt: string
  expiresAt: string
}

interface OrderDetail {
  orderId: string
  status: string
  side: 'BUY' | 'SELL'
  usdtAmount: string
  inrAmount: string
  customerRate: string
  platformFeeUsdt: string
  role: 'CUSTOMER' | 'MERCHANT'
  utr: string | null
}

type Balances = Record<string, string>

/**
 * The customer path (PRD §6).
 *
 * Every figure shown comes from the snapshot the server returned. Nothing
 * here recomputes a price or a fee: the client is a display, and a value it
 * calculated would be a second answer to a question the ledger has already
 * answered (PRD §13.5).
 */
export function SpineCustomer() {
  const [balances, setBalances] = useState<Balances | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [side, setSide] = useState<'BUY' | 'SELL'>('SELL')
  const [amount, setAmount] = useState('100')
  const [quote, setQuote] = useState<Quote | null>(null)
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

  const refreshBalances = useCallback(
    () =>
      run(async () => {
        setBalances(await v1<Balances>('/wallet/balances'))
      }),
    [run],
  )

  useEffect(() => {
    void refreshBalances()
  }, [refreshBalances])

  const showAddress = () =>
    run(async () => {
      const got = await v1<{ address: string }>('/wallet/address')
      setAddress(got.address)
    })

  const priceIt = () =>
    run(async () => {
      setOrder(null)
      setQuote(
        await v1<Quote>('/p2p/quotes', {
          method: 'POST',
          body: JSON.stringify({ side, usdtAmount: amount }),
        }),
      )
    })

  const confirmQuote = () =>
    run(async () => {
      if (!quote) return
      const placed = await v1<{ id: string }>('/p2p/orders', {
        method: 'POST',
        // A fresh key per confirmation: this request, retried, is safe.
        idempotencyKey: newIdempotencyKey(),
        body: JSON.stringify({ quoteId: quote.id }),
      })
      setQuote(null)
      setOrder(await v1<OrderDetail>(`/p2p/orders/${placed.id}`))
      await refreshBalances()
    })

  const refreshOrder = () =>
    run(async () => {
      if (!order) return
      setOrder(await v1<OrderDetail>(`/p2p/orders/${order.orderId}`))
      await refreshBalances()
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
      await refreshBalances()
    })

  return (
    <section>
      <h2>Customer</h2>
      {error && <p role="alert">{error}</p>}

      <h3>Balance</h3>
      {balances && (
        <dl>
          {Object.entries(balances).map(([bucket, value]) => (
            <div key={bucket}>
              <dt>{bucket}</dt>
              <dd aria-label={`${bucket} balance`}>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <button onClick={showAddress} disabled={busy}>
        Show my deposit address
      </button>
      {address && <code aria-label="Deposit address">{address}</code>}

      <h3>New order</h3>
      <label>
        Side
        <select
          aria-label="Side"
          value={side}
          onChange={(e) => setSide(e.target.value as 'BUY' | 'SELL')}
        >
          <option value="SELL">Sell USDT</option>
          <option value="BUY">Buy USDT</option>
        </select>
      </label>
      <label>
        USDT amount
        <input
          aria-label="USDT amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <button onClick={priceIt} disabled={busy}>
        Get a price
      </button>

      {quote && (
        <div>
          {/* The snapshot, shown whole before it is agreed to. */}
          <h4>This price</h4>
          <p aria-label="Quoted rate">{quote.customerRate}</p>
          <p aria-label="Quoted usdt">{quote.usdtAmount}</p>
          <p aria-label="Quoted inr">{quote.inrAmount}</p>
          <p aria-label="Quoted fee">{quote.platformFeeUsdt}</p>
          <button onClick={confirmQuote} disabled={busy}>
            Confirm this order
          </button>
        </div>
      )}

      {order && (
        <div>
          <h4>Order</h4>
          <p aria-label="Order status">{order.status}</p>
          <p aria-label="Order rate">{order.customerRate}</p>
          {order.utr && <p aria-label="Payment reference">{order.utr}</p>}
          <button onClick={refreshOrder} disabled={busy}>
            Refresh
          </button>

          {/* One action, and only the one this state allows (PRD §6.6). */}
          {order.side === 'BUY' && order.status === 'ACCEPTED' && (
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
          {order.side === 'SELL' && order.status === 'PAYMENT_SUBMITTED' && (
            <button onClick={confirmReceipt} disabled={busy}>
              The rupees arrived
            </button>
          )}
        </div>
      )}
    </section>
  )
}
