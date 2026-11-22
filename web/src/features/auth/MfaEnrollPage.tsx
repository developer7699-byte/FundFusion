import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Copy } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

import { Button } from '@/components/ui/button'
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

  const boxes = useRef<(HTMLInputElement | null)[]>([])
  const digitAt = (i: number) => code[i] ?? ''
  const writeDigits = (chars: string[]) =>
    setCode(chars.join('').replace(/\D/g, '').slice(0, 6))

  const onDigit = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, '')
    const arr = Array.from({ length: 6 }, (_, k) => code[k] ?? '')
    if (d === '') {
      arr[i] = ''
      writeDigits(arr)
      return
    }
    for (let k = 0; k < d.length && i + k < 6; k++) arr[i + k] = d[k]
    writeDigits(arr)
    boxes.current[Math.min(i + d.length, 5)]?.focus()
  }

  const onDigitKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      e.preventDefault()
      const arr = Array.from({ length: 6 }, (_, k) => code[k] ?? '')
      arr[i - 1] = ''
      writeDigits(arr)
      boxes.current[i - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && i > 0) boxes.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) boxes.current[i + 1]?.focus()
  }

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
            <span
              id="authenticator-code-label"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Authenticator code
            </span>
            <div
              role="group"
              aria-labelledby="authenticator-code-label"
              className="flex justify-between gap-2"
              onPaste={(e) => {
                e.preventDefault()
                onDigit(0, e.clipboardData.getData('text'))
              }}
            >
              {Array.from({ length: 6 }, (_, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    boxes.current[i] = el
                  }}
                  value={digitAt(i)}
                  onChange={(e) => onDigit(i, e.target.value)}
                  onKeyDown={(e) => onDigitKey(i, e)}
                  onFocus={(e) => e.target.select()}
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  autoFocus={i === 0}
                  maxLength={1}
                  aria-label={`Authenticator code digit ${i + 1}`}
                  className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 text-center text-lg font-mono text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-800 dark:bg-[#0c101d] dark:text-white"
                />
              ))}
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
