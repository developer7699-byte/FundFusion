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
  const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
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
    renderAt('/mfa/enroll')

    expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument()
    expect(screen.getByText(/not shown again/i)).toBeInTheDocument()
  })

  it('lets a stuck unenrolled user leave the gate via "Use a different account"', async () => {
    localStorage.setItem(TOKEN_KEY, 'a-token')
    localStorage.setItem(REFRESH_KEY, 'r-token')
    stubApi(UNENROLLED)
    const user = userEvent.setup()
    renderAt('/mfa/enroll')

    await screen.findByRole('heading', { name: /authenticator/i })
    await user.click(screen.getByRole('button', { name: /use a different account/i }))

    await waitFor(() => expect(window.location.pathname).toBe('/login'))
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull()
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

  it('sends an unenrolled user on a money route to /mfa/enroll', async () => {
    localStorage.setItem(TOKEN_KEY, 'a-token')
    stubApi(UNENROLLED)
    renderAt('/customer/wallet')

    await screen.findByRole('heading', { name: /authenticator/i })
    expect(window.location.pathname).toBe('/mfa/enroll')
  })

  it('logs in, verifies the code and stores a session', async () => {
    const fetchMock = stubApi(ENROLLED)
    const user = userEvent.setup()
    renderAt('/login')

    await user.type(await screen.findByPlaceholderText(/email/i), 'a@example.test')
    await user.type(screen.getByPlaceholderText(/password/i), 'Example!Demo1')
    await user.click(screen.getByRole('button', { name: /sign in|log in/i }))
    await user.type(await screen.findByLabelText(/emailed code/i), '246810')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => expect(localStorage.getItem(TOKEN_KEY)).toBe('a-token'))
    expect(localStorage.getItem(REFRESH_KEY)).toBe('r-token')
    const paths = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(paths.some((p) => p.endsWith('/auth/login/verify'))).toBe(true)
  })

  it('enrols: begin, then confirm with the entered code, then lands home', async () => {
    localStorage.setItem(TOKEN_KEY, 'a-token')
    const fetchMock = stubApi(UNENROLLED)
    const user = userEvent.setup()
    renderAt('/mfa/enroll')

    await screen.findByText('JBSWY3DPEHPK3PXP')
    // After confirming, the server reports the gate open.
    fetchMock.mockImplementation(((url: string) => {
      const path = String(url)
      if (path.endsWith('/auth/me')) return jsonResponse({ success: true, data: ENROLLED })
      if (path.endsWith('/auth/mfa/confirm'))
        return jsonResponse({ success: true, data: { enrolled: true } })
      // A second begin (or anything else) must not look like success.
      return jsonResponse({ success: false, error: { code: 'UNEXPECTED', message: path } }, 409)
    }) as never)
    await user.type(screen.getByLabelText(/authenticator code/i), '123456')
    await user.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => expect(window.location.pathname).toBe('/customer/dashboard'))
    const calls = fetchMock.mock.calls.map((c) => [String(c[0]), c[1]] as const)
    const begin = calls.findIndex(([u]) => u.endsWith('/auth/mfa/begin'))
    const confirm = calls.findIndex(([u]) => u.endsWith('/auth/mfa/confirm'))
    expect(begin).toBeGreaterThanOrEqual(0)
    expect(calls.filter(([u]) => u.endsWith('/auth/mfa/begin'))).toHaveLength(1)
    expect(confirm).toBeGreaterThan(begin)
    expect(JSON.parse(String((calls[confirm][1] as RequestInit).body))).toEqual({ code: '123456' })
  })
})
