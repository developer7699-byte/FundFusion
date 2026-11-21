/**
 * A client for the real v1 API (PRD §6, §8, §9.1).
 *
 * Separate from `lib/api.ts`, which talks to the prototype surface and holds
 * its own session. Running both at once is deliberate for now: the prototype
 * screens keep working while this path proves the engine end to end, and
 * sharing a token key between two different account systems would sign a
 * person into one and break the other.
 */
const BASE = (import.meta.env.VITE_API_URL ?? '/api') + '/v1'

export const TOKEN_KEY = 'spine.access'
export const REFRESH_KEY = 'spine.refresh'

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
  const headers = new Headers(rest.headers)
  headers.set('Content-Type', 'application/json')

  const token = localStorage.getItem(TOKEN_KEY)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey)

  const res = await fetch(`${BASE}${path}`, { ...rest, headers })
  const body = (await res.json().catch(() => ({}))) as Envelope<T>

  if (!res.ok || body.success === false) {
    throw new ApiError(res.status, body.error?.code ?? 'ERROR', message(body))
  }
  return body.data as T
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
