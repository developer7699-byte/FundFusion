import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { AuthContext, type SessionUser } from '@/lib/auth'
import { ThemeProvider } from '@/lib/theme'

const queryClient = new QueryClient()

export function AppProviders({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMe = useCallback(async () => {
    if (!localStorage.getItem('nx.access')) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const me = await api<SessionUser>('/auth/me')
      setUser(me)
    } catch {
      localStorage.removeItem('nx.access')
      localStorage.removeItem('nx.refresh')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMe()
  }, [loadMe])

  const value = useMemo(
    () => ({
      user,
      loading,
      login: async (email: string, password: string) => {
        const tokens = await api<{ accessToken: string; refreshToken: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        localStorage.setItem('nx.access', tokens.accessToken)
        localStorage.setItem('nx.refresh', tokens.refreshToken)
        const me = await api<SessionUser>('/auth/me')
        setUser(me)
        return me
      },
      register: async (payload: { email: string; password: string; displayName: string }) => {
        const tokens = await api<{ accessToken: string; refreshToken: string }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        localStorage.setItem('nx.access', tokens.accessToken)
        localStorage.setItem('nx.refresh', tokens.refreshToken)
        const me = await api<SessionUser>('/auth/me')
        setUser(me)
        return me
      },
      logout: async () => {
        try {
          await api('/auth/logout', { method: 'POST' })
        } finally {
          localStorage.removeItem('nx.access')
          localStorage.removeItem('nx.refresh')
          setUser(null)
        }
      },
    }),
    [user, loading, loadMe],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
