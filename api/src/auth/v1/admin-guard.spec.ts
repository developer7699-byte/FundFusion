import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminGuard, REQUIRES_ADMIN } from './admin.guard';
import { makeTestDb, seedUser, type TestDb } from '../../ledger/test-db';

let t: TestDb;
let guard: AdminGuard;
let admin: string;
let support: string;
let customer: string;

function ctx(userId?: string, gated = true): ExecutionContext {
  (guard as unknown as { reflector: Reflector }).reflector = {
    getAllAndOverride: () => gated,
  } as unknown as Reflector;
  return {
    switchToHttp: () => ({
      getRequest: () => (userId ? { user: { sub: userId } } : {}),
    }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

async function give(userId: string, role: string) {
  await t.pool.query(
    `INSERT INTO user_role (user_id, role_id)
     SELECT $1, id FROM role WHERE name = $2`,
    [userId, role],
  );
}

beforeAll(() => {
  t = makeTestDb();
  guard = new AdminGuard(t.db, {
    getAllAndOverride: () => true,
  } as unknown as Reflector);
}, 30000);

beforeEach(async () => {
  await t.reset();
  for (const name of ['CUSTOMER', 'SUPPORT', 'SUPER_ADMIN']) {
    await t.pool.query(`INSERT INTO role (name) VALUES ($1)`, [name]);
  }
  admin = await seedUser(t.pool, 'admin@example.test');
  support = await seedUser(t.pool, 'support@example.test');
  customer = await seedUser(t.pool, 'customer@example.test');
  await give(admin, 'SUPER_ADMIN');
  await give(support, 'SUPPORT');
  await give(customer, 'CUSTOMER');
});

afterAll(async () => {
  await t.close();
});

/**
 * PRD §9.2. The essential separation is between people who look at things and
 * people who move money: a support account able to change a markup or release
 * escrow is the most common insider-fraud path in platforms like this.
 */
describe('AdminGuard', () => {
  it('admits a SUPER_ADMIN', async () => {
    await expect(guard.canActivate(ctx(admin))).resolves.toBe(true);
  });

  it('refuses SUPPORT, who reads everything and moves nothing', async () => {
    await expect(guard.canActivate(ctx(support))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('refuses a customer', async () => {
    await expect(guard.canActivate(ctx(customer))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('refuses an anonymous caller', async () => {
    await expect(guard.canActivate(ctx(undefined))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('ignores routes that are not marked', async () => {
    await expect(guard.canActivate(ctx(customer, false))).resolves.toBe(true);
  });

  it('refuses a user whose admin role was revoked', async () => {
    await t.pool.query(`DELETE FROM user_role WHERE user_id = $1`, [admin]);

    await expect(guard.canActivate(ctx(admin))).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('the marker', () => {
  it('names the metadata key the controller sets', () => {
    expect(REQUIRES_ADMIN).toBe('requiresAdmin');
  });
});
