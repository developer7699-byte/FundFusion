import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
} from '@nestjs/websockets';
import type { FeedOrder } from './order-feed.service';

/**
 * What goes on the wire: the order and the snapshot it was priced at.
 *
 * The obligation and the window are deliberately absent. Both are derived
 * from settings an admin can change, and the obligation is a per-merchant
 * figure — so they belong in the feed each merchant reads, which is the
 * authority, rather than in one payload shared by all of them. The
 * broadcast says *an order exists now*; the feed says *what you may do
 * about it*.
 */
export type BroadcastOrder = Omit<FeedOrder, 'obligationUsdt' | 'expiresAt'>;

/** Everything this gateway needs from a socket. */
export interface SocketLike {
  handshake: { auth?: { token?: string } };
  join(room: string): void;
  disconnect(close?: boolean): void;
}

interface ServerLike {
  to(room: string): { emit(event: string, payload: unknown): void };
}

/** What `OrderService` calls when an order reaches the merchants. */
export interface OrderBroadcaster {
  broadcast(order: BroadcastOrder): void;
}

/** One room for every merchant, so one emit reaches all of them. */
const ROOM = 'merchants';
export const ORDER_BROADCAST = 'order.broadcast';

/**
 * The live order feed (PRD §11).
 *
 * **One emit, one instant, every merchant.** Looping over merchants and
 * sending to each in turn would build a systematic advantage for whoever
 * sits earliest in the loop — and under first-accept-wins, that decides who
 * earns. So every authenticated socket joins one room and the broadcast is
 * a single call to it.
 *
 * A single API instance needs no Redis adapter. PRD §11's Redis pub/sub is
 * what makes this correct across *several* instances, where sockets held by
 * one process would otherwise never see an order confirmed on another; it is
 * a socket.io adapter added at that point, not a change to this code. Its
 * absence here is a deployment fact, not an oversight.
 */
@Injectable()
@WebSocketGateway({ namespace: '/p2p', cors: { origin: true } })
export class P2pGateway implements OnGatewayConnection, OrderBroadcaster {
  private readonly log = new Logger(P2pGateway.name);
  private readonly jwt = new JwtService({});

  @WebSocketServer()
  server?: ServerLike;

  /**
   * The order book is commercially sensitive — who is trading, how much, at
   * what price — so an unauthenticated socket is closed rather than left
   * connected and silent.
   */
  handleConnection(client: SocketLike): void {
    const token = client.handshake?.auth?.token;
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      this.jwt.verify<{ sub: string }>(token, {
        secret:
          process.env.JWT_ACCESS_SECRET ?? 'development_only_access_secret',
      });
    } catch {
      client.disconnect(true);
      return;
    }

    client.join(ROOM);
  }

  broadcast(order: BroadcastOrder): void {
    if (!this.server) {
      // Nothing is listening. A quiet desk, not a failure — and an order
      // that nobody heard is still in the feed the moment they ask for it.
      return;
    }
    this.server.to(ROOM).emit(ORDER_BROADCAST, order);
    this.log.log(`Broadcast order ${order.orderId} to every merchant`);
  }
}
