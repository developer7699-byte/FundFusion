/**
 * The counterparty for a customer-driven buy or sell on testnet.
 *
 * Run: `npm run seed:merchant --workspace api -- [orderId]` with the API
 * running and `demo:seed` already done (it creates merchant@demo.test).
 *
 * It is the merchant half of `web/src/spine/SpineMerchant.tsx`, scripted: it
 * signs in as the seeded merchant, makes sure the desk is open (through
 * `POST /v1/p2p/merchant/desk`, never SQL), then watches the merchant feed
 * and drives each order the customer places:
 *
 *   SELL  accept -> submit a UTR (the merchant "paid the rupees"); the
 *         customer then confirms receipt on their order screen.
 *   BUY   accept (locks the merchant's USDT) -> wait for the customer's UTR
 *         -> confirm the rupees arrived, which releases the USDT.
 *
 * It speaks only HTTP, with the same routes and headers as the browser, and
 * every money mutation carries a fresh Idempotency-Key. Money is only ever a
 * string here. Pass an order id to handle just that order and exit once it is
 * COMPLETED; with none it keeps serving the feed until interrupted.
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
loadEnv({ path: resolve(__dirname, '..', '.env') });

import { randomUUID } from 'crypto';

const API = process.env.SPINE_API ?? 'http://localhost:3001/api/v1';
const EMAIL = process.env.MERCHANT_EMAIL ?? 'merchant@demo.test';
const PASSWORD = process.env.MERCHANT_PASSWORD ?? 'Example!Demo1';
const EMAIL_CODE = process.env.OTP_STATIC_DEV ?? '246810';
const POLL_MS = 2000;
const GIVE_UP_MS = 15 * 60 * 1000;

interface FeedOrder {
  orderId: string;
  side: 'BUY' | 'SELL';
  usdtAmount: string;
  inrAmount: string;
  obligationUsdt: string;
}

interface OrderDetail {
  orderId: string;
  status: string;
  side: 'BUY' | 'SELL';
  usdtAmount: string;
  inrAmount: string;
  utr: string | null;
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
    idempotencyKey?: string;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.idempotencyKey)
    headers['Idempotency-Key'] = options.idempotencyKey;

  const res = await fetch(`${API}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: T;
    error?: { message: string };
    message?: string;
  };
  if (!res.ok || body.success === false) {
    const why = body.error?.message ?? body.message ?? res.statusText;
    throw new ApiError(
      `${options.method ?? 'GET'} ${path} -> ${res.status}: ${why}`,
      res.status,
    );
  }
  return body.data as T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function signIn(): Promise<string> {
  await call('/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASSWORD },
  });
  const session = await call<{ accessToken: string }>('/auth/login/verify', {
    method: 'POST',
    body: { email: EMAIL, code: EMAIL_CODE },
  });
  return session.accessToken;
}

/** Open the desk if it is not open yet; a second open is not an error. */
async function ensureDesk(token: string): Promise<void> {
  try {
    await call('/p2p/merchant/desk', {
      method: 'POST',
      token,
      body: { deskName: 'Demo Desk' },
    });
    console.log('desk opened');
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      console.log('desk already open');
      return;
    }
    throw err;
  }
}

const detail = (token: string, id: string) =>
  call<OrderDetail>(`/p2p/orders/${id}`, { token });

/** Drive one order from the feed to COMPLETED on the merchant side. */
async function drive(
  token: string,
  offered: FeedOrder,
  resume = false,
): Promise<string> {
  const id = offered.orderId;
  console.log(
    `${offered.side} ${id}: ${offered.usdtAmount} USDT for INR ${offered.inrAmount}, obligation ${offered.obligationUsdt}`,
  );

  // A feed item is offered, so it has no assignee yet and detail() would 403
  // for this merchant. Accept straight away; only a resume skips this.
  if (!resume) {
    await call(`/p2p/orders/${id}/accept`, {
      method: 'POST',
      token,
      idempotencyKey: randomUUID(),
    });
    console.log('  accepted');
  } else {
    console.log('  resuming an order this desk already accepted');
  }

  const deadline = Date.now() + GIVE_UP_MS;
  let submitted = false;
  let confirmed = false;
  for (;;) {
    const order = await detail(token, id);
    if (order.status === 'COMPLETED') return order.status;
    if (['REFUNDED', 'EXPIRED', 'DISPUTED'].includes(order.status)) {
      console.log(`  stopped at ${order.status}`);
      return order.status;
    }

    if (offered.side === 'SELL' && order.status === 'ACCEPTED' && !submitted) {
      await call(`/p2p/orders/${id}/utr`, {
        method: 'POST',
        token,
        body: { utr: `UTR-SEED-${Date.now()}` },
      });
      submitted = true;
      console.log(
        '  paid the rupees, reference submitted; waiting for the customer to confirm',
      );
    }
    if (
      offered.side === 'BUY' &&
      order.status === 'PAYMENT_SUBMITTED' &&
      !confirmed
    ) {
      await call(`/p2p/orders/${id}/confirm`, {
        method: 'POST',
        token,
        idempotencyKey: randomUUID(),
      });
      confirmed = true;
      console.log(
        `  rupees arrived (customer UTR ${order.utr ?? '-'}), confirmed`,
      );
    }

    if (Date.now() > deadline) throw new Error(`Timed out on order ${id}.`);
    await sleep(POLL_MS);
  }
}

async function main() {
  const only = process.argv[2];
  const token = await signIn();
  console.log(`signed in as ${EMAIL}`);
  await ensureDesk(token);

  console.log(
    only ? `waiting for order ${only}` : 'serving the feed (Ctrl-C to stop)',
  );
  const handled = new Set<string>();
  const waitDeadline = Date.now() + GIVE_UP_MS;
  let lastDetailError = 'no reason returned';
  for (;;) {
    let feed: FeedOrder[] = [];
    try {
      feed = await call<FeedOrder[]>('/p2p/merchant/feed', { token });
    } catch (err) {
      // A transient feed failure must not stop the operator loop.
      console.error(
        `feed read failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      if (only && Date.now() > waitDeadline) process.exit(1);
      await sleep(POLL_MS);
      continue;
    }
    for (const offered of feed) {
      if (handled.has(offered.orderId)) continue;
      if (only && offered.orderId !== only) continue;
      handled.add(offered.orderId);
      try {
        const status = await drive(token, offered);
        console.log(`  ${offered.orderId} ${status}`);
        if (only) {
          if (status !== 'COMPLETED') process.exit(1);
          return;
        }
      } catch (err) {
        console.error(
          `  ${offered.orderId} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        if (only) process.exit(1);
        // Serve mode: one bad order must not stop the operator loop.
      }
    }
    if (only && !handled.has(only)) {
      // Not in the feed: if this desk already accepted it (a crashed earlier
      // run) it is the assignee, so detail() authorises and we can resume.
      try {
        const existing = await detail(token, only);
        handled.add(only);
        const status = await drive(
          token,
          {
            orderId: only,
            side: existing.side,
            usdtAmount: existing.usdtAmount,
            inrAmount: existing.inrAmount,
            obligationUsdt: '-',
          },
          true,
        );
        console.log(`  ${only} ${status}`);
        if (status !== 'COMPLETED') process.exit(1);
        return;
      } catch (err) {
        lastDetailError = err instanceof Error ? err.message : String(err);
      }
      if (Date.now() > waitDeadline) {
        console.error(
          `Order ${only} is not in the feed and cannot be resumed: ${lastDetailError}`,
        );
        process.exit(1);
      }
    }
    await sleep(POLL_MS);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
