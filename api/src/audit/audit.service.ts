import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../ledger/account.service';

type Db = NodePgDatabase<typeof schema>;

export interface AuditRecord {
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  /** PRD §9.4: every privileged action requires a typed reason code. */
  reason: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async record(entry: AuditRecord): Promise<string> {
    const reason = entry.reason?.trim() ?? '';
    if (!reason) {
      throw new BadRequestException(
        'A privileged action needs a reason code. An audit row that explains nothing is worse than none — it looks like oversight while providing none.',
      );
    }

    const [row] = await this.db
      .insert(schema.auditLog)
      .values({
        actorId: entry.actorId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        reason,
        oldValue: entry.oldValue ?? null,
        newValue: entry.newValue ?? null,
        ipAddress: entry.ipAddress ?? null,
      })
      .returning({ id: schema.auditLog.id });

    return row.id;
  }
}
