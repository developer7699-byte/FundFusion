import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { DRIZZLE } from '../../ledger/account.service';

type Db = NodePgDatabase<typeof schema>;

export const REQUIRES_VERIFIED_PHONE = 'requiresVerifiedPhone';

/**
 * Mark a route as a money operation. PRD §9.1: until a phone is verified an
 * account has no deposit address, no balance, and cannot place orders.
 */
export const RequiresVerifiedPhone = () =>
  SetMetadata(REQUIRES_VERIFIED_PHONE, true);

/**
 * The gate is a guard rather than a check inside each controller, so a new
 * money route cannot forget it — forgetting the decorator fails closed only if
 * the route is also unreachable, which is the point of auditing the decorator
 * in one place.
 */
@Injectable()
export class PhoneGateGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gated = this.reflector.getAllAndOverride<boolean>(
      REQUIRES_VERIFIED_PHONE,
      [context.getHandler(), context.getClass()],
    );
    if (!gated) return true;

    const req = context.switchToHttp().getRequest<{ user?: { sub: string } }>();
    const userId = req.user?.sub;
    if (!userId) {
      throw new ForbiddenException(
        'Sign in and verify your phone to continue.',
      );
    }

    const [row] = await this.db
      .select({ phoneVerifiedAt: schema.user.phoneVerifiedAt })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    if (!row?.phoneVerifiedAt) {
      throw new ForbiddenException(
        'Verify your phone number before using this feature.',
      );
    }
    return true;
  }
}
