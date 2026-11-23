import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { REFRESH_KEY, TOKEN_KEY } from '@/lib/api'
import { AddressesFlow, DepositFlow, ReceiveFlow, WalletHome, WithdrawFlow } from './wallet-flows'
import { CustomerDashboard } from './CustomerDashboard'
import * as assetsCard from './components/TotalAssetsCard'

/** NUMERIC(38,18). A JavaScript number cannot hold this (PRD §5.1). */
const AVAILABLE = '1234.567890123456789012'

const SUMMARY = {
  balances: {
    AVAILABLE,
    LOCKED: '12.000000000000000000',
    BONDED: '0.000000000000000000',
    PENDING: '0.000000000000000000',
  },
  // Indicative ₹, server-computed as strings (PRD §13.5). The UI only formats
  // these; it never multiplies money in a JavaScript number (PRD §5.1).
  usdtInrRate: '84.25',
  inr: {
    AVAILABLE: '104007.34',
    LOCKED: '1011.00',
    BONDED: '0.00',
    PENDING: '0.00',
  },
  address: '0x4b7877dD11Ef2d15297Cb0a013F8513d8D9EBf3C',
  network: 'BSC_TESTNET',
}

/** The same wallet when the pricing feed is down: balances certain, ₹ null. */
const SUMMARY_NO_RATE = {
  balances: SUMMARY.balances,
  usdtInrRate: null,
  inr: null,
  address: SUMMARY.address,
  network: SUMMARY.network,
}

const ME = {
  id: 'u1',
  email: 'a@example.test',
  displayName: 'a',
  emailVerified: true,
  canMoveMoney: true,
  roles: ['CUSTOMER'],
  capabilities: ['DEPOSIT', 'WITHDRAW'],
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

interface Routes {
  summary?: () => Promise<Response>
  address?: () => Promise<Response>
  activity?: () => Promise<Response>
  withdrawal?: () => Promise<Response>
  allowlist?: (init?: RequestInit) => Promise<Response>
  refresh?: () => Promise<Response>
}

function stubApi(routes: Routes = {}) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const path = String(url)
    if (path.endsWith('/auth/me')) return jsonResponse({ success: true, data: ME })
    if (path.endsWith('/wallet/summary'))
      return routes.summary?.() ?? jsonResponse({ success: true, data: SUMMARY })
    if (path.endsWith('/wallet/address'))
      return (
        routes.address?.() ??
        jsonResponse({
          success: true,
          data: { address: SUMMARY.address, network: SUMMARY.network },
        })
      )
    if (path.endsWith('/wallet/activity'))
      return routes.activity?.() ?? jsonResponse({ success: true, data: [] })
    if (path.endsWith('/wallet/allowlist'))
      return routes.allowlist?.(init) ?? jsonResponse({ success: true, data: [] })
    if (path.endsWith('/auth/refresh'))
      return (
        routes.refresh?.() ??
        jsonResponse({ success: true, data: { accessToken: 'n', refreshToken: 'r2' } })
      )
    if (path.endsWith('/wallet/withdrawals'))
      return routes.withdrawal?.() ?? jsonResponse({ success: true, data: { id: 'w1' } })
    return jsonResponse({ success: true, data: {} })
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

describe('the wallet screens on the v1 API (PRD §5.1, §8)', () => {
  it('shows the 18-dp balance at 2dp on the wallet home', async () => {
    stubApi()
    show(<WalletHome />)

    expect(await screen.findByText(/1,234\.57/)).toBeInTheDocument()
    expect(screen.queryByText(new RegExp(AVAILABLE.replace('.', '\\.')))).toBeNull()
  })

  it('lists the entries from /wallet/activity on the wallet home', async () => {
    stubApi({
      activity: () =>
        jsonResponse({
          success: true,
          data: [
            {
              id: 'j2', kind: 'DEPOSIT', bucket: 'AVAILABLE', direction: 'CREDIT',
              amount: '50.000000000000000000', assetSymbol: 'USDT', memo: '', at: '2026-11-22T10:00:00Z',
            },
            {
              id: 'j1', kind: 'WITHDRAWAL', bucket: 'AVAILABLE', direction: 'DEBIT',
              amount: '5.000000000000000000', assetSymbol: 'USDT', memo: '', at: '2026-11-21T10:00:00Z',
            },
          ],
        }),
    })
    show(<WalletHome />)

    const rows = await screen.findAllByText(/^(DEPOSIT|WITHDRAWAL)$/)
    expect(rows.map((r) => r.textContent)).toEqual(['DEPOSIT', 'WITHDRAWAL'])
  })

  it('hands the dashboard card the full string and shows it at 2dp', async () => {
    stubApi()
    const spy = vi.spyOn(assetsCard, 'TotalAssetsCard')
    show(<CustomerDashboard />)

    const card = await screen.findByTestId('total-assets-card')
    expect(card).toHaveTextContent('1,234.57')
    expect(card).not.toHaveTextContent(AVAILABLE)
    expect(spy).toHaveBeenCalled()
    const props = spy.mock.calls.at(-1)![0]
    expect(props.availableUsdt).toBe(AVAILABLE)
    expect(typeof props.availableUsdt).toBe('string')
  })

  it('shows the indicative ₹ estimate when the feed gives a rate, and no BTC/ETH rows', async () => {
    stubApi()
    show(<CustomerDashboard />)

    const card = await screen.findByTestId('total-assets-card')
    expect(card).toHaveTextContent(/≈ ₹1,04,007\.34/)
    expect(screen.queryByText(/\b(BTC|ETH|Bitcoin|Ethereum)\b/)).toBeNull()
  })

  it('hides the ₹ estimate when the pricing feed is down', async () => {
    stubApi({ summary: () => jsonResponse({ success: true, data: SUMMARY_NO_RATE }) })
    show(<CustomerDashboard />)

    const card = await screen.findByTestId('total-assets-card')
    expect(card).toHaveTextContent('1,234.57') // balance still certain
    expect(card).not.toHaveTextContent(/₹|≈/)
  })

  it('shows the real deposit address and refuses to invent one', async () => {
    stubApi({
      address: () =>
        jsonResponse(
          { success: false, error: { code: 'ERROR', message: 'No address yet.' } },
          503,
        ),
    })
    show(<DepositFlow />)

    await waitFor(() =>
      expect(screen.queryByText(/^0x[0-9a-fA-F]{40}$/)).not.toBeInTheDocument(),
    )
    expect(await screen.findByText(/No address yet\./)).toBeInTheDocument()
  })

  it('removes the simulate-deposit buttons', async () => {
    stubApi()
    show(<DepositFlow />)

    expect(await screen.findByText(SUMMARY.address)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /simulate/i })).toBeNull()
  })

  it("shows the cooldown refusal in the server's words", async () => {
    const refusal =
      'That address was allowlisted 20 minutes ago. Withdrawals to it open in 4 hours.'
    stubApi({
      withdrawal: () =>
        jsonResponse(
          { success: false, error: { code: 'ADDRESS_COOLDOWN', message: refusal } },
          409,
        ),
    })
    const user = userEvent.setup()
    show(<WithdrawFlow />)

    await user.type(
      await screen.findByLabelText(/destination address/i),
      '0x570ec515914CC54da8Ebc50c6AC69f0330727455',
    )
    await user.type(screen.getByLabelText(/amount/i), '10')
    await user.type(screen.getByLabelText(/authenticator code/i), '123456')
    await user.click(screen.getByRole('button', { name: /request withdrawal/i }))

    expect(await screen.findByText(refusal)).toBeInTheDocument()
  })

  it('refreshes the balance after a withdrawal is requested', async () => {
    const fetchMock = stubApi()
    const user = userEvent.setup()
    show(<WithdrawFlow />)

    await user.type(
      await screen.findByLabelText(/destination address/i),
      '0x570ec515914CC54da8Ebc50c6AC69f0330727455',
    )
    await user.type(screen.getByLabelText(/amount/i), '10')
    await user.type(screen.getByLabelText(/authenticator code/i), '123456')
    await user.click(screen.getByRole('button', { name: /request withdrawal/i }))

    await waitFor(() => {
      const paths = fetchMock.mock.calls.map((c) => String(c[0]))
      const posted = paths.lastIndexOf(
        paths.find((p) => p.endsWith('/wallet/withdrawals'))!,
      )
      expect(
        paths.slice(posted + 1).some((p) => p.endsWith('/wallet/summary')),
      ).toBe(true)
    })
  })

  it('Receive shows the same real address as Deposit', async () => {
    stubApi()
    show(<ReceiveFlow />)

    expect(await screen.findByText(SUMMARY.address)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /simulate/i })).toBeNull()
  })

  const DEPOSIT_ROW = {
    id: 'e1',
    kind: 'DEPOSIT',
    bucket: 'AVAILABLE',
    direction: 'CREDIT',
    amount: '25.500000000000000000',
    assetSymbol: 'USDT',
    memo: 'deposit 0xabc',
    at: '2026-11-22T00:00:00Z',
  }

  it('stays waiting when a deposit already existed on load', async () => {
    stubApi({
      activity: () => jsonResponse({ success: true, data: [DEPOSIT_ROW] }),
    })
    show(<ReceiveFlow />)
    expect(await screen.findByText(SUMMARY.address)).toBeInTheDocument()
    expect(await screen.findByText(/waiting for your deposit/i)).toBeInTheDocument()
    expect(screen.queryByText(/deposit credited/i)).toBeNull()
  })

  it('flips to credited when a new deposit arrives on a later poll', async () => {
    let polls = 0
    stubApi({
      activity: () =>
        jsonResponse({ success: true, data: polls++ === 0 ? [] : [DEPOSIT_ROW] }),
    })
    show(<DepositFlow />)
    expect(await screen.findByText(/waiting for your deposit/i)).toBeInTheDocument()

    expect(
      await screen.findByText(/deposit credited: 25\.50 USDT/i, {}, { timeout: 12_000 }),
    ).toBeInTheDocument()
  }, 15_000)

  it('Send on the wallet home is a parked action and makes no API call', async () => {
    const fetchMock = stubApi()
    const user = userEvent.setup()
    show(<WalletHome />)
    await screen.findByText(/1,234\.57/)

    const btn = screen.getByRole('button', { name: /send/i })
    expect(btn).toHaveAttribute('aria-disabled', 'true')
    await user.click(btn)
    expect(await screen.findByText(/not available yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /send/i })).toBeNull()
    // Send adds no call beyond what the wallet home itself reads.
    const paths = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(paths.filter((p) => /send|transfer/i.test(p))).toEqual([])
  })

  const ADDR = '0x570ec515914CC54da8Ebc50c6AC69f0330727455'

  it('lists the real allowlist and posts {address, code, label} to add', async () => {
    const posts: unknown[] = []
    const fetchMock = stubApi({
      allowlist: (init) => {
        if (init?.method === 'POST') {
          posts.push(JSON.parse(String(init.body)))
          return jsonResponse({ success: true, data: { address: ADDR } })
        }
        return jsonResponse({
          success: true,
          data: [{ address: ADDR, label: 'Cold', usableAt: '2026-11-22T00:00:00Z' }],
        })
      },
    })
    const user = userEvent.setup()
    show(<AddressesFlow />)

    expect(await screen.findByText(ADDR)).toBeInTheDocument()
    expect(screen.queryByText(/TLvM8vPq7uN9eX2xK92bA8m1pQ4rT9vW/)).toBeNull()

    await user.type(screen.getByLabelText(/^address$/i), '0xabc0000000000000000000000000000000000001')
    await user.type(screen.getByLabelText(/label/i), 'Hot')
    await user.type(screen.getByLabelText(/authenticator code/i), '654321')
    await user.click(screen.getByRole('button', { name: /add address/i }))

    await waitFor(() =>
      expect(posts).toEqual([
        { address: '0xabc0000000000000000000000000000000000001', code: '654321', label: 'Hot' },
      ]),
    )
    expect(fetchMock).toHaveBeenCalled()
  })

  it('posts the full-precision amount, address, code and an Idempotency-Key', async () => {
    const fetchMock = stubApi()
    const user = userEvent.setup()
    show(<WithdrawFlow />)

    await user.type(await screen.findByLabelText(/destination address/i), ADDR)
    await user.type(screen.getByLabelText(/amount/i), '10.123456789012345678')
    await user.type(screen.getByLabelText(/authenticator code/i), '123456')
    await user.click(screen.getByRole('button', { name: /request withdrawal/i }))

    await screen.findByText(/withdrawal requested/i)
    const call = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/wallet/withdrawals'))!
    const init = call[1] as RequestInit
    expect(JSON.parse(String(init.body))).toEqual({
      address: ADDR,
      amount: '10.123456789012345678',
      code: '123456',
    })
    expect(new Headers(init.headers).get('Idempotency-Key')).toMatch(/\S{8,}/)
  })

  it('reuses the same Idempotency-Key when a 401 refresh retries the withdrawal', async () => {
    localStorage.setItem(REFRESH_KEY, 'r1')
    let attempts = 0
    const fetchMock = stubApi({
      withdrawal: () =>
        attempts++ === 0
          ? jsonResponse({ success: false, error: { code: 'TOKEN_INVALID', message: 'expired' } }, 401)
          : jsonResponse({ success: true, data: { id: 'w1' } }),
    })
    const user = userEvent.setup()
    show(<WithdrawFlow />)

    await user.type(await screen.findByLabelText(/destination address/i), ADDR)
    await user.type(screen.getByLabelText(/amount/i), '10')
    await user.type(screen.getByLabelText(/authenticator code/i), '123456')
    await user.click(screen.getByRole('button', { name: /request withdrawal/i }))

    await screen.findByText(/withdrawal requested/i)
    const keys = fetchMock.mock.calls
      .filter((c) => String(c[0]).endsWith('/wallet/withdrawals'))
      .map((c) => new Headers((c[1] as RequestInit).headers).get('Idempotency-Key'))
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBeTruthy()
    expect(keys[1]).toBe(keys[0])
  })

  it('reuses the key when the same withdrawal is resubmitted after a failure', async () => {
    let attempts = 0
    const fetchMock = stubApi({
      withdrawal: () =>
        attempts++ === 0
          ? jsonResponse({ success: false, error: { code: 'ERROR', message: 'boom' } }, 500)
          : jsonResponse({ success: true, data: { id: 'w1' } }),
    })
    const user = userEvent.setup()
    show(<WithdrawFlow />)

    await user.type(await screen.findByLabelText(/destination address/i), ADDR)
    await user.type(screen.getByLabelText(/amount/i), '10')
    await user.type(screen.getByLabelText(/authenticator code/i), '123456')
    await user.click(screen.getByRole('button', { name: /request withdrawal/i }))
    await screen.findByText('boom')
    await user.click(screen.getByRole('button', { name: /request withdrawal/i }))

    await screen.findByText(/withdrawal requested/i)
    const keys = fetchMock.mock.calls
      .filter((c) => String(c[0]).endsWith('/wallet/withdrawals'))
      .map((c) => new Headers((c[1] as RequestInit).headers).get('Idempotency-Key'))
    expect(keys).toHaveLength(2)
    expect(keys[1]).toBe(keys[0])
  })

  it('shows the available balance at 2dp on the withdraw screen', async () => {
    stubApi()
    show(<WithdrawFlow />)
    expect(await screen.findByText(/Available: 1,234\.57/)).toBeInTheDocument()
  })

  const ADDR2 = '0x71C889e2F1d46788B2c99aF0394A723eF1000002'
  const keysOf = (fm: ReturnType<typeof stubApi>) =>
    fm.mock.calls
      .filter((c) => String(c[0]).endsWith('/wallet/withdrawals'))
      .map((c) => new Headers((c[1] as RequestInit).headers).get('Idempotency-Key'))

  it.each([
    ['address', async (u: ReturnType<typeof userEvent.setup>) => {
      const el = screen.getByLabelText(/destination address/i)
      await u.clear(el)
      await u.type(el, ADDR2)
    }],
    ['amount', async (u: ReturnType<typeof userEvent.setup>) => {
      const el = screen.getByLabelText(/amount/i)
      await u.clear(el)
      await u.type(el, '11')
    }],
  ])('uses a new Idempotency-Key when the %s changes', async (_name, change) => {
    let n = 0
    const fm = stubApi({
      withdrawal: () =>
        n++ < 2
          ? jsonResponse({ success: false, error: { code: 'ERROR', message: 'boom' } }, 500)
          : jsonResponse({ success: true, data: { id: 'w1' } }),
    })
    const user = userEvent.setup()
    show(<WithdrawFlow />)

    await user.type(await screen.findByLabelText(/destination address/i), ADDR)
    await user.type(screen.getByLabelText(/amount/i), '10')
    await user.type(screen.getByLabelText(/authenticator code/i), '123456')
    await user.click(screen.getByRole('button', { name: /request withdrawal/i }))
    await screen.findByText('boom')
    await user.click(screen.getByRole('button', { name: /request withdrawal/i }))
    await waitFor(() => expect(keysOf(fm)).toHaveLength(2))
    await change(user)
    await user.click(screen.getByRole('button', { name: /request withdrawal/i }))

    await screen.findByText(/withdrawal requested/i)
    const keys = keysOf(fm)
    expect(keys).toHaveLength(3)
    expect(keys[1]).toBe(keys[0])
    expect(keys[2]).toBeTruthy()
    expect(keys[2]).not.toBe(keys[0])
  })

  it('uses a fresh Idempotency-Key for the next withdrawal after a success', async () => {
    const fm = stubApi()
    const user = userEvent.setup()
    const first = show(<WithdrawFlow />)
    await user.type(await screen.findByLabelText(/destination address/i), ADDR)
    await user.type(screen.getByLabelText(/amount/i), '10')
    await user.type(screen.getByLabelText(/authenticator code/i), '123456')
    await user.click(screen.getByRole('button', { name: /request withdrawal/i }))
    await screen.findByText(/withdrawal requested/i)
    first.unmount()

    show(<WithdrawFlow />)
    await user.type(await screen.findByLabelText(/destination address/i), ADDR)
    await user.type(screen.getByLabelText(/amount/i), '10')
    await user.type(screen.getByLabelText(/authenticator code/i), '123456')
    await user.click(screen.getByRole('button', { name: /request withdrawal/i }))
    await screen.findByText(/withdrawal requested/i)

    const keys = keysOf(fm)
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBeTruthy()
    expect(keys[1]).not.toBe(keys[0])
  })
})
