import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SpineAuth } from './SpineAuth'
import { TOKEN_KEY } from './api'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

function calls(mock: ReturnType<typeof vi.fn>): string[] {
  return mock.mock.calls.map((c) => String(c[0]))
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('signing in (PRD §9.1)', () => {
  it('walks register, then the emailed code, then the authenticator', async () => {
    const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
      if (String(url).endsWith('/auth/register')) {
        return jsonResponse({ success: true, data: { otpRequired: true } })
      }
      if (String(url).endsWith('/auth/register/verify')) {
        return jsonResponse({
          success: true,
          data: { accessToken: 'a-token', refreshToken: 'r-token' },
        })
      }
      if (String(url).endsWith('/auth/mfa/begin')) {
        return jsonResponse({ success: true, data: { secret: 'SECRET123' } })
      }
      return jsonResponse({ success: true, data: {} })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<SpineAuth onSignedIn={() => {}} />)
    await user.type(screen.getByLabelText('Email'), 'a@example.test')
    await user.type(screen.getByLabelText('Password'), 'Example!Demo1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await user.type(await screen.findByLabelText('Emailed code'), '246810')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(localStorage.getItem(TOKEN_KEY)).toBe('a-token'))
    expect(calls(fetchMock)[0]).toMatch(/\/auth\/register$/)
    expect(calls(fetchMock)[1]).toMatch(/\/auth\/register\/verify$/)
  })

  /** The secret is shown once; no route returns it again. */
  it('shows the authenticator secret after beginning enrolment', async () => {
    const fetchMock = vi.fn((url: string, _init?: RequestInit) =>
      String(url).endsWith('/auth/mfa/begin')
        ? jsonResponse({ success: true, data: { secret: 'SECRET123' } })
        : jsonResponse({
            success: true,
            data: { accessToken: 'a', refreshToken: 'r' },
          }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<SpineAuth onSignedIn={() => {}} />)
    await user.type(screen.getByLabelText('Email'), 'a@example.test')
    await user.type(screen.getByLabelText('Password'), 'Example!Demo1')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await user.type(await screen.findByLabelText('Emailed code'), '246810')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(
      await screen.findByRole('button', { name: /authenticator secret/i }),
    )

    expect(await screen.findByLabelText('Authenticator secret')).toHaveTextContent(
      'SECRET123',
    )
  })

  /** A refusal is shown, not swallowed — the server's words, not ours. */
  it('shows the reason the server refused', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        jsonResponse(
          { success: false, error: { code: 'BAD', message: 'That code is not valid.' } },
          400,
        ),
      ),
    )
    const user = userEvent.setup()

    render(<SpineAuth onSignedIn={() => {}} />)
    await user.type(screen.getByLabelText('Email'), 'a@example.test')
    await user.type(screen.getByLabelText('Password'), 'Example!Demo1')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That code is not valid.',
    )
  })

  it('signs in without ever asking the server for the emailed code', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse({ success: true, data: {} }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<SpineAuth onSignedIn={() => {}} />)
    await user.type(screen.getByLabelText('Email'), 'a@example.test')
    await user.type(screen.getByLabelText('Password'), 'Example!Demo1')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(calls(fetchMock).some((c) => /otp|code/.test(c))).toBe(false)
  })
})
