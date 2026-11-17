import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PhoneGateGuard, REQUIRES_VERIFIED_PHONE } from './phone-gate.guard';
import { OtpService } from './otp.service';
import { makeTestDb, seedUser, type TestDb } from '../../ledger/test-db';

let t: TestDb;
let guard: PhoneGateGuard;
let otp: OtpService;
let verified: string;
let unverified: string;

const PHONE = '+919812345678';
const CODE = '246810';

/** Minimal ExecutionContext carrying a user, as JwtAuthGuard would leave it. */
function ctx(userId: string, gated = true): ExecutionContext {
  const reflector = { getAllAndOverride: () => gated } as unknown as Reflector;
  (guard as unknown as { reflector: Reflector }).reflector = reflector;
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: { sub: userId } }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

beforeAll(() => {
  process.env.OTP_STATIC_DEV = CODE;
  t = makeTestDb();
  otp = new OtpService(t.db);
  guard = new PhoneGateGuard(t.db, {
    getAllAndOverride: () => true,
  } as unknown as Reflector);
}, 30000);

beforeEach(async () => {
  await t.reset();
  verified = await seedUser(t.pool, 'verified@example.test');
  unverified = await seedUser(t.pool, 'unverified@example.test');
  await otp.request(verified, PHONE);
  await otp.verify(verified, PHONE, CODE);
});

afterAll(async () => {
  await t.close();
});

describe('the financial gate (PRD §9.1)', () => {
  it('an unverified phone cannot reach a gated operation', async () => {
    await expect(guard.canActivate(ctx(unverified))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('the refusal says what to do about it', async () => {
    await expect(guard.canActivate(ctx(unverified))).rejects.toThrow(
      /verify your phone/i,
    );
  });

  it('a verified phone passes the gate', async () => {
    await expect(guard.canActivate(ctx(verified))).resolves.toBe(true);
  });

  it('an ungated route is not blocked', async () => {
    guard = new PhoneGateGuard(t.db, {
      getAllAndOverride: () => false,
    } as unknown as Reflector);
    await expect(guard.canActivate(ctx(unverified, false))).resolves.toBe(true);
    guard = new PhoneGateGuard(t.db, {
      getAllAndOverride: () => true,
    } as unknown as Reflector);
  });

  it('the decorator key is what the guard reads', () => {
    expect(REQUIRES_VERIFIED_PHONE).toBe('requiresVerifiedPhone');
  });
});
