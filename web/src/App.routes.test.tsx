import { beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
            data: String(url).endsWith('/auth/me') ? ME : {},
          }),
      } as Response),
    ),
  )
})

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

// PRD §3 names these as v1 non-goals. Removing a <Route> without a catch-all
// leaves the path matching nothing and React Router renders an empty layout,
// which reads as a broken page rather than a missing one.
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
  '/customer/referrals',
  '/customer/rewards',
  '/customer/verification',
]

const KEPT = ['/customer/wallet', '/customer/orders', '/customer/transactions']

describe('out-of-scope customer routes', () => {
  it.each(GONE)('%s renders not-found', async (path) => {
    renderAt(path)
    expect(await screen.findByTestId('not-found')).toBeInTheDocument()
  })
})

describe('in-scope customer routes', () => {
  it.each(KEPT)('%s still renders a page', async (path) => {
    renderAt(path)
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument()
  })
})

describe('unknown routes', () => {
  it('a path that never existed renders not-found', async () => {
    renderAt('/customer/this-was-never-a-route')
    expect(await screen.findByTestId('not-found')).toBeInTheDocument()
  })
})
