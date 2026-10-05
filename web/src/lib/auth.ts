import { createContext, useContext } from 'react'

export type SessionUser = {
  id: string
  email: string
  displayName: string
  roles: string[]
  status: string
}

export type AuthContextValue = {
  user: SessionUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<SessionUser>
  register: (payload: { email: string; password: string; displayName: string }) => Promise<SessionUser>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
