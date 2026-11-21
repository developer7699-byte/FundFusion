/**
 * The spine screens' client. There is only one client now (PRD §9.1 made the
 * two account systems one), so this re-exports it rather than keeping a
 * second copy with its own token key.
 */
export {
  ApiError,
  newIdempotencyKey,
  REFRESH_KEY,
  signedIn,
  signOut,
  storeSession,
  TOKEN_KEY,
  v1,
  type V1Init,
} from '@/lib/api'
