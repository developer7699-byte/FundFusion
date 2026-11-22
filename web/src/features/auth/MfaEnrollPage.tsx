import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Copy, ShieldCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PLATFORM_NAME } from '@/lib/brand'
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
  const { user, beginMfa, confirmMfa, logout } = useAuth()
  const navigate = useNavigate()
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyKey = async () => {
    try {
      await navigator.clipboard?.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable (e.g. insecure context) — the key stays visible to type
    }
  }

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

  // The standard otpauth URI an authenticator app reads from a QR. Built on
  // the client because /auth/mfa/begin returns only the shared secret.
  const otpauthUri =
    secret && user
      ? `otpauth://totp/${encodeURIComponent(PLATFORM_NAME)}:${encodeURIComponent(
          user.email,
        )}?secret=${secret}&issuer=${encodeURIComponent(
          PLATFORM_NAME,
        )}&algorithm=SHA1&digits=6&period=30`
      : ''

  return (
    <AuthLayout
      title="Add your authenticator"
      subtitle="Scan the code with an authenticator app (Google Authenticator, Authy, 1Password), then enter the 6-digit code it shows. This protects every money action."
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c101d] p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">
            Scan with your authenticator app
          </p>
          <div className="mt-3 flex justify-center">
            {otpauthUri ? (
              <div className="rounded-lg bg-white p-3">
                <QRCodeSVG value={otpauthUri} size={160} level="M" />
              </div>
            ) : (
              <div className="h-[184px] w-[184px] animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            )}
          </div>

          <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-3">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
              Can’t scan? Enter this setup key manually
            </p>
            <div className="mt-1.5 flex items-center justify-center gap-2">
              <p className="font-mono text-sm tracking-widest break-all text-slate-900 dark:text-white">
                {secret || 'Preparing…'}
              </p>
              {secret && (
                <button
                  type="button"
                  onClick={copyKey}
                  aria-label={copied ? 'Setup key copied' : 'Copy setup key'}
                  className="shrink-0 rounded-md p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400 text-center">
              Save it now — it is not shown again.
            </p>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            setLoading(true)
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
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                placeholder="000000"
                className="pl-10 h-12 rounded-xl bg-slate-50 dark:bg-[#0c101d] border-slate-200 dark:border-slate-800 text-center text-lg tracking-[0.5em] font-mono"
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
            disabled={loading || !secret || code.length < 6}
            className="w-full h-11 rounded-full font-semibold text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-lg"
          >
            {loading ? 'Confirming…' : 'Confirm'}
          </Button>
        </form>

        <div className="text-center text-[11px] text-slate-500 dark:text-slate-400">
          {user && <p>Signed in as {user.email}</p>}
          <button
            type="button"
            onClick={async () => {
              await logout()
              navigate('/login', { replace: true })
            }}
            className="mt-1 font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Use a different account
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}
