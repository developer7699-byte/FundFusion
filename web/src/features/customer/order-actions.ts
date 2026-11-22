export type OrderAction = 'SUBMIT_UTR' | 'CONFIRM_RECEIPT'

/**
 * The one thing this party may do to an order right now (PRD §6.8).
 *
 * Whoever receives the rupees confirms them, and the payer submits a UTR as
 * evidence. On a buy the customer pays; on a sell the merchant pays. Any other
 * state offers nothing: a button the engine would refuse costs a person a 409
 * they cannot read. This is the only copy of the matrix.
 */
export function actionFor(
  status: string,
  side: 'BUY' | 'SELL',
  role: 'CUSTOMER' | 'MERCHANT',
): OrderAction | null {
  const payer = side === 'BUY' ? 'CUSTOMER' : 'MERCHANT'
  const iAmPayer = role === payer
  if (status === 'ACCEPTED' && iAmPayer) return 'SUBMIT_UTR'
  if (status === 'PAYMENT_SUBMITTED' && !iAmPayer) return 'CONFIRM_RECEIPT'
  return null
}
