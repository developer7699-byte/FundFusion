import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/App'
import { REFRESH_KEY, TOKEN_KEY } from '@/lib/api'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

const UNENROLLED = {
  id: 'u1',
  email: 'a@example.test',
  displayName: 'a',
  emailVerified: true,
  canMoveMoney: false,
  roles: ['CUSTOMER'],
  capabilities: [],
}

const ENROLLED = { ...UNENROLLED, canMoveMoney: true }

/** Answers every v1 route the auth flow touches. */
function stubApi(me: unknown) {
  const fetchMock = vi.fn((url: string) => {
    const path = String(url)
    if (path.endsWith('/auth/register'))
      return jsonResponse({ success: true, data: { otpRequired: true } })
    if (path.endsWith('/auth/register/verify') || path.endsWith('/auth/login/verify'))
      return jsonResponse({
        success: true,
        data: { accessToken: 'a-token', refreshToken: 'r-token' },
      })
    if (path.endsWith('/auth/login'))
      return jsonResponse({ success: true, data: { otpRequired: true } })
    if (path.endsWith('/auth/me')) return jsonResponse({ success: true, data: me })
    if (path.endsWith('/auth/mfa/begin'))
      return jsonResponse({ success: true, data: { secret: 'JBSWY3DPEHPK3PXP' } })
    if (path.endsWith('/auth/mfa/confirm'))
      return jsonResponse({ success: true, data: { enrolled: true } })
    return jsonResponse({ success: true, data: {} })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('signing in against the v1 API (PRD §9.1)', () => {
  it('registers, verifies the emailed code, then enrols an authenticator', async () => {
    stubApi(UNENROLLED)
    const user = userEvent.setup()
    renderAt('/register')

    await user.type(await screen.findByPlaceholderText(/display name/i), 'Asha')
    await user.type(screen.getByPlaceholderText(/email/i), 'a@example.test')
    await user.type(screen.getByPlaceholderText(/^password \(/i), 'Example!Demo1')
    await user.click(screen.getByRole('button', { name: /get started/i }))

    await user.type(await screen.findByLabelText(/emailed code/i), '246810')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => expect(localStorage.getItem(TOKEN_KEY)).toBe('a-token'))
    expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument()
  })

  it('sends a signed-in but unenrolled user to enrolment, not to a 403', async () => {
    localStorage.setItem(TOKEN_KEY, 'a-token')
    stubApi(UNENROLLED)
    renderAt('/customer/wallet')

    expect(
      await screen.findByRole('heading', { name: /authenticator/i }),
    ).toBeInTheDocument()
  })

  it('shows the authenticator secret once, with the warning that it is not shown again', async () => {
    localStorage.setItem(TOKEN_KEY, 'a-token')
    stubApi(UNENROLLED)
    renderAt('/enrol-authenticator')

    expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument()
    expect(screen.getByText(/not shown again/i)).toBeInTheDocument()
  })

  it('keeps the session across a reload', async () => {
    localStorage.setItem(TOKEN_KEY, 'a-token')
    localStorage.setItem(REFRESH_KEY, 'r-token')
    stubApi(ENROLLED)
    renderAt('/customer/wallet')

    await waitFor(() =>
      expect(window.location.pathname).toBe('/customer/wallet'),
    )
  })
})
