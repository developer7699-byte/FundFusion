import { beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { App } from '@/App'
import { TOKEN_KEY } from '@/lib/api'

/**
 * The customer shell is behind a session and the financial gate (PRD §9.1),
 * so reaching the routes under test means being signed in and enrolled.
 */
const ME = {
  id: 'u1',
  email: 'a@example.test',
  displayName: 'a',
  emailVerified: true,
  canMoveMoney: true,
  roles: ['CUSTOMER'],
  capabilities: [],
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  localStorage.setItem(TOKEN_KEY, 'a-token')
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: String(url).endsWith('/auth/me')
              ? ME
              : { balances: { AVAILABLE: '0', LOCKED: '0' } },
          }),
      } as Response),
    ),
  )
})

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

// PRD §3 names these as v1 non-goals; the rest have no v1 backing in this
// slice. Removing a <Route> without a catch-all leaves the path matching
// nothing and React Router renders an empty layout, which reads as a broken
// page rather than a missing one.
const GONE = [
  '/customer/gift-cards',
  '/customer/gift-cards/orders',
  '/customer/utilities',
  '/customer/utilities/mobile-recharge',
  '/customer/utilities/dth',
  '/customer/utilities/electricity',
  '/customer/utilities/bill-payment',
  '/customer/pay',
  '/customer/pay/scan',
  '/customer/pay/confirm',
  '/customer/pay/request',
  '/customer/convert',
  '/customer/request',
  '/customer/referrals',
  '/customer/rewards',
  '/customer/verification',
  '/customer/wallet/send',
  '/customer/transactions',
  '/customer/notifications',
  '/customer/support',
]

const KEPT = [
  '/customer/dashboard',
  '/customer/wallet',
  '/customer/wallet/deposit',
  '/customer/wallet/withdraw',
  '/customer/wallet/receive',
  '/customer/wallet/addresses',
  '/customer/buy',
  '/customer/sell',
  '/customer/payment-methods',
  '/customer/orders',
  '/customer/orders/ord-1',
  '/customer/mfa/enroll',
]

describe('out-of-scope customer routes', () => {
  it.each(GONE)('%s renders not-found', async (path) => {
    renderAt(path)
    expect(await screen.findByTestId('not-found')).toBeInTheDocument()
  })
})

describe('in-scope customer routes', () => {
  it.each(KEPT)('%s resolves to a page, not not-found', async (path) => {
    renderAt(path)
    // The layout mounts once the session resolves; a missing route would
    // render not-found inside it.
    await screen.findByRole('main')
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument()
  })
})

describe('dashboard quick actions', () => {
  it('park the out-of-scope tiles: disabled, no link, no navigation', async () => {
    renderAt('/customer/dashboard')
    const gifts = await screen.findByRole('button', { name: /gift cards/i })
    expect(gifts).toHaveAttribute('aria-disabled', 'true')
    expect(gifts.closest('a')).toBeNull()
    fireEvent.click(gifts)
    expect(window.location.pathname).toBe('/customer/dashboard')
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument()
  })
})

describe('unknown routes', () => {
  it('a path that never existed renders not-found', async () => {
    renderAt('/customer/this-was-never-a-route')
    expect(await screen.findByTestId('not-found')).toBeInTheDocument()
  })
})
