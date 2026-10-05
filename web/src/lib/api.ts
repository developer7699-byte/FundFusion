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
  const token = localStorage.getItem('nx.access')
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`${API}${path}`, { ...init, headers })
  const body = (await res.json().catch(() => ({}))) as Envelope<T>
  if (!res.ok || !body.success) {
    throw new ApiError(res.status, body.error?.code ?? 'ERROR', body.error?.message ?? 'Request failed')
  }
  return body.data as T
}
