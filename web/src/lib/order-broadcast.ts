import { io, type Socket } from 'socket.io-client'
import { TOKEN_KEY } from '@/lib/api'

/**
 * The event name the server emits (PRD §11), re-dispatched on `window` so
 * screens subscribe to one thing whether or not a socket is connected.
 */
export const ORDER_BROADCAST = 'order.broadcast'

let socket: Socket | null = null

/**
 * One socket for the whole application.
 *
 * The server publishes a new order to every merchant from one place at one
 * instant, because looping per merchant would give whoever sits earliest in
 * the loop a systematic advantage under first-accept-wins. A second socket
 * here would not break that, but it would double the traffic and make the
 * logs harder to read when the first fairness complaint arrives.
 */
export function connectBroadcast(): Socket | null {
  if (socket) return socket
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null

  socket = io(`${window.location.origin}/p2p`, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  })
  socket.on(ORDER_BROADCAST, (order: unknown) => {
    window.dispatchEvent(new CustomEvent(ORDER_BROADCAST, { detail: order }))
  })
  return socket
}

export function disconnectBroadcast(): void {
  socket?.disconnect()
  socket = null
}
