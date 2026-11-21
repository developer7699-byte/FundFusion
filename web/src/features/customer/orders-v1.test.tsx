import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { TOKEN_KEY } from '@/lib/api'
import { QuoteFlow, WalletHome } from './wallet-flows'
import { OrderDetail } from './ops-pages'

const QUOTE = {
  id: 'q1',
  side: 'SELL',
  usdtAmount: '100.000000000000000000',
  inrAmount: '9700.00',
  customerRate: '97.00',
  platformFeeUsdt: '3.000000000000000000',
  expiresAt: '2099-01-01T00:00:00.000Z',
}

const ME = {
  id: 'u1',
  email: 'a@example.test',
  displayName: 'a',
  emailVerified: true,
  canMoveMoney: true,
  roles: ['CUSTOMER'],
  capabilities: ['P2P_SELL'],
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

function stubApi(over: { confirm?: () => Promise<Response>; order?: unknown } = {}) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    void init
    const path = String(url)
    if (path.endsWith('/auth/me')) return jsonResponse({ success: true, data: ME })
    if (path.endsWith('/wallet/summary'))
      return jsonResponse({
        success: true,
        data: { balances: { AVAILABLE: '500.000000000000000000' }, address: null, network: 'BSC_TESTNET' },
      })
    if (path.endsWith('/p2p/quotes'))
      return jsonResponse({ success: true, data: QUOTE })
    if (path.endsWith('/p2p/orders'))
      return over.confirm?.() ?? jsonResponse({ success: true, data: { id: 'o1' } })
    if (path.includes('/p2p/orders/'))
      return jsonResponse({ success: true, data: over.order ?? {} })
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

function showOrder(order: unknown) {
  stubApi({ order })
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={['/customer/orders/o1']}>
        <Routes>
          <Route path="/customer/orders/:orderId" element={<OrderDetail />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  )
}

async function quoteThenConfirm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(/amount/i), '100')
  await user.click(screen.getByRole('button', { name: /get a price/i }))
  await user.click(await screen.findByRole('button', { name: /confirm/i }))
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  localStorage.setItem(TOKEN_KEY, 'a-token')
})

describe('customer orders on the v1 API (PRD §6)', () => {
  it('shows both sides of the snapshot before confirming', async () => {
    stubApi()
    const user = userEvent.setup()
    show(<QuoteFlow side="SELL" />)

    await user.type(await screen.findByLabelText(/amount/i), '100')
    await user.click(screen.getByRole('button', { name: /get a price/i }))

    expect(await screen.findByText(/100\.000000000000000000/)).toBeInTheDocument()
    expect(screen.getByText(/9700\.00/)).toBeInTheDocument()
    expect(screen.getByText(/97\.00/)).toBeInTheDocument()
  })

  it('sends a fresh Idempotency-Key per confirmation', async () => {
    const fetchMock = stubApi()
    const user = userEvent.setup()
    show(<QuoteFlow side="SELL" />)
    await quoteThenConfirm(user)

    await waitFor(() => {
      const keys = fetchMock.mock.calls
        .filter((c) => String(c[0]).endsWith('/p2p/orders'))
        .map((c) => new Headers(c[1]?.headers).get('Idempotency-Key'))
      expect(keys).toHaveLength(1)
      expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/)
    })
  })

  it('refreshes the balance after an order is confirmed', async () => {
    const fetchMock = stubApi()
    const user = userEvent.setup()
    // WalletHome is the observer. Invalidation refetches live queries, so
    // without one on screen there is nothing to prove.
    show(
      <>
        <QuoteFlow side="SELL" />
        <WalletHome />
      </>,
    )
    await quoteThenConfirm(user)

    await waitFor(() => {
      const paths = fetchMock.mock.calls.map((c) => String(c[0]))
      const posted = paths.findIndex((p) => p.endsWith('/p2p/orders'))
      expect(
        paths.slice(posted + 1).some((p) => p.endsWith('/wallet/summary')),
      ).toBe(true)
    })
  })

  it('shows the expiry refusal rather than a blank screen', async () => {
    const refusal = 'That quote expired. Ask for a new price.'
    stubApi({
      confirm: () =>
        jsonResponse(
          { success: false, error: { code: 'QUOTE_EXPIRED', message: refusal } },
          409,
        ),
    })
    const user = userEvent.setup()
    show(<QuoteFlow side="SELL" />)
    await quoteThenConfirm(user)

    expect(await screen.findByText(refusal)).toBeInTheDocument()
  })

  it('offers no action the order state forbids', async () => {
    showOrder({
      orderId: 'o1',
      status: 'AWAITING_MERCHANT',
      side: 'SELL',
      usdtAmount: '100.000000000000000000',
      inrAmount: '9700.00',
      customerRate: '97.00',
      platformFeeUsdt: '3.000000000000000000',
      role: 'CUSTOMER',
      merchantUserId: null,
      utr: null,
      broadcastAt: '2026-11-21T09:00:00.000Z',
      updatedAt: '2026-11-21T09:00:00.000Z',
    })

    expect(await screen.findByText(/AWAITING MERCHANT/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirm receipt/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /submit utr/i })).toBeNull()
  })
})
