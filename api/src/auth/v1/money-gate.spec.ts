import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { makeTestDb, seedUser, type TestDb } from '../../ledger/test-db';
import { MfaService } from './mfa.service';
import { MoneyGateGuard } from './money-gate.guard';
import { timeCounter, totpCode } from './totp';

let t: TestDb;
let guard: MoneyGateGuard;
let mfa: MfaService;
let userId: string;

function ctx(id?: string, gated = true): ExecutionContext {
  (guard as unknown as { reflector: Reflector }).reflector = {
    getAllAndOverride: () => gated,
  } as unknown as Reflector;
  return {
    switchToHttp: () => ({
      getRequest: () => (id ? { user: { sub: id } } : {}),
    }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

beforeAll(() => {
  t = makeTestDb();
  guard = new MoneyGateGuard(t.db, {
    getAllAndOverride: () => true,
  } as unknown as Reflector);
}, 30000);

beforeEach(async () => {
  await t.reset();
  mfa = new MfaService(t.db);
  userId = await seedUser(t.pool, 'person@example.test');
});

afterAll(async () => {
  await t.close();
});

async function verifyEmail() {
  await t.pool.query(
    `UPDATE "user" SET email_verified_at = now() WHERE id = $1`,
    [userId],
  );
}

async function enrol() {
  const { secret } = await mfa.beginEnrolment(userId);
  await mfa.confirmEnrolment(userId, totpCode(secret, timeCounter(Date.now())));
}

/**
 * PRD §9.1, revised 2026-11-21. Browsing needs a verified email; moving money
 * needs an enrolled authenticator. The guard — not each controller — is what
 * enforces it, so a new money route cannot forget.
 */
describe('the financial gate', () => {
  it('admits a verified account with an authenticator', async () => {
    await verifyEmail();
    await enrol();

    await expect(guard.canActivate(ctx(userId))).resolves.toBe(true);
  });

  it('refuses an account with no authenticator', async () => {
    await verifyEmail();

    await expect(guard.canActivate(ctx(userId))).rejects.toThrow(
      /authenticator/i,
    );
  });

  it('refuses an unverified email even with an authenticator', async () => {
    await enrol();

    await expect(guard.canActivate(ctx(userId))).rejects.toThrow(/email/i);
  });

  it('refuses an anonymous caller', async () => {
    await expect(guard.canActivate(ctx(undefined))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('ignores routes that are not money operations', async () => {
    await expect(guard.canActivate(ctx(userId, false))).resolves.toBe(true);
  });

  /** Removing the second factor must close the gate again, immediately. */
  it('refuses once the authenticator is removed', async () => {
    await verifyEmail();
    await enrol();
    await t.pool.query(
      `UPDATE "user" SET mfa_enrolled_at = NULL WHERE id = $1`,
      [userId],
    );

    await expect(guard.canActivate(ctx(userId))).rejects.toThrow(
      /authenticator/i,
    );
  });
});
