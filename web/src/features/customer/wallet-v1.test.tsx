import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { TOKEN_KEY } from '@/lib/api'
import { DepositFlow, ReceiveFlow, SendFlow, WalletHome, WithdrawFlow } from './wallet-flows'
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
  address: '0x4b7877dD11Ef2d15297Cb0a013F8513d8D9EBf3C',
  network: 'BSC_TESTNET',
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
}

function stubApi(routes: Routes = {}) {
  const fetchMock = vi.fn((url: string) => {
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
      return jsonResponse({ success: true, data: [] })
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

  it('shows no INR headline or estimate and no BTC/ETH rows on the dashboard', async () => {
    stubApi()
    show(<CustomerDashboard />)

    const card = await screen.findByTestId('total-assets-card')
    expect(card).not.toHaveTextContent(/₹|INR|≈/)
    expect(screen.queryByText(/\b(BTC|ETH|Bitcoin|Ethereum)\b/)).toBeNull()
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

  it('Send is a parked action and makes no API call', async () => {
    const fetchMock = stubApi()
    const user = userEvent.setup()
    show(<SendFlow />)

    const btn = screen.getByRole('button', { name: /send usdt/i })
    expect(btn).toHaveAttribute('aria-disabled', 'true')
    await user.click(btn)
    expect(await screen.findByText(/not available yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
    // AppProviders' own session probe is the only call; Send adds none.
    const paths = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(paths.filter((p) => !p.endsWith('/auth/me'))).toEqual([])
  })
})
