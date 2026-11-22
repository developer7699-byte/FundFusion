import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { TOKEN_KEY } from '@/lib/api'
import { PaymentMethodsPage } from './PaymentMethodsPage'

const BANK = {
  id: 'pm1',
  type: 'BANK',
  label: 'HDFC Savings',
  holderName: 'Asha Rao',
  accountNumber: '50100123456789',
  ifsc: 'HDFC0000128',
  upiVpa: null,
  isDefault: true,
}
const UPI = {
  id: 'pm2',
  type: 'UPI',
  label: 'GPay',
  holderName: 'Asha Rao',
  accountNumber: null,
  ifsc: null,
  upiVpa: 'asha@okaxis',
  isDefault: false,
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

function stubApi(list: unknown[] = [BANK, UPI]) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const path = String(url)
    if (path.includes('/wallet/payment-methods')) {
      if (!init?.method || init.method === 'GET')
        return jsonResponse({ success: true, data: list })
      return jsonResponse({ success: true, data: {} })
    }
    return jsonResponse({ success: true, data: {} })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function calls(fetchMock: ReturnType<typeof stubApi>, method: string) {
  return fetchMock.mock.calls.filter(
    ([url, init]) =>
      String(url).includes('/wallet/payment-methods') && (init as RequestInit | undefined)?.method === method,
  ) as [string, RequestInit][]
}

function show() {
  return render(
    <AppProviders>
      <MemoryRouter>
        <PaymentMethodsPage />
      </MemoryRouter>
    </AppProviders>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  localStorage.setItem(TOKEN_KEY, 'a-token')
})

describe('customer payment methods on the v1 API', () => {
  it('lists the methods from GET /wallet/payment-methods', async () => {
    stubApi()
    show()
    expect(await screen.findByText('HDFC Savings')).toBeInTheDocument()
    expect(screen.getByText('GPay')).toBeInTheDocument()
    expect(screen.getByText('Default')).toBeInTheDocument()
  })

  it('adds a BANK method', async () => {
    const f = stubApi()
    const user = userEvent.setup()
    show()
    await screen.findByText('HDFC Savings')
    await user.click(screen.getByRole('button', { name: /add method/i }))
    await user.type(screen.getByPlaceholderText(/^Label/), 'Axis')
    await user.clear(screen.getByPlaceholderText(/holder name/i))
    await user.type(screen.getByPlaceholderText(/holder name/i), 'Asha Rao')
    await user.type(screen.getByPlaceholderText(/account number/i), '9988776655')
    await user.type(screen.getByPlaceholderText(/ifsc/i), 'utib0000001')
    await user.click(screen.getByRole('button', { name: /save payment method/i }))

    await waitFor(() => expect(calls(f, 'POST')).toHaveLength(1))
    const [url, init] = calls(f, 'POST')[0]
    expect(String(url)).toMatch(/\/v1\/wallet\/payment-methods$/)
    expect(JSON.parse(init.body as string)).toEqual({
      type: 'BANK',
      label: 'Axis',
      holderName: 'Asha Rao',
      accountNumber: '9988776655',
      ifsc: 'UTIB0000001',
    })
    expect(new Headers(init.headers).has('Idempotency-Key')).toBe(false)
  })

  it('adds a UPI method', async () => {
    const f = stubApi()
    const user = userEvent.setup()
    show()
    await screen.findByText('HDFC Savings')
    await user.click(screen.getByRole('button', { name: /add method/i }))
    await user.click(screen.getByRole('button', { name: /^UPI/ }))
    await user.type(screen.getByPlaceholderText(/^Label/), 'PhonePe')
    await user.clear(screen.getByPlaceholderText(/holder name/i))
    await user.type(screen.getByPlaceholderText(/holder name/i), 'Asha Rao')
    await user.type(screen.getByPlaceholderText(/upi id/i), 'Asha@ybl')
    await user.click(screen.getByRole('button', { name: /save payment method/i }))

    await waitFor(() => expect(calls(f, 'POST')).toHaveLength(1))
    expect(JSON.parse(calls(f, 'POST')[0][1].body as string)).toEqual({
      type: 'UPI',
      label: 'PhonePe',
      holderName: 'Asha Rao',
      upiVpa: 'asha@ybl',
    })
  })

  it('sets a method as default with PATCH :id/default', async () => {
    const f = stubApi()
    const user = userEvent.setup()
    show()
    await screen.findByText('GPay')
    await user.click(screen.getByRole('button', { name: /make gpay default/i }))
    await waitFor(() => expect(calls(f, 'PATCH')).toHaveLength(1))
    expect(String(calls(f, 'PATCH')[0][0])).toMatch(/\/v1\/wallet\/payment-methods\/pm2\/default$/)
  })

  it('deletes a method with DELETE :id', async () => {
    const f = stubApi()
    const user = userEvent.setup()
    show()
    await screen.findByText('GPay')
    await user.click(screen.getByRole('button', { name: /delete gpay/i }))
    await waitFor(() => expect(calls(f, 'DELETE')).toHaveLength(1))
    expect(String(calls(f, 'DELETE')[0][0])).toMatch(/\/v1\/wallet\/payment-methods\/pm2$/)
  })
})
