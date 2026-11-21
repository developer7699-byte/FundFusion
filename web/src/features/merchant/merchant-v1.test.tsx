import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { TOKEN_KEY } from '@/lib/api'
import { MerchantAvailable } from './pages'

const ME = {
  id: 'm1',
  email: 'm@example.test',
  displayName: 'm',
  emailVerified: true,
  canMoveMoney: true,
  roles: ['CUSTOMER', 'MERCHANT'],
  capabilities: ['P2P_BUY', 'P2P_SELL'],
}

const FEED = [
  {
    orderId: 'o1',
    side: 'SELL',
    usdtAmount: '100.000000000000000000',
    inrAmount: '9700.00',
    customerRate: '97.00',
    platformFeeUsdt: '3.000000000000000000',
    broadcastAt: '2026-11-21T09:00:00.000Z',
    expiresAt: '2099-01-01T00:00:00.000Z',
    obligationUsdt: '100.000000000000000000',
  },
]

const DESK = { id: 'd1', deskName: 'Demo Desk', status: 'ACTIVE', buyEnabled: true, sellEnabled: true }

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

function stubApi(over: { accept?: () => Promise<Response>; noDesk?: boolean } = {}) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const path = String(url)
    if (path.endsWith('/auth/me')) return jsonResponse({ success: true, data: ME })
    if (path.endsWith('/p2p/merchant/desk'))
      return jsonResponse({
        success: true,
        data: init?.method === 'POST' ? DESK : over.noDesk ? null : DESK,
      })
    if (path.endsWith('/p2p/merchant/feed'))
      return jsonResponse({ success: true, data: FEED })
    if (path.includes('/accept'))
      return over.accept?.() ?? jsonResponse({ success: true, data: {} })
    return jsonResponse({ success: true, data: [] })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function show(ui: React.ReactNode) {
  return render(
    <AppProviders>
      <MemoryRouter>{ui}</MemoryRouter>
    </AppProviders>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  localStorage.setItem(TOKEN_KEY, 'a-token')
})

describe('the merchant desk on the v1 API (PRD §6.5, §6.7)', () => {
  it('lists the live feed with each obligation', async () => {
    stubApi()
    show(<MerchantAvailable />)

    // The order's size and this merchant's obligation are both stated.
    expect(await screen.findAllByText(/100\.000000000000000000/)).toHaveLength(2)
    expect(screen.getByText(/9700\.00/)).toBeInTheDocument()
  })

  it('shows ORDER_ALREADY_ASSIGNED as a refusal, not a crash', async () => {
    const refusal = 'Another merchant took that order first.'
    stubApi({
      accept: () =>
        jsonResponse(
          { success: false, error: { code: 'ORDER_ALREADY_ASSIGNED', message: refusal } },
          409,
        ),
    })
    const user = userEvent.setup()
    show(<MerchantAvailable />)

    await user.click(await screen.findByRole('button', { name: /accept/i }))

    expect(await screen.findByText(refusal)).toBeInTheDocument()
  })

  it("shows the self-dealing refusal in the server's words", async () => {
    const refusal = 'You cannot accept your own order.'
    stubApi({
      accept: () =>
        jsonResponse(
          { success: false, error: { code: 'SELF_DEALING', message: refusal } },
          403,
        ),
    })
    const user = userEvent.setup()
    show(<MerchantAvailable />)

    await user.click(await screen.findByRole('button', { name: /accept/i }))

    expect(await screen.findByText(refusal)).toBeInTheDocument()
  })

  it('opens a desk for a user who has none', async () => {
    const fetchMock = stubApi({ noDesk: true })
    const user = userEvent.setup()
    show(<MerchantAvailable />)

    await user.click(await screen.findByRole('button', { name: /open a desk/i }))

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          (c) =>
            String(c[0]).endsWith('/p2p/merchant/desk') &&
            (c[1] as RequestInit | undefined)?.method === 'POST',
        ),
      ).toBe(true),
    )
  })

  it('refreshes the feed on the broadcast event', async () => {
    const fetchMock = stubApi()
    show(<MerchantAvailable />)
    await screen.findByText(/9700\.00/)
    const before = fetchMock.mock.calls.filter((c) =>
      String(c[0]).endsWith('/p2p/merchant/feed'),
    ).length

    window.dispatchEvent(new CustomEvent('order.broadcast'))

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter((c) =>
          String(c[0]).endsWith('/p2p/merchant/feed'),
        ).length,
      ).toBeGreaterThan(before),
    )
  })
})
