import { useState } from 'react'
import { signOut, storeSession, v1 } from './api'

type Stage = 'start' | 'register-code' | 'login-code' | 'enrol' | 'done'

interface Session {
  accessToken: string
  refreshToken: string
}

/**
 * Sign-in, exactly as PRD §9.1 describes it: email and password, then a code
 * sent to that address, then an authenticator before any money moves.
 *
 * In development the emailed code is printed to the API log, so it is typed
 * in here. No route returns it in a response body, and none should — that
 * would hand an account to anyone who could call the endpoint (PRD §13.5).
 */
export function SpineAuth({ onSignedIn }: { onSignedIn: () => void }) {
  const [stage, setStage] = useState<Stage>('start')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [secret, setSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(work: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await work()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work.')
    } finally {
      setBusy(false)
    }
  }

  const register = () =>
    run(async () => {
      await v1('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName: email }),
      })
      setStage('register-code')
    })

  const login = () =>
    run(async () => {
      await v1('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setStage('login-code')
    })

  const submitCode = (path: string) =>
    run(async () => {
      const session = await v1<Session>(path, {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      })
      storeSession(session)
      setCode('')
      setStage('enrol')
    })

  const beginEnrolment = () =>
    run(async () => {
      const begun = await v1<{ secret: string }>('/auth/mfa/begin', {
        method: 'POST',
      })
      setSecret(begun.secret)
    })

  const confirmEnrolment = () =>
    run(async () => {
      await v1('/auth/mfa/confirm', {
        method: 'POST',
        body: JSON.stringify({ code }),
      })
      setSecret(null)
      setStage('done')
      onSignedIn()
    })

  return (
    <section>
      <h2>Sign in</h2>
      {error && <p role="alert">{error}</p>}

      {stage === 'start' && (
        <div>
          <label>
            Email
            <input
              aria-label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              aria-label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button onClick={register} disabled={busy}>
            Create account
          </button>
          <button onClick={login} disabled={busy}>
            Sign in
          </button>
        </div>
      )}

      {(stage === 'register-code' || stage === 'login-code') && (
        <div>
          <p>A code was emailed to {email}. In development it is in the API log.</p>
          <label>
            Emailed code
            <input
              aria-label="Emailed code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <button
            disabled={busy}
            onClick={() =>
              submitCode(
                stage === 'register-code'
                  ? '/auth/register/verify'
                  : '/auth/login/verify',
              )
            }
          >
            Continue
          </button>
        </div>
      )}

      {stage === 'enrol' && (
        <div>
          <p>
            An authenticator is required before any money moves. Add this
            secret to your app.
          </p>
          {!secret && (
            <button onClick={beginEnrolment} disabled={busy}>
              Show my authenticator secret
            </button>
          )}
          {secret && (
            <>
              {/* Shown once. There is no route that returns it again. */}
              <code aria-label="Authenticator secret">{secret}</code>
              <label>
                Authenticator code
                <input
                  aria-label="Authenticator code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
              <button onClick={confirmEnrolment} disabled={busy}>
                Confirm
              </button>
            </>
          )}
          <button
            onClick={() => {
              setStage('done')
              onSignedIn()
            }}
          >
            I already have one
          </button>
        </div>
      )}

      {stage === 'done' && (
        <button
          onClick={() => {
            signOut()
            setStage('start')
          }}
        >
          Sign out
        </button>
      )}
    </section>
  )
}

