import { render, screen } from '@testing-library/react'
import { App } from '@/App'

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
