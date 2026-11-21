import { useState } from 'react'
import { signedIn, signOut } from './api'
import { SpineAuth } from './SpineAuth'
import { SpineCustomer } from './SpineCustomer'
import { SpineMerchant } from './SpineMerchant'

/**
 * The M4.5 spine: the thinnest path that completes a real order against the
 * real API on testnet.
 *
 * Deliberately plain. The prototype screens elsewhere in this app point at
 * the in-memory prototype API and keep their own session; this page exists
 * to prove the engine, not to be the product (PRD §14, M6).
 */
export function SpinePage() {
  const [session, setSession] = useState(signedIn())
  const [role, setRole] = useState<'customer' | 'merchant'>('customer')

  if (!session) {
    return <SpineAuth onSignedIn={() => setSession(true)} />
  }

  return (
    <main>
      <nav>
        <button onClick={() => setRole('customer')}>Customer</button>
        <button onClick={() => setRole('merchant')}>Merchant</button>
        <button
          onClick={() => {
            signOut()
            setSession(false)
          }}
        >
          Sign out
        </button>
      </nav>
      {role === 'customer' ? <SpineCustomer /> : <SpineMerchant />}
    </main>
  )
}
