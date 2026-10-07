const API = import.meta.env.VITE_API_URL ?? '/api'

type Envelope<T> = {
  success: boolean
  data?: T
  error?: { code: string; message: string }
  meta?: { simulated?: boolean }
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

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let token = localStorage.getItem('nx.access')
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  
  let res = await fetch(`${API}${path}`, { ...init, headers })
  let body = (await res.json().catch(() => ({}))) as Envelope<T>

  // Auto-refresh token on 401 or TOKEN_INVALID
  if (
    (!res.ok || !body.success) &&
    (res.status === 401 || body.error?.code === 'TOKEN_INVALID') &&
    localStorage.getItem('nx.refresh') &&
    path !== '/auth/refresh'
  ) {
    try {
      const refreshRes = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: localStorage.getItem('nx.refresh') }),
      })
      const refreshBody = (await refreshRes.json().catch(() => ({}))) as Envelope<{ accessToken: string; refreshToken: string }>
      if (refreshRes.ok && refreshBody.success && refreshBody.data?.accessToken) {
        localStorage.setItem('nx.access', refreshBody.data.accessToken)
        localStorage.setItem('nx.refresh', refreshBody.data.refreshToken)
        headers.set('Authorization', `Bearer ${refreshBody.data.accessToken}`)
        res = await fetch(`${API}${path}`, { ...init, headers })
        body = (await res.json().catch(() => ({}))) as Envelope<T>
      }
    } catch {
      // Refresh failed, proceed to error handling
    }
  }

  if (!res.ok || !body.success) {
    throw new ApiError(res.status, body.error?.code ?? 'ERROR', body.error?.message ?? 'Request failed')
  }
  return body.data as T
}
