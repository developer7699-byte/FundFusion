import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { homeFor, useAuth } from '@/lib/auth'
import { AuthLayout } from './pages'

/**
 * Authenticator enrolment (PRD §9.1). The financial gate: nothing that moves
 * money opens until a code from an authenticator app has been confirmed.
 *
 * A sanctioned new screen (ui-r2-q2): `main` never drew one, so it borrows
 * the auth layout. The secret is shown once and never returned again.
 */
export function MfaEnrollPage() {
  const { user, beginMfa, confirmMfa } = useAuth()
  const navigate = useNavigate()
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // The context's functions change identity whenever the user does, so the
  // latest is held in a ref and begin runs exactly once. Re-running it after
  // confirm would POST /auth/mfa/begin against an already-enrolled account.
  const begin = useRef(beginMfa)
  begin.current = beginMfa

  useEffect(() => {
    let live = true
    begin.current()
      .then((s) => live && setSecret(s))
      .catch((e: unknown) =>
        live && setError(e instanceof Error ? e.message : 'Enrolment could not start.'),
      )
    return () => {
      live = false
    }
  }, [])

  return (
    <AuthLayout
      title="Add your authenticator"
      subtitle="Moving money needs a code from an authenticator app."
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c101d] p-4 text-center">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Setup key
          </p>
          <p className="mt-2 font-mono text-sm tracking-widest break-all text-slate-900 dark:text-white">
            {secret || 'Preparing...'}
          </p>
          <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
            Save it now — it is not shown again.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            setLoading(true)
            const code = String(new FormData(e.currentTarget).get('code') ?? '')
            try {
              const me = await confirmMfa(code)
              navigate(homeFor(me), { replace: true })
            } catch (err) {
              setError(err instanceof Error ? err.message : 'That code was not accepted.')
            } finally {
              setLoading(false)
            }
          }}
        >
          <div className="space-y-1.5">
            <label
              htmlFor="authenticator-code"
              className="text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Authenticator code
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                id="authenticator-code"
                name="code"
                required
                inputMode="numeric"
                placeholder="000000"
                className="pl-10 h-11 rounded-xl bg-slate-50 dark:bg-[#0c101d] border-slate-200 dark:border-slate-800 tracking-widest font-mono"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-500 text-center font-medium bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || !secret}
            className="w-full h-11 rounded-full font-semibold text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-lg"
          >
            {loading ? 'Confirming...' : 'Confirm'}
          </Button>
        </form>

        {user && (
          <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
            Signed in as {user.email}
          </p>
        )}
      </div>
    </AuthLayout>
  )
}
