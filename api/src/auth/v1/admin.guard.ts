import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { DRIZZLE } from '../../ledger/account.service';

type Db = NodePgDatabase<typeof schema>;

export const REQUIRES_ADMIN = 'requiresAdmin';

/** Mark a route as changing the platform, not one account's own data. */
export const RequiresAdmin = () => SetMetadata(REQUIRES_ADMIN, true);

/**
 * PRD §9.2 and §9.4.
 *
 * Roles are read from the database on every call rather than trusted from the
 * access token. A token minted before an admin was stood down would otherwise
 * keep its powers until it expired, and the moment you most want a revocation
 * to bite is the moment you have just revoked it.
 *
 * SUPPORT is deliberately refused. The separation that matters is between
 * people who look at things and people who move money.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gated = this.reflector.getAllAndOverride<boolean>(REQUIRES_ADMIN, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!gated) return true;

    const req = context.switchToHttp().getRequest<{ user?: { sub: string } }>();
    const userId = req.user?.sub;
    if (!userId) {
      throw new ForbiddenException('This area is limited to administrators.');
    }

    const [row] = await this.db
      .select({ id: schema.userRole.id })
      .from(schema.userRole)
      .innerJoin(schema.role, eq(schema.role.id, schema.userRole.roleId))
      .where(
        and(
          eq(schema.userRole.userId, userId),
          eq(schema.role.name, 'SUPER_ADMIN'),
        ),
      )
      .limit(1);

    if (!row) {
      throw new ForbiddenException('This area is limited to administrators.');
    }
    return true;
  }
}
