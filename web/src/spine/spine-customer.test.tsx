import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SpineCustomer } from './SpineCustomer'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

const QUOTE = {
  id: 'q-1',
  side: 'SELL' as const,
  usdtAmount: '100.000000000000000000',
  inrAmount: '9700.00',
  customerRate: '97.00',
  platformFeeUsdt: '3.000000000000000000',
  expiresAt: '2026-11-21T09:05:00Z',
}

const ORDER = {
  orderId: 'o-1',
  status: 'AWAITING_MERCHANT',
  side: 'SELL' as const,
  usdtAmount: QUOTE.usdtAmount,
  inrAmount: QUOTE.inrAmount,
  customerRate: QUOTE.customerRate,
  platformFeeUsdt: QUOTE.platformFeeUsdt,
  role: 'CUSTOMER' as const,
  utr: null,
}

function server(over: Record<string, unknown> = {}) {
  return vi.fn((url: string, _init?: RequestInit) => {
    const path = String(url)
    if (path.endsWith('/wallet/balances')) {
      return jsonResponse({ success: true, data: { AVAILABLE: '500.000000000000000000', LOCKED: '0.000000000000000000' } })
    }
    if (path.endsWith('/wallet/address')) {
      return jsonResponse({ success: true, data: { address: '0xDEADBEEF00000000000000000000000000000000' } })
    }
    if (path.endsWith('/p2p/quotes')) {
      return jsonResponse({ success: true, data: QUOTE })
    }
    if (path.endsWith('/p2p/orders')) {
      return jsonResponse({ success: true, data: { id: 'o-1' } })
    }
    if (/\/p2p\/orders\/o-1$/.test(path)) {
      return jsonResponse({ success: true, data: { ...ORDER, ...over } })
    }
    return jsonResponse({ success: true, data: {} })
  })
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('the customer path (PRD §6)', () => {
  it('shows the balance it was given, to the full scale', async () => {
    vi.stubGlobal('fetch', server())

    render(<SpineCustomer />)

    expect(await screen.findByLabelText('AVAILABLE balance')).toHaveTextContent(
      '500.000000000000000000',
    )
  })

  it('shows the deposit address on request', async () => {
    vi.stubGlobal('fetch', server())
    const user = userEvent.setup()

    render(<SpineCustomer />)
    await user.click(screen.getByRole('button', { name: /deposit address/i }))

    expect(await screen.findByLabelText('Deposit address')).toHaveTextContent(
      '0xDEADBEEF00000000000000000000000000000000',
    )
  })

  /**
   * The snapshot is law. Both sides are shown exactly as the server priced
   * them, before the customer agrees to anything.
   */
  it('shows both sides of the snapshot before confirming', async () => {
    vi.stubGlobal('fetch', server())
    const user = userEvent.setup()

    render(<SpineCustomer />)
    await user.click(screen.getByRole('button', { name: 'Get a price' }))

    expect(await screen.findByLabelText('Quoted rate')).toHaveTextContent('97.00')
    expect(screen.getByLabelText('Quoted usdt')).toHaveTextContent(
      '100.000000000000000000',
    )
    expect(screen.getByLabelText('Quoted inr')).toHaveTextContent('9700.00')
    expect(screen.getByLabelText('Quoted fee')).toHaveTextContent(
      '3.000000000000000000',
    )
  })

  it('sends an Idempotency-Key when confirming', async () => {
    const fetchMock = server()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<SpineCustomer />)
    await user.click(screen.getByRole('button', { name: 'Get a price' }))
    await user.click(await screen.findByRole('button', { name: /Confirm this order/ }))

    await waitFor(() => {
      const confirm = fetchMock.mock.calls.find(
        (c) => String(c[0]).endsWith('/p2p/orders') && (c[1] as RequestInit)?.method === 'POST',
      )
      expect(confirm).toBeDefined()
      const headers = (confirm![1] as RequestInit).headers as Headers
      expect(headers.get('Idempotency-Key')).toBeTruthy()
    })
  })

  /** The rate on the order is the one the snapshot carried, not a new one. */
  it('shows the order against its snapshot rate', async () => {
    vi.stubGlobal('fetch', server())
    const user = userEvent.setup()

    render(<SpineCustomer />)
    await user.click(screen.getByRole('button', { name: 'Get a price' }))
    await user.click(await screen.findByRole('button', { name: /Confirm this order/ }))

    expect(await screen.findByLabelText('Order rate')).toHaveTextContent('97.00')
  })

  /** PRD §6.6 — a screen that offers an impossible action invites a 409. */
  it('offers no settlement action while the order is still unmatched', async () => {
    vi.stubGlobal('fetch', server())
    const user = userEvent.setup()

    render(<SpineCustomer />)
    await user.click(screen.getByRole('button', { name: 'Get a price' }))
    await user.click(await screen.findByRole('button', { name: /Confirm this order/ }))
    await screen.findByLabelText('Order status')

    expect(screen.queryByRole('button', { name: /rupees arrived/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /I have paid/i })).toBeNull()
  })

  it('offers the receipt confirmation on a sell once payment is submitted', async () => {
    vi.stubGlobal('fetch', server({ status: 'PAYMENT_SUBMITTED', utr: 'UTR-1' }))
    const user = userEvent.setup()

    render(<SpineCustomer />)
    await user.click(screen.getByRole('button', { name: 'Get a price' }))
    await user.click(await screen.findByRole('button', { name: /Confirm this order/ }))

    expect(
      await screen.findByRole('button', { name: /rupees arrived/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Payment reference')).toHaveTextContent('UTR-1')
  })

  it('shows the reason the server refused', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        jsonResponse(
          { success: false, error: { code: 'X', message: 'That quote has expired. Ask for a fresh price.' } },
          400,
        ),
      ),
    )
    const user = userEvent.setup()

    render(<SpineCustomer />)
    await user.click(screen.getByRole('button', { name: 'Get a price' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/expired/)
  })
})
