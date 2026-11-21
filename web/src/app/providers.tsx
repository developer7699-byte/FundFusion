import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { signedIn, signOut, storeSession, v1 } from '@/lib/api'
import {
  AuthContext,
  type PendingCode,
  type SessionUser,
} from '@/lib/auth'
import { ThemeProvider } from '@/lib/theme'
import { LanguageProvider } from '@/lib/language'

interface Session {
  accessToken: string
  refreshToken: string
}

/**
 * The session, read from the server.
 *
 * Nothing here invents a user when a request fails. The prototype did, and a
 * fabricated session is worse than no session: every screen below it shows
 * figures for an account that does not exist.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  // Per instance, not per module: a cache shared by every mount outlives the
  // session it was filled for, and one test's balances show up in the next.
  const [queryClient] = useState(() => new QueryClient())
  const [user, setUser] = useState<SessionUser | null>(null)
  const [pending, setPending] = useState<PendingCode | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMe = useCallback(async (): Promise<SessionUser | null> => {
    if (!signedIn()) {
      setUser(null)
      setLoading(false)
      return null
    }
    try {
      const me = await v1<SessionUser>('/auth/me')
      setUser(me)
      return me
    } catch {
      signOut()
      setUser(null)
      return null
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
      pending,
      login: async (email: string, password: string) => {
        await v1('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        setPending({ email, purpose: 'LOGIN' as const })
      },
      register: async (payload: {
        email: string
        password: string
        displayName: string
      }) => {
        await v1('/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        setPending({ email: payload.email, purpose: 'REGISTER' as const })
      },
      verifyCode: async (code: string) => {
        if (!pending) throw new Error('There is no sign-in waiting for a code.')
        const path =
          pending.purpose === 'REGISTER'
            ? '/auth/register/verify'
            : '/auth/login/verify'
        const session = await v1<Session>(path, {
          method: 'POST',
          body: JSON.stringify({ email: pending.email, code }),
        })
        storeSession(session)
        setPending(null)
        const me = await loadMe()
        if (!me) throw new Error('That session could not be read back.')
        return me
      },
      beginMfa: async () => {
        const begun = await v1<{ secret: string }>('/auth/mfa/begin', {
          method: 'POST',
        })
        return begun.secret
      },
      confirmMfa: async (code: string) => {
        await v1('/auth/mfa/confirm', {
          method: 'POST',
          body: JSON.stringify({ code }),
        })
        const me = await loadMe()
        if (!me) throw new Error('That session could not be read back.')
        return me
      },
      logout: async () => {
        signOut()
        setUser(null)
        setPending(null)
      },
    }),
    [user, loading, pending, loadMe],
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
