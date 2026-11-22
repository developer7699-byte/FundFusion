import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { REFRESH_KEY, TOKEN_KEY } from '@/lib/api'
import { QuoteFlow, WalletHome } from './wallet-flows'
import { OrderDetail, OrdersList } from './ops-pages'

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

const WAITING = {
  orderId: 'o1',
  status: 'AWAITING_MERCHANT',
  side: 'SELL',
  usdtAmount: '100.000000000000000000',
  inrAmount: '9700.00',
  role: 'CUSTOMER',
  utr: null,
  payeeInstruction: null,
}

const METHOD = {
  id: '5b1f3c9e-0000-4000-8000-000000000001',
  type: 'BANK',
  label: 'HDFC',
  holderName: 'A Person',
  accountNumber: '50100123456789',
  ifsc: 'HDFC0001234',
  upiVpa: null,
  isDefault: true,
}

function stubApi(
  over: {
    confirm?: () => Promise<Response>
    order?: unknown
    methods?: unknown[]
    quote?: unknown
  } = {},
) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    void init
    const path = String(url)
    if (path.includes('/wallet/payment-methods'))
      return jsonResponse({ success: true, data: over.methods ?? [METHOD] })
    if (path.endsWith('/auth/me')) return jsonResponse({ success: true, data: ME })
    if (path.endsWith('/wallet/summary'))
      return jsonResponse({
        success: true,
        data: { balances: { AVAILABLE: '500.000000000000000000' }, address: null, network: 'BSC_TESTNET' },
      })
    if (path.endsWith('/p2p/quotes'))
      return jsonResponse({ success: true, data: over.quote ?? QUOTE })
    if (path.endsWith('/p2p/orders'))
      return over.confirm?.() ?? jsonResponse({ success: true, data: { id: 'o1' } })
    if (path.includes('/p2p/orders/') && (init?.method ?? 'GET') === 'GET')
      return jsonResponse({ success: true, data: over.order ?? WAITING })
    if (path.includes('/p2p/orders/')) return jsonResponse({ success: true, data: {} })
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

  it('a sell binds the chosen payment method and posts quote id only', async () => {
    const fetchMock = stubApi()
    const user = userEvent.setup()
    show(<QuoteFlow side="SELL" />)
    await quoteThenConfirm(user)

    await waitFor(() => {
      const post = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/p2p/orders'))
      expect(post).toBeDefined()
      expect(JSON.parse(String(post![1]?.body))).toEqual({
        quoteId: 'q1',
        paymentMethodId: METHOD.id,
      })
      expect(new Headers(post![1]?.headers).get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/)
    })
    // The quote came first.
    const paths = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(paths.findIndex((p) => p.endsWith('/p2p/quotes'))).toBeLessThan(
      paths.findIndex((p) => p.endsWith('/p2p/orders')),
    )
  })

  it('refuses a sell with no payment method before any order POST', async () => {
    const fetchMock = stubApi({ methods: [] })
    const user = userEvent.setup()
    show(<QuoteFlow side="SELL" />)

    await user.type(await screen.findByLabelText(/amount/i), '100')
    await user.click(screen.getByRole('button', { name: /get a price/i }))
    expect(await screen.findByText(/add a payment method/i)).toBeInTheDocument()

    const confirm = screen.getByRole('button', { name: /confirm/i })
    expect(confirm).toBeDisabled()
    await user.click(confirm)
    expect(
      fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/p2p/orders')),
    ).toHaveLength(0)
  })

  it('a buy posts the quote id and no payee, and needs no payment method', async () => {
    const fetchMock = stubApi({ methods: [], quote: { ...QUOTE, side: 'BUY' } })
    const user = userEvent.setup()
    show(<QuoteFlow side="BUY" />)
    await quoteThenConfirm(user)

    await waitFor(() => {
      const post = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/p2p/orders'))
      expect(JSON.parse(String(post![1]?.body))).toEqual({ quoteId: 'q1' })
    })
  })

  it('convert is inert and calls no API', async () => {
    const fetchMock = stubApi()
    const user = userEvent.setup()
    show(<QuoteFlow side="CONVERT" />)
    await user.click(await screen.findByRole('button', { name: /convert/i }))
    const touched = fetchMock.mock.calls.filter((c) =>
      /\/p2p\/|\/wallet\/payment-methods/.test(String(c[0])),
    )
    expect(touched).toHaveLength(0)
  })

  it('buy at ACCEPTED shows the payee and posts the UTR', async () => {
    const fetchMock = stubApi({
      quote: { ...QUOTE, side: 'BUY' },
      order: {
        orderId: 'o1',
        status: 'ACCEPTED',
        side: 'BUY',
        usdtAmount: '100.000000000000000000',
        inrAmount: '9700.00',
        customerRate: '97.00',
        platformFeeUsdt: '3.000000000000000000',
        role: 'CUSTOMER',
        utr: null,
        payeeInstruction: {
          payeeUserId: 'm1',
          type: 'BANK',
          holderName: 'Merchant Desk',
          accountNumber: '9988776655',
          ifsc: 'ICIC0000001',
          upiVpa: null,
        },
      },
    })
    const user = userEvent.setup()
    show(<QuoteFlow side="BUY" />)
    await quoteThenConfirm(user)

    expect(await screen.findByText(/9988776655/)).toBeInTheDocument()
    await user.type(screen.getByLabelText(/utr/i), 'UTR123456789')
    await user.click(screen.getByRole('button', { name: /submit utr/i }))

    await waitFor(() => {
      const post = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/p2p/orders/o1/utr'))
      expect(post).toBeDefined()
      expect(JSON.parse(String(post![1]?.body))).toEqual({ utr: 'UTR123456789' })
    })
  })

  it('sell at PAYMENT_SUBMITTED posts the receipt confirmation', async () => {
    const fetchMock = stubApi({
      order: {
        orderId: 'o1',
        status: 'PAYMENT_SUBMITTED',
        side: 'SELL',
        usdtAmount: '100.000000000000000000',
        inrAmount: '9700.00',
        customerRate: '97.00',
        platformFeeUsdt: '3.000000000000000000',
        role: 'CUSTOMER',
        utr: 'UTR1',
        payeeInstruction: null,
      },
    })
    const user = userEvent.setup()
    show(<QuoteFlow side="SELL" />)
    await quoteThenConfirm(user)

    await user.click(await screen.findByRole('button', { name: /confirm receipt/i }))
    await waitFor(() => {
      const post = fetchMock.mock.calls.find((c) =>
        String(c[0]).endsWith('/p2p/orders/o1/confirm'),
      )
      expect(post).toBeDefined()
      expect(new Headers(post![1]?.headers).get('Idempotency-Key')).toBeTruthy()
    })
  })

  it('every other state is read-only, and a null payee does not crash', async () => {
    stubApi({
      order: {
        orderId: 'o1',
        status: 'AWAITING_MERCHANT',
        side: 'BUY',
        usdtAmount: '100.000000000000000000',
        inrAmount: '9700.00',
        customerRate: '97.00',
        platformFeeUsdt: '3.000000000000000000',
        role: 'CUSTOMER',
        utr: null,
        payeeInstruction: null,
      },
      quote: { ...QUOTE, side: 'BUY' },
    })
    const user = userEvent.setup()
    show(<QuoteFlow side="BUY" />)
    await quoteThenConfirm(user)

    expect(await screen.findByText(/AWAITING MERCHANT/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit utr/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /confirm receipt/i })).toBeNull()
  })

  it('a 401 refresh retry reuses the same order Idempotency-Key', async () => {
    localStorage.setItem(REFRESH_KEY, 'r-token')
    let orderPosts = 0
    const fetchMock = stubApi()
    const base = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      const path = String(url)
      if (path.endsWith('/p2p/orders') && init?.method === 'POST' && orderPosts++ === 0)
        return jsonResponse({ success: false, error: { code: 'TOKEN_INVALID', message: 'expired' } }, 401)
      if (path.endsWith('/auth/refresh'))
        return jsonResponse({ success: true, data: { accessToken: 'n', refreshToken: 'n2' } })
      return base(url, init)
    })
    const user = userEvent.setup()
    show(<QuoteFlow side="SELL" />)
    await quoteThenConfirm(user)

    await waitFor(() => {
      const keys = fetchMock.mock.calls
        .filter((c) => String(c[0]).endsWith('/p2p/orders') && c[1]?.method === 'POST')
        .map((c) => new Headers(c[1]?.headers).get('Idempotency-Key'))
      expect(keys).toHaveLength(2)
      expect(keys[0]).toBeTruthy()
      expect(keys[1]).toBe(keys[0])
    })
  })

  it('uses the exact payment-methods URL', async () => {
    const fetchMock = stubApi()
    show(<QuoteFlow side="SELL" />)
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => String(c[0]))
      expect(urls).toContain('/api/v1/wallet/payment-methods')
    })
  })

  it('a second quote places its order under a different key', async () => {
    const fetchMock = stubApi()
    const user = userEvent.setup()
    show(<QuoteFlow side="SELL" />)
    await quoteThenConfirm(user)
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/p2p/orders')),
      ).toHaveLength(1),
    )
    await user.click(screen.getByRole('button', { name: /get a price/i }))
    await user.click(await screen.findByRole('button', { name: /confirm at/i }))

    await waitFor(() => {
      const keys = fetchMock.mock.calls
        .filter((c) => String(c[0]).endsWith('/p2p/orders'))
        .map((c) => new Headers(c[1]?.headers).get('Idempotency-Key'))
      expect(keys).toHaveLength(2)
      expect(keys[1]).not.toBe(keys[0])
    })
  })

  it('the confirm guard refuses a sell with no method even when clicked', async () => {
    const fetchMock = stubApi()
    const base = fetchMock.getMockImplementation()!
    // Methods never arrive, so the button is live but there is no payee.
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      String(url).includes('/wallet/payment-methods')
        ? new Promise<Response>(() => {})
        : base(url, init),
    )
    const user = userEvent.setup()
    show(<QuoteFlow side="SELL" />)
    await user.type(await screen.findByLabelText(/amount/i), '100')
    await user.click(screen.getByRole('button', { name: /get a price/i }))
    await user.click(await screen.findByRole('button', { name: /confirm at/i }))

    expect(await screen.findByText(/where to receive the rupees/i)).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/p2p/orders')),
    ).toHaveLength(0)
  })

  it('a 5xx on order create keeps the quote and replays the same key', async () => {
    let posts = 0
    const fetchMock = stubApi()
    const base = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (String(url).endsWith('/p2p/orders') && init?.method === 'POST' && posts++ === 0)
        return jsonResponse({ success: false, error: { code: 'ERROR', message: 'gateway timeout' } }, 504)
      return base(url, init)
    })
    const user = userEvent.setup()
    show(<QuoteFlow side="SELL" />)
    await quoteThenConfirm(user)
    expect(await screen.findByText(/gateway timeout/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /confirm at/i }))

    await waitFor(() => {
      const keys = fetchMock.mock.calls
        .filter((c) => String(c[0]).endsWith('/p2p/orders') && c[1]?.method === 'POST')
        .map((c) => new Headers(c[1]?.headers).get('Idempotency-Key'))
      expect(keys).toHaveLength(2)
      expect(keys[1]).toBe(keys[0])
    })
  })

  it('a confirm-receipt retry after a 5xx reuses the same key', async () => {
    let posts = 0
    const fetchMock = stubApi({
      order: {
        orderId: 'o1',
        status: 'PAYMENT_SUBMITTED',
        side: 'SELL',
        usdtAmount: '100.000000000000000000',
        inrAmount: '9700.00',
        role: 'CUSTOMER',
        utr: 'UTR1',
        payeeInstruction: null,
      },
    })
    const base = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (String(url).endsWith('/p2p/orders/o1/confirm') && posts++ === 0)
        return jsonResponse({ success: false, error: { code: 'ERROR', message: 'upstream down' } }, 503)
      return base(url, init)
    })
    const user = userEvent.setup()
    show(<QuoteFlow side="SELL" />)
    await quoteThenConfirm(user)
    await user.click(await screen.findByRole('button', { name: /confirm receipt/i }))
    expect(await screen.findByText(/upstream down/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /confirm receipt/i }))

    await waitFor(() => {
      const keys = fetchMock.mock.calls
        .filter((c) => String(c[0]).endsWith('/p2p/orders/o1/confirm'))
        .map((c) => new Headers(c[1]?.headers).get('Idempotency-Key'))
      expect(keys).toHaveLength(2)
      expect(keys[0]).toBeTruthy()
      expect(keys[1]).toBe(keys[0])
    })
  })

  it('shows the placed order amounts at 2dp', async () => {
    stubApi()
    const user = userEvent.setup()
    show(<QuoteFlow side="SELL" />)
    await quoteThenConfirm(user)
    expect(await screen.findByText(/100\.00 USDT · ₹9,700\.00/)).toBeInTheDocument()
  })
})

const BASE_ORDER = {
  orderId: 'o1',
  usdtAmount: '100.000000000000000000',
  inrAmount: '9700.00',
  customerRate: '97.00',
  platformFeeUsdt: '3.000000000000000000',
  role: 'CUSTOMER',
  merchantUserId: null,
  utr: null,
  broadcastAt: null,
  updatedAt: '2026-11-21T09:00:00.000Z',
  payeeInstruction: null,
}

const STATES = [
  'QUOTED',
  'AWAITING_MERCHANT',
  'ACCEPTED',
  'PAYMENT_SUBMITTED',
  'COMPLETED',
  'DISPUTED',
  'REFUNDED',
  'EXPIRED',
]

function allowed(side: string, status: string): 'utr' | 'confirm' | null {
  if (side === 'BUY' && status === 'ACCEPTED') return 'utr'
  if (side === 'SELL' && status === 'PAYMENT_SUBMITTED') return 'confirm'
  return null
}

function detailRoute() {
  return (
    <AppProviders>
      <MemoryRouter initialEntries={['/customer/orders/o1']}>
        <Routes>
          <Route path="/customer/orders/:orderId" element={<OrderDetail />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>
  )
}

describe('order list and detail (state x side matrix)', () => {
  it("the list shows the user's orders with side, status and 2dp money", async () => {
    const fetchMock = vi.fn((url: string) =>
      String(url).endsWith('/p2p/orders')
        ? jsonResponse({
            success: true,
            data: [
              { ...BASE_ORDER, orderId: 'a', side: 'BUY', status: 'ACCEPTED' },
              { ...BASE_ORDER, orderId: 'b', side: 'SELL', status: 'COMPLETED' },
            ],
          })
        : jsonResponse({ success: true, data: [] }),
    )
    vi.stubGlobal('fetch', fetchMock)
    show(<OrdersList />)

    expect(await screen.findByText(/BUY · ACCEPTED/)).toBeInTheDocument()
    expect(screen.getByText(/SELL · COMPLETED/)).toBeInTheDocument()
    expect(screen.getAllByText(/100\.00 USDT/).length).toBe(2)
    expect(screen.queryByText(/100\.000000000000000000/)).toBeNull()
  })

  for (const side of ['BUY', 'SELL']) {
    for (const status of STATES) {
      it(`${side} at ${status} offers ${allowed(side, status) ?? 'no action'}`, async () => {
        showOrder({ ...BASE_ORDER, side, status })
        await screen.findByText(new RegExp(status.replace(/_/g, ' '), 'i'))
        const want = allowed(side, status)
        const utr = screen.queryByRole('button', { name: /submit utr/i })
        const confirm = screen.queryByRole('button', { name: /confirm receipt/i })
        expect(!!utr).toBe(want === 'utr')
        expect(!!confirm).toBe(want === 'confirm')
        // Nothing else is actionable on any state, notably no dispute.
        expect(screen.queryByRole('button', { name: /dispute/i })).toBeNull()
      })
    }
  }

  it('a null payee renders "awaiting payee" without throwing', async () => {
    showOrder({ ...BASE_ORDER, side: 'BUY', status: 'AWAITING_MERCHANT' })
    expect(await screen.findByText(/awaiting payee/i)).toBeInTheDocument()
  })

  it('a bound bank instruction renders the frozen destination', async () => {
    showOrder({
      ...BASE_ORDER,
      side: 'BUY',
      status: 'ACCEPTED',
      payeeInstruction: {
        payeeUserId: 'm1',
        type: 'BANK',
        holderName: 'Merchant Desk',
        accountNumber: '9988776655',
        ifsc: 'ICIC0000001',
        upiVpa: null,
      },
    })
    expect(await screen.findByText(/9988776655/)).toBeInTheDocument()
    expect(screen.getByText(/ICIC0000001/)).toBeInTheDocument()
    expect(screen.getByText(/Merchant Desk/)).toBeInTheDocument()
  })

  it('a bound UPI instruction renders the VPA', async () => {
    showOrder({
      ...BASE_ORDER,
      side: 'BUY',
      status: 'ACCEPTED',
      payeeInstruction: {
        payeeUserId: 'm1',
        type: 'UPI',
        holderName: 'Merchant Desk',
        accountNumber: null,
        ifsc: null,
        upiVpa: 'desk@okbank',
      },
    })
    expect(await screen.findByText(/desk@okbank/)).toBeInTheDocument()
  })

  it('detail shows money at 2dp, not raw 18dp strings', async () => {
    showOrder({ ...BASE_ORDER, side: 'BUY', status: 'COMPLETED' })
    await screen.findByText(/COMPLETED/)
    expect(screen.queryByText(/100\.000000000000000000/)).toBeNull()
    expect(screen.getByText('100.00')).toBeInTheDocument()
  })

  it('confirm receipt retried after a 5xx reuses one Idempotency-Key', async () => {
    const fetchMock = stubApi({
      order: { ...BASE_ORDER, side: 'SELL', status: 'PAYMENT_SUBMITTED' },
    })
    const base = fetchMock.getMockImplementation()!
    let posts = 0
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (String(url).endsWith('/confirm') && posts++ === 0)
        return jsonResponse(
          { success: false, error: { code: 'ERROR', message: 'gateway timeout' } },
          504,
        )
      return base(url, init)
    })
    const user = userEvent.setup()
    render(detailRoute())
    await user.click(await screen.findByRole('button', { name: /confirm receipt/i }))
    await screen.findByText(/gateway timeout/i)
    await user.click(screen.getByRole('button', { name: /confirm receipt/i }))
    await waitFor(() => {
      const keys = fetchMock.mock.calls
        .filter((c) => String(c[0]).endsWith('/confirm'))
        .map((c) => new Headers(c[1]?.headers).get('Idempotency-Key'))
      expect(keys).toHaveLength(2)
      expect(keys[0]).toBeTruthy()
      expect(keys[1]).toBe(keys[0])
    })
  })

  it('submitting a UTR sends no Idempotency-Key', async () => {
    const fetchMock = stubApi({ order: { ...BASE_ORDER, side: 'BUY', status: 'ACCEPTED' } })
    const user = userEvent.setup()
    render(detailRoute())
    await user.type(await screen.findByLabelText(/utr/i), 'UTR123456789')
    await user.click(screen.getByRole('button', { name: /submit utr/i }))
    await waitFor(() => {
      const post = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/o1/utr'))
      expect(post).toBeDefined()
      expect(new Headers(post![1]?.headers).get('Idempotency-Key')).toBeNull()
    })
  })
})
