import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { and, eq, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { DRIZZLE } from '../../ledger/account.service';

type Db = NodePgDatabase<typeof schema>;

export const REQUIRES_STAFF = 'requiresStaff';

/** Mark a route as readable by any staff member. */
export const RequiresStaff = () => SetMetadata(REQUIRES_STAFF, true);

/**
 * Reading, for either staff role (PRD §9.2).
 *
 * The counterpart to `AdminGuard`, which admits SUPER_ADMIN alone. The whole
 * point of having two roles in v1 is that SUPPORT reads everything and moves
 * no money — so a read gate that admitted only SUPER_ADMIN would make the
 * SUPPORT role useless, and one that let SUPPORT write would make it
 * dangerous. Roles are read from the database on every call, so standing
 * someone down takes effect immediately rather than when their token expires.
 */
@Injectable()
export class StaffGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gated = this.reflector.getAllAndOverride<boolean>(REQUIRES_STAFF, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!gated) return true;

    const req = context.switchToHttp().getRequest<{ user?: { sub: string } }>();
    const userId = req.user?.sub;
    if (!userId) {
      throw new ForbiddenException('This area is limited to staff.');
    }

    const [row] = await this.db
      .select({ id: schema.userRole.id })
      .from(schema.userRole)
      .innerJoin(schema.role, eq(schema.role.id, schema.userRole.roleId))
      .where(
        and(
          eq(schema.userRole.userId, userId),
          inArray(schema.role.name, ['SUPPORT', 'SUPER_ADMIN']),
        ),
      )
      .limit(1);

    if (!row) {
      throw new ForbiddenException('This area is limited to staff.');
    }
    return true;
  }
}
