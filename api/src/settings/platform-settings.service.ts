import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { AuditService } from '../audit/audit.service';
import { DRIZZLE } from '../ledger/account.service';
import { usdt, usdtString } from '../money/money';
import {
  PLATFORM_SETTINGS,
  SETTING_KEYS,
  type SettingDefinition,
  type SettingKey,
} from './platform-settings';

type Db = NodePgDatabase<typeof schema>;

export interface SettingChange {
  actorId: string | null;
  /** PRD §9.4: a privileged action with no reason explains nothing later. */
  reason: string;
}

export interface SettingView {
  value: string | number;
  default: string | number;
  min: string | number;
  max: string | number;
  kind: SettingDefinition['kind'];
  description: string;
}

/**
 * The commercial numbers, held where an admin can change them and an auditor
 * can see who did (PRD §9.4). Nothing here is a secret — see
 * `platform-settings.ts` for why that line exists.
 *
 * Values are read per call rather than injected once at construction, so a
 * change takes effect on the next order rather than on the next deploy. The
 * engine's hot paths read two or three of these, which is a cheap indexed
 * lookup against the cost of restarting a service to change a markup.
 */
@Injectable()
export class PlatformSettingsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async integer(key: SettingKey): Promise<number> {
    const value = await this.value(key);
    return Number(value);
  }

  /** Money leaves this service as a string, like every other amount. */
  async money(key: SettingKey): Promise<string> {
    return usdtString(usdt(String(await this.value(key))));
  }

  async all(): Promise<Record<SettingKey, SettingView>> {
    const stored = await this.stored();
    const out = {} as Record<SettingKey, SettingView>;

    for (const key of SETTING_KEYS) {
      const definition = PLATFORM_SETTINGS[key];
      out[key] = {
        value: stored.get(key) ?? definition.default,
        default: definition.default,
        min: definition.min,
        max: definition.max,
        kind: definition.kind,
        description: definition.description,
      };
    }
    return out;
  }

  /**
   * Change one number. Validated before it is stored, so a refused change
   * leaves the previous value in place — a half-applied commercial parameter
   * is worse than a rejected one.
   */
  async set(
    key: SettingKey,
    value: string | number,
    change: SettingChange,
  ): Promise<void> {
    const definition = PLATFORM_SETTINGS[key] as SettingDefinition | undefined;
    if (!definition) {
      throw new BadRequestException(`Unknown setting "${String(key)}".`);
    }

    const next = this.validate(key, definition, value);
    const previous = (await this.stored()).get(key) ?? definition.default;

    await this.db
      .insert(schema.systemSetting)
      .values({ key, value: { value: next } })
      .onConflictDoUpdate({
        target: schema.systemSetting.key,
        set: { value: { value: next }, updatedAt: new Date() },
      });

    await this.audit.record({
      actorId: change.actorId,
      action: 'SETTING_CHANGE',
      entity: 'system_setting',
      entityId: key,
      reason: change.reason,
      oldValue: { value: previous },
      newValue: { value: next },
    });
  }

  private validate(
    key: SettingKey,
    definition: SettingDefinition,
    value: string | number,
  ): string | number {
    if (definition.kind === 'INTEGER') {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        throw new BadRequestException(`${key} must be a number.`);
      }
      if (!Number.isInteger(n)) {
        throw new BadRequestException(`${key} must be a whole number.`);
      }
      if (n < Number(definition.min) || n > Number(definition.max)) {
        throw new BadRequestException(
          `${key} must be between ${definition.min} and ${definition.max}.`,
        );
      }
      return n;
    }

    // Money: parsed by the same code every other amount goes through, so a
    // value this column cannot hold exactly is refused here rather than
    // silently truncated on the way in.
    const amount = usdt(String(value));
    if (
      amount.lt(usdt(String(definition.min))) ||
      amount.gt(usdt(String(definition.max)))
    ) {
      throw new BadRequestException(
        `${key} must be between ${definition.min} and ${definition.max}.`,
      );
    }
    return usdtString(amount);
  }

  private async value(key: SettingKey): Promise<string | number> {
    const [row] = await this.db
      .select({ value: schema.systemSetting.value })
      .from(schema.systemSetting)
      .where(eq(schema.systemSetting.key, key))
      .limit(1);

    return (
      (row?.value as { value: string | number } | undefined)?.value ??
      PLATFORM_SETTINGS[key].default
    );
  }

  private async stored(): Promise<Map<string, string | number>> {
    const rows = await this.db
      .select({
        key: schema.systemSetting.key,
        value: schema.systemSetting.value,
      })
      .from(schema.systemSetting);

    return new Map(
      rows.map((r) => [r.key, (r.value as { value: string | number }).value]),
    );
  }
}
