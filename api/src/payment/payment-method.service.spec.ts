import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { makeTestDb, seedUser, type TestDb } from '../ledger/test-db';
import { PaymentMethodService } from './payment-method.service';

let t: TestDb;
let service: PaymentMethodService;
let userId: string;
let otherId: string;

const BANK = {
  type: 'BANK' as const,
  label: 'Primary HDFC',
  holderName: 'Aarav Sharma',
  accountNumber: '50100123456789',
  ifsc: 'HDFC0001234',
};

const UPI = {
  type: 'UPI' as const,
  label: 'GPay',
  holderName: 'Aarav Sharma',
  upiVpa: 'aarav.sharma@okhdfcbank',
};

beforeAll(() => {
  t = makeTestDb();
}, 30000);

beforeEach(async () => {
  await t.reset();
  service = new PaymentMethodService(t.db, new AuditService(t.db));
  userId = await seedUser(t.pool, 'payer@example.test');
  otherId = await seedUser(t.pool, 'other@example.test');
});

afterAll(async () => {
  await t.close();
});

describe('adding a method (PRD §6.3/§6.4)', () => {
  it('stores a bank method and returns it', async () => {
    const m = await service.add(userId, BANK);
    expect(m.type).toBe('BANK');
    expect(m.accountNumber).toBe(BANK.accountNumber);
    expect(m.ifsc).toBe('HDFC0001234');
    expect(m.upiVpa).toBeNull();
  });

  it('stores a upi method', async () => {
    const m = await service.add(userId, UPI);
    expect(m.type).toBe('UPI');
    expect(m.upiVpa).toBe('aarav.sharma@okhdfcbank');
    expect(m.accountNumber).toBeNull();
  });

  it('the first method a user adds is their default', async () => {
    const m = await service.add(userId, BANK);
    expect(m.isDefault).toBe(true);
  });

  it('a second method is not automatically default', async () => {
    await service.add(userId, BANK);
    const second = await service.add(userId, UPI);
    expect(second.isDefault).toBe(false);
  });

  it('rejects a bank method with no IFSC', async () => {
    await expect(
      service.add(userId, { ...BANK, ifsc: undefined }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a malformed IFSC', async () => {
    await expect(
      service.add(userId, { ...BANK, ifsc: 'nothdfc' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a non-numeric account number', async () => {
    await expect(
      service.add(userId, { ...BANK, accountNumber: '12-34' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a malformed UPI VPA', async () => {
    await expect(
      service.add(userId, { ...UPI, upiVpa: 'not-a-vpa' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('listing (object-level, PRD §13.5)', () => {
  it('returns only this user’s live methods', async () => {
    await service.add(userId, BANK);
    await service.add(otherId, UPI);
    const mine = await service.list(userId);
    expect(mine).toHaveLength(1);
    expect(mine[0].type).toBe('BANK');
  });

  it('never returns a removed method', async () => {
    const m = await service.add(userId, BANK);
    await service.remove(userId, m.id);
    expect(await service.list(userId)).toHaveLength(0);
  });
});

describe('default (one live default per user)', () => {
  it('setDefault moves the flag so exactly one is default', async () => {
    const first = await service.add(userId, BANK);
    const second = await service.add(userId, UPI);
    await service.setDefault(userId, second.id);
    const list = await service.list(userId);
    const defaults = list.filter((m) => m.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe(second.id);
    expect(list.find((m) => m.id === first.id)?.isDefault).toBe(false);
  });

  it('exposes the live default', async () => {
    const first = await service.add(userId, BANK);
    expect((await service.defaultFor(userId))?.id).toBe(first.id);
  });
});

describe('removal is soft and scoped', () => {
  it('soft-deletes: the row survives for an order snapshot to reference', async () => {
    const m = await service.add(userId, BANK);
    await service.remove(userId, m.id);
    const row = await t.pool.query(
      `SELECT deleted_at FROM payment_method WHERE id = $1`,
      [m.id],
    );
    expect(
      (row.rows[0] as { deleted_at: Date | null }).deleted_at,
    ).not.toBeNull();
  });

  it('cannot remove another user’s method (IDOR)', async () => {
    const m = await service.add(otherId, BANK);
    await expect(service.remove(userId, m.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('cannot set another user’s method as default (IDOR)', async () => {
    const m = await service.add(otherId, BANK);
    await expect(service.setDefault(userId, m.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
