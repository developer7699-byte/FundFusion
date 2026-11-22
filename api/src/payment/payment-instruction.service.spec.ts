import { UnprocessableEntityException } from '@nestjs/common';
import type { Pool } from 'pg';
import { AuditService } from '../audit/audit.service';
import { makeTestDb, seedUser, type TestDb } from '../ledger/test-db';
import { PaymentInstructionService } from './payment-instruction.service';
import { PaymentMethodService } from './payment-method.service';

let t: TestDb;
let instructions: PaymentInstructionService;
let methods: PaymentMethodService;
let payeeId: string;

const BANK = {
  type: 'BANK' as const,
  label: 'HDFC',
  holderName: 'Aarav Sharma',
  accountNumber: '50100123456789',
  ifsc: 'HDFC0001234',
};

/** A bare order to bind against — the engine owns the real confirm/accept path. */
async function seedOrder(pool: Pool, customerId: string): Promise<string> {
  const q = await pool.query(
    `INSERT INTO p2p_quote
       (user_id, side, reference_rate, customer_rate, markup_bps, usdt_amount,
        inr_amount, authoritative_side, platform_fee_usdt, provider, expires_at)
     VALUES ($1,'SELL','96.00','97.00',100,'100','9700','CRYPTO','3','mock', now() + interval '1 hour')
     RETURNING id`,
    [customerId],
  );
  const o = await pool.query(
    `INSERT INTO p2p_order (quote_id, customer_id, status, idempotency)
     VALUES ($1, $2, 'AWAITING_MERCHANT', $3) RETURNING id`,
    [(q.rows[0] as { id: string }).id, customerId, `idem-${Math.random()}`],
  );
  return (o.rows[0] as { id: string }).id;
}

beforeAll(() => {
  t = makeTestDb();
}, 30000);

beforeEach(async () => {
  await t.reset();
  instructions = new PaymentInstructionService(t.db);
  methods = new PaymentMethodService(t.db, new AuditService(t.db));
  payeeId = await seedUser(t.pool, 'payee@example.test');
});

afterAll(async () => {
  await t.close();
});

it('freezes the payee’s default method onto the order', async () => {
  await methods.add(payeeId, BANK);
  const orderId = await seedOrder(t.pool, payeeId);

  const bound = await instructions.bind(orderId, payeeId);
  expect(bound.orderId).toBe(orderId);
  expect(bound.type).toBe('BANK');
  expect(bound.accountNumber).toBe('50100123456789');
  expect(bound.ifsc).toBe('HDFC0001234');
});

it('binds a specifically chosen method', async () => {
  await methods.add(payeeId, BANK);
  const upi = await methods.add(payeeId, {
    type: 'UPI',
    label: 'GPay',
    holderName: 'Aarav Sharma',
    upiVpa: 'aarav@okhdfcbank',
  });
  const orderId = await seedOrder(t.pool, payeeId);

  const bound = await instructions.bind(orderId, payeeId, { methodId: upi.id });
  expect(bound.type).toBe('UPI');
  expect(bound.upiVpa).toBe('aarav@okhdfcbank');
});

it('refuses to bind when the payee has no method (422)', async () => {
  const orderId = await seedOrder(t.pool, payeeId);
  await expect(instructions.bind(orderId, payeeId)).rejects.toBeInstanceOf(
    UnprocessableEntityException,
  );
});

it('refuses a method the payee does not own (422)', async () => {
  const strangerId = await seedUser(t.pool, 'stranger@example.test');
  const theirs = await methods.add(strangerId, BANK);
  const orderId = await seedOrder(t.pool, payeeId);
  await expect(
    instructions.bind(orderId, payeeId, { methodId: theirs.id }),
  ).rejects.toBeInstanceOf(UnprocessableEntityException);
});

it('is immutable: removing the source method does not change the snapshot', async () => {
  const m = await methods.add(payeeId, BANK);
  const orderId = await seedOrder(t.pool, payeeId);
  await instructions.bind(orderId, payeeId);

  await methods.remove(payeeId, m.id);

  const row = await t.pool.query(
    `SELECT account_number, ifsc FROM order_payment_instruction WHERE order_id = $1`,
    [orderId],
  );
  const snap = row.rows[0] as { account_number: string; ifsc: string };
  expect(snap.account_number).toBe('50100123456789');
  expect(snap.ifsc).toBe('HDFC0001234');
});

it('is idempotent: binding twice keeps one instruction', async () => {
  await methods.add(payeeId, BANK);
  const orderId = await seedOrder(t.pool, payeeId);

  const first = await instructions.bind(orderId, payeeId);
  const second = await instructions.bind(orderId, payeeId);
  expect(second).toEqual(first);

  const count = await t.pool.query(
    `SELECT count(*)::int AS n FROM order_payment_instruction WHERE order_id = $1`,
    [orderId],
  );
  expect((count.rows[0] as { n: number }).n).toBe(1);
});
