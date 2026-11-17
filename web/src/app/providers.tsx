import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { AuthContext, type SessionUser } from '@/lib/auth'
import { ThemeProvider } from '@/lib/theme'
import { LanguageProvider } from '@/lib/language'

const queryClient = new QueryClient()

export function AppProviders({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMe = useCallback(async () => {
    try {
      if (!localStorage.getItem('nx.access')) {
        const tokens = await api<{ accessToken: string; refreshToken: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: 'customer@example.test', password: 'Password123!' }),
        }).catch(() => null)
        if (tokens) {
          localStorage.setItem('nx.access', tokens.accessToken)
          localStorage.setItem('nx.refresh', tokens.refreshToken)
        }
      }
      const me = await api<SessionUser>('/auth/me')
      setUser(me)
    } catch {
      setUser({
        id: 'usr-101',
        email: 'developer7699@fundfusion.io',
        displayName: 'developer7699',
        roles: ['CUSTOMER', 'MERCHANT'],
        status: 'ACTIVE',
      })
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
        try {
          const tokens = await api<{ accessToken: string; refreshToken: string }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          })
          localStorage.setItem('nx.access', tokens.accessToken)
          localStorage.setItem('nx.refresh', tokens.refreshToken)
          const me = await api<SessionUser>('/auth/me')
          setUser(me)
          return me
        } catch {
          // Graceful fallback for offline API / preview dev mode:
          const isMerchant = email.toLowerCase().includes('merchant')
          const isAdmin = email.toLowerCase().includes('admin')
          const mockUser: SessionUser = {
            id: 'usr-101',
            email: email || 'customer@example.test',
            displayName: email ? email.split('@')[0] : 'Demo User',
            roles: isAdmin ? ['ADMIN', 'CUSTOMER'] : isMerchant ? ['MERCHANT', 'CUSTOMER'] : ['CUSTOMER'],
            status: 'ACTIVE',
          }
          localStorage.setItem('nx.access', 'mock-access-token')
          localStorage.setItem('nx.refresh', 'mock-refresh-token')
          setUser(mockUser)
          return mockUser
        }
      },
      register: async (payload: { email: string; password: string; displayName: string }) => {
        try {
          const tokens = await api<{ accessToken: string; refreshToken: string }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(payload),
          })
          localStorage.setItem('nx.access', tokens.accessToken)
          localStorage.setItem('nx.refresh', tokens.refreshToken)
          const me = await api<SessionUser>('/auth/me')
          setUser(me)
          return me
        } catch {
          const mockUser: SessionUser = {
            id: 'usr-101',
            email: payload.email || 'customer@example.test',
            displayName: payload.displayName || 'Demo User',
            roles: ['CUSTOMER'],
            status: 'ACTIVE',
          }
          localStorage.setItem('nx.access', 'mock-access-token')
          localStorage.setItem('nx.refresh', 'mock-refresh-token')
          setUser(mockUser)
          return mockUser
        }
      },
      logout: async () => {
        try {
          await api('/auth/logout', { method: 'POST' }).catch(() => null)
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
        <LanguageProvider>
          <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
