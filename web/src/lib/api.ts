/**
 * The client for the v1 API (PRD §6, §8, §9.1).
 *
 * One client, one session. The prototype surface had its own, with its own
 * token key, and running two meant a person could be signed into one and not
 * the other — which looks exactly like a bug in whichever screen they are on.
 */
const ROOT = import.meta.env.VITE_API_URL ?? '/api'
const BASE = `${ROOT}/v1`

export const TOKEN_KEY = 'ff.access'
export const REFRESH_KEY = 'ff.refresh'

interface Envelope<T> {
  success?: boolean
  data?: T
  error?: { code: string; message: string }
  /** Nest's own exception shape, which is not the envelope. */
  message?: string | string[]
  statusCode?: number
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

export interface V1Init extends RequestInit {
  /**
   * Marks this as a money operation (PRD §5 rule 2). The server refuses one
   * without it, which is the point: a retry must not become a second order.
   */
  idempotencyKey?: string
}

export async function v1<T>(path: string, init: V1Init = {}): Promise<T> {
  const { idempotencyKey, ...rest } = init
  const send = (token: string | null) => {
    const headers = new Headers(rest.headers)
    headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey)
    return fetch(`${BASE}${path}`, { ...rest, headers })
  }

  let res = await send(localStorage.getItem(TOKEN_KEY))
  let body = (await res.json().catch(() => ({}))) as Envelope<T>

  // An access token lives 15 minutes; a refresh rotates it without making the
  // person sign in again. Only once, and never for the refresh call itself.
  if (unauthorised(res, body) && path !== '/auth/refresh') {
    const rotated = await rotate()
    if (rotated) {
      res = await send(rotated)
      body = (await res.json().catch(() => ({}))) as Envelope<T>
    }
  }

  if (!res.ok || body.success === false) {
    throw new ApiError(res.status, body.error?.code ?? 'ERROR', message(body))
  }
  return body.data as T
}

function unauthorised(res: Response, body: Envelope<unknown>): boolean {
  return (
    (!res.ok || body.success === false) &&
    (res.status === 401 || body.error?.code === 'TOKEN_INVALID') &&
    Boolean(localStorage.getItem(REFRESH_KEY))
  )
}

async function rotate(): Promise<string | null> {
  try {
    const session = await v1<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({
          refreshToken: localStorage.getItem(REFRESH_KEY),
        }),
      },
    )
    storeSession(session)
    return session.accessToken
  } catch {
    signOut()
    return null
  }
}

/** Whatever the server said, in the order it is most likely to have said it. */
function message(body: Envelope<unknown>): string {
  if (body.error?.message) return body.error.message
  if (Array.isArray(body.message)) return body.message.join(', ')
  if (body.message) return body.message
  return 'That request failed.'
}

export function signOut(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function signedIn(): boolean {
  return Boolean(localStorage.getItem(TOKEN_KEY))
}

export function storeSession(session: {
  accessToken: string
  refreshToken: string
}): void {
  localStorage.setItem(TOKEN_KEY, session.accessToken)
  localStorage.setItem(REFRESH_KEY, session.refreshToken)
}

/** A key per money request, so a retry of *this* request is safe. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID()
}

/**
 * The prototype surface, which a few screens still read from until their
 * task in `docs/plans/2026-11-21-m46-ui-integration.md` rewires them. It is
 * deleted with those screens' last caller.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${ROOT}${path}`, { ...init, headers })
  const body = (await res.json().catch(() => ({}))) as Envelope<T>
  if (!res.ok || body.success === false) {
    throw new ApiError(res.status, body.error?.code ?? 'ERROR', message(body))
  }
  return body.data as T
}
