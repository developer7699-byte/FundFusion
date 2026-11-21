import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TOKEN_KEY } from './api'

/** A socket we can fire events on, standing in for the live feed. */
const handlers: Record<string, (payload: unknown) => void> = {}
const socketStub = {
  on: (event: string, fn: (payload: unknown) => void) => {
    handlers[event] = fn
  },
  close: vi.fn(),
}
vi.mock('socket.io-client', () => ({
  io: () => socketStub,
}))

const { SpineMerchant } = await import('./SpineMerchant')

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

const FEED = [
  {
    orderId: 'o-1',
    side: 'SELL',
    usdtAmount: '100.000000000000000000',
    inrAmount: '9700.00',
    customerRate: '97.00',
    obligationUsdt: '100.000000000000000000',
  },
]

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(TOKEN_KEY, 'a-token')
  vi.restoreAllMocks()
  for (const key of Object.keys(handlers)) delete handlers[key]
})

describe('the merchant path (PRD §6.7, §11)', () => {
  it('lists what the feed returned, with the obligation', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, _init?: RequestInit) => jsonResponse({ success: true, data: FEED })))

    render(<SpineMerchant />)

    expect(await screen.findByLabelText('Amount o-1')).toHaveTextContent(
      '100.000000000000000000',
    )
    expect(screen.getByLabelText('Obligation o-1')).toHaveTextContent(
      '100.000000000000000000',
    )
  })

  /** The socket is a prompt; the feed is the authority. */
  it('re-reads the feed when the socket announces an order', async () => {
    let served = 0
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => {
      served += 1
      return jsonResponse({ success: true, data: served === 1 ? [] : FEED })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<SpineMerchant />)
    await screen.findByText('Nothing available right now.')

    handlers['order.broadcast']?.({ orderId: 'o-1' })

    expect(await screen.findByLabelText('Amount o-1')).toBeInTheDocument()
  })

  it('sends an Idempotency-Key when accepting', async () => {
    const fetchMock = vi.fn((url: string, _init?: RequestInit) =>
      String(url).includes('/accept')
        ? jsonResponse({ success: true, data: { id: 'a-1' } })
        : jsonResponse({ success: true, data: FEED }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<SpineMerchant />)
    await user.click(await screen.findByRole('button', { name: /Accept o-1/ }))

    await waitFor(() => {
      const accept = fetchMock.mock.calls.find((c) =>
        String(c[0]).includes('/accept'),
      )
      expect(accept).toBeDefined()
      const headers = (accept![1] as RequestInit).headers as Headers
      expect(headers.get('Idempotency-Key')).toBeTruthy()
    })
  })

  /** Losing a race is an ordinary outcome, and must read like one. */
  it('shows the refusal when an accept loses the race', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, _init?: RequestInit) =>
        String(url).includes('/accept')
          ? jsonResponse({ message: 'ORDER_ALREADY_ASSIGNED', statusCode: 409 }, 409)
          : jsonResponse({ success: true, data: FEED }),
      ),
    )
    const user = userEvent.setup()

    render(<SpineMerchant />)
    await user.click(await screen.findByRole('button', { name: /Accept o-1/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ORDER_ALREADY_ASSIGNED',
    )
  })

  it('shows the self-dealing refusal in the words the server used', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, _init?: RequestInit) =>
        String(url).includes('/accept')
          ? jsonResponse(
              { message: 'SELF_DEALING_REFUSED: you placed this order, so you cannot also fill it.', statusCode: 403 },
              403,
            )
          : jsonResponse({ success: true, data: FEED }),
      ),
    )
    const user = userEvent.setup()

    render(<SpineMerchant />)
    await user.click(await screen.findByRole('button', { name: /Accept o-1/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /SELF_DEALING_REFUSED/,
    )
  })

  it('offers no settlement action until the order is accepted', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, _init?: RequestInit) => jsonResponse({ success: true, data: FEED })))

    render(<SpineMerchant />)
    await screen.findByLabelText('Amount o-1')

    expect(screen.queryByRole('button', { name: /I have paid/i })).toBeNull()
  })
})
