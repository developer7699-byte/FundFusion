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

export const REQUIRES_MONEY_GATE = 'requiresMoneyGate';

/**
 * Mark a route as a money operation. PRD §9.1 (revised 2026-11-21): until an
 * authenticator is enrolled the account has no deposit address, no balance,
 * and cannot place orders.
 */
export const RequiresMoneyGate = () => SetMetadata(REQUIRES_MONEY_GATE, true);

/**
 * The financial gate.
 *
 * A guard rather than a check inside each controller, so a new money route
 * cannot forget it — and both conditions are read from the database on every
 * call, so removing someone's authenticator closes the gate immediately
 * rather than when their token expires.
 */
@Injectable()
export class MoneyGateGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gated = this.reflector.getAllAndOverride<boolean>(
      REQUIRES_MONEY_GATE,
      [context.getHandler(), context.getClass()],
    );
    if (!gated) return true;

    const req = context.switchToHttp().getRequest<{ user?: { sub: string } }>();
    const userId = req.user?.sub;
    if (!userId) {
      throw new ForbiddenException('Sign in to continue.');
    }

    const [row] = await this.db
      .select({
        emailVerifiedAt: schema.user.emailVerifiedAt,
        mfaEnrolledAt: schema.user.mfaEnrolledAt,
      })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    if (!row?.emailVerifiedAt) {
      throw new ForbiddenException(
        'Verify your email address before using this feature.',
      );
    }
    if (!row.mfaEnrolledAt) {
      throw new ForbiddenException(
        'Set up your authenticator app before moving money.',
      );
    }
    return true;
  }
}
