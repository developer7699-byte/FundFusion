import { beforeEach, describe, expect, it, vi } from 'vitest'
import { v1, ApiError, TOKEN_KEY } from './api'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('the v1 client', () => {
  it('unwraps the envelope and returns the data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, _init?: RequestInit) => jsonResponse({ success: true, data: { address: '0xabc' } })),
    )

    await expect(v1<{ address: string }>('/wallet/address')).resolves.toEqual({
      address: '0xabc',
    })
  })

  it('sends the access token as a bearer header', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-123')
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse({ success: true, data: {} }))
    vi.stubGlobal('fetch', fetchMock)

    await v1('/wallet/balances')

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer token-123')
  })

  it('sends no Authorization header when signed out', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse({ success: true, data: {} }))
    vi.stubGlobal('fetch', fetchMock)

    await v1('/auth/login')

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Headers
    expect(headers.get('Authorization')).toBeNull()
  })

  /**
   * Every money route needs one (PRD §5 rule 2), and the client is where a
   * screen is most likely to forget. Passing `idempotencyKey` is how a
   * caller says "this is a money operation".
   */
  it('sends the Idempotency-Key when one is given', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse({ success: true, data: {} }))
    vi.stubGlobal('fetch', fetchMock)

    await v1('/p2p/orders', { method: 'POST', idempotencyKey: 'key-1' })

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Headers
    expect(headers.get('Idempotency-Key')).toBe('key-1')
  })

  /** A refusal carries a reason the screen can show; a crash does not. */
  it('throws the error message the server gave', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        jsonResponse(
          {
            success: false,
            error: { code: 'FORBIDDEN', message: 'That address is not on your withdrawal allowlist.' },
          },
          403,
        ),
      ),
    )

    await expect(v1('/wallet/withdrawals')).rejects.toThrow(/allowlist/)
  })

  it('carries the status through so a screen can tell 409 from 400', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, _init?: RequestInit) => jsonResponse({ success: false, message: 'ORDER_ALREADY_ASSIGNED' }, 409)),
    )

    await expect(v1('/p2p/orders/x/accept')).rejects.toMatchObject({
      status: 409,
    })
  })

  /** Nest's own exception shape is `{ message, statusCode }`, not the envelope. */
  it('reads a message from a plain Nest exception body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        jsonResponse({ message: 'SELF_DEALING_REFUSED: you placed this order.', statusCode: 403 }, 403),
      ),
    )

    await expect(v1('/p2p/orders/x/accept')).rejects.toThrow(
      /SELF_DEALING_REFUSED/,
    )
  })

  it('is an ApiError, so a screen can branch on it', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, _init?: RequestInit) => jsonResponse({ message: 'nope' }, 400)))

    await expect(v1('/x')).rejects.toBeInstanceOf(ApiError)
  })
})
