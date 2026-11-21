import { createContext, useContext } from 'react'

/** Exactly what `GET /v1/auth/me` returns (PRD §9.1, §9.3). */
export type SessionUser = {
  id: string
  email: string
  displayName: string
  emailVerified: boolean
  /** Verified email plus an enrolled authenticator. The financial gate. */
  canMoveMoney: boolean
  roles: string[]
  capabilities: string[]
}

/**
 * Sign-in is two steps, so between them there is a person who has proved a
 * password but holds no session. This is that state, and it is deliberately
 * not a session: nothing authenticates with it.
 */
export type PendingCode = {
  email: string
  purpose: 'REGISTER' | 'LOGIN'
}

export type AuthContextValue = {
  user: SessionUser | null
  loading: boolean
  pending: PendingCode | null
  /** Step one. A code goes to the address; no session yet. */
  login: (email: string, password: string) => Promise<void>
  register: (payload: {
    email: string
    password: string
    displayName: string
  }) => Promise<void>
  /** Step two. The emailed code becomes a session. */
  verifyCode: (code: string) => Promise<SessionUser>
  /** The authenticator secret, shown once and never returned again. */
  beginMfa: () => Promise<string>
  confirmMfa: (code: string) => Promise<SessionUser>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/** Where a signed-in person belongs, by role (PRD §9.2). */
export function homeFor(user: SessionUser): string {
  if (user.roles.includes('SUPER_ADMIN') || user.roles.includes('SUPPORT'))
    return '/admin/dashboard'
  if (user.roles.includes('MERCHANT')) return '/merchant/dashboard'
  return '/customer/dashboard'
}
