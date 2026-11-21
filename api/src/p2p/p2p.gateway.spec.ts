import { JwtService } from '@nestjs/jwt';
import {
  P2pGateway,
  type BroadcastOrder,
  type SocketLike,
} from './p2p.gateway';

const SECRET = 'test_access_secret';

function order(id = 'order-1'): BroadcastOrder {
  return {
    orderId: id,
    side: 'SELL',
    usdtAmount: '100.000000000000000000',
    inrAmount: '9700.00',
    customerRate: '97.00',
    platformFeeUsdt: '3.000000000000000000',
    broadcastAt: new Date('2026-11-21T09:00:00Z'),
  };
}

/** Records what the gateway asked the server to do, and to whom. */
function fakeServer() {
  const emits: { room: string; event: string; payload: unknown }[] = [];
  return {
    emits,
    to(room: string) {
      return {
        emit: (event: string, payload: unknown) =>
          emits.push({ room, event, payload }),
      };
    },
  };
}

type TestSocket = SocketLike & { joined: string[]; closed: boolean };

function socket(token?: string): TestSocket {
  const s: TestSocket = {
    joined: [],
    closed: false,
    handshake: { auth: token ? { token } : {} },
    join: (room: string) => {
      s.joined.push(room);
    },
    disconnect: () => {
      s.closed = true;
    },
  };
  return s;
}

function tokenFor(sub: string): string {
  return new JwtService({}).sign({ sub }, { secret: SECRET });
}

let gateway: P2pGateway;
let server: ReturnType<typeof fakeServer>;

beforeEach(() => {
  process.env.JWT_ACCESS_SECRET = SECRET;
  gateway = new P2pGateway();
  server = fakeServer();
  gateway.server = server;
});

describe('who may listen (PRD §13.5)', () => {
  /**
   * Review Focus #4. The feed is the whole order book, which is
   * commercially sensitive: who is trading, how much, and at what price.
   */
  it('disconnects a socket with no token', () => {
    const s = socket();

    gateway.handleConnection(s);

    expect(s.closed).toBe(true);
    expect(s.joined).toEqual([]);
  });

  it('disconnects a socket whose token does not verify', () => {
    const s = socket('not-a-token');

    gateway.handleConnection(s);

    expect(s.closed).toBe(true);
  });

  it('joins an authenticated socket to the merchant room', () => {
    const s = socket(tokenFor('user-1'));

    gateway.handleConnection(s);

    expect(s.closed).toBe(false);
    expect(s.joined).toEqual(['merchants']);
  });
});

describe('broadcasting (PRD §11)', () => {
  /**
   * The fairness property. Looping per merchant builds a systematic
   * advantage for whoever sits earliest in the loop — and under
   * first-accept-wins, that decides who earns.
   */
  it('publishes exactly one event, to one room', () => {
    gateway.broadcast(order());

    expect(server.emits).toHaveLength(1);
    expect(server.emits[0].room).toBe('merchants');
    expect(server.emits[0].event).toBe('order.broadcast');
  });

  it('carries the snapshot so a merchant need not re-read it', () => {
    gateway.broadcast(order());

    expect(server.emits[0].payload).toMatchObject({
      orderId: 'order-1',
      usdtAmount: '100.000000000000000000',
      inrAmount: '9700.00',
    });
  });

  /** Nothing is listening yet is not an error; it is a quiet desk. */
  it('does nothing when no server is attached', () => {
    const detached = new P2pGateway();

    expect(() => detached.broadcast(order())).not.toThrow();
  });
});
