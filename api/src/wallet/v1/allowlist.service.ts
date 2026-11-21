import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { isAddress } from 'viem';
import * as schema from '../../db/schema';
import { AuditService } from '../../audit/audit.service';
import { MfaService } from '../../auth/v1/mfa.service';
import { DRIZZLE } from '../../ledger/account.service';
import {
  fixedSettings,
  type SettingsReader,
} from '../../settings/platform-settings';

type Db = NodePgDatabase<typeof schema>;

export interface AllowlistEntry {
  id: string;
  address: string;
  label: string | null;
  usableFrom: Date;
}

const HOUR_MS = 3_600_000;

/**
 * Where a user is allowed to withdraw to (PRD §8.4).
 *
 * Two of the three controls on a withdrawal live here, and they are aimed at
 * the same attacker: someone holding a stolen session. The allowlist means
 * they cannot withdraw to an address of their own without first adding it;
 * the cooldown means adding it does not help them today. The gap between
 * those two facts is the window in which the real owner reads the security
 * email and intervenes.
 */
@Injectable()
export class AllowlistService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly mfa: MfaService,
    private readonly audit: AuditService,
    private readonly settings: SettingsReader = fixedSettings(),
    private readonly networkCode = 'BSC_TESTNET',
  ) {}

  async add(
    userId: string,
    address: string,
    otpCode: string,
    options: { label?: string; now?: number } = {},
  ): Promise<AllowlistEntry> {
    const now = options.now ?? Date.now();

    if (!isAddress(address)) {
      throw new BadRequestException(
        `"${address}" is not a BSC address. A withdrawal to a mistyped address is unrecoverable.`,
      );
    }
    await this.mfa.verify(userId, otpCode, now);

    const cooldownHours = await this.settings.integer(
      'withdrawal.addressCooldownHours',
    );
    const networkId = await this.networkId();

    // An address already saved keeps the `usable_from` it was given. Letting
    // a re-save move it forwards would make the cooldown optional: add,
    // re-add, and the clock restarts from whenever suits the attacker.
    await this.db
      .insert(schema.withdrawalAddress)
      .values({
        userId,
        networkId,
        address,
        label: options.label ?? null,
        usableFrom: new Date(now + cooldownHours * HOUR_MS),
      })
      .onConflictDoNothing();

    const entry = await this.find(userId, address);
    if (!entry) {
      throw new BadRequestException('That address could not be saved.');
    }

    await this.audit.record({
      actorId: userId,
      action: 'WITHDRAWAL_ADDRESS_ADD',
      entity: 'withdrawal_address',
      entityId: entry.id,
      reason: 'user added a withdrawal address',
      newValue: {
        address: entry.address,
        usableFrom: entry.usableFrom.toISOString(),
      },
    });

    return entry;
  }

  async list(userId: string): Promise<AllowlistEntry[]> {
    const rows = await this.db
      .select()
      .from(schema.withdrawalAddress)
      .where(
        and(
          eq(schema.withdrawalAddress.userId, userId),
          isNull(schema.withdrawalAddress.revokedAt),
        ),
      );
    return rows.map(toEntry);
  }

  /**
   * Throws unless this user may withdraw to this address right now. Separate
   * reasons, because "not on your allowlist" and "not usable until tomorrow"
   * ask the user for two different things.
   */
  async assertUsable(
    userId: string,
    address: string,
    now: number = Date.now(),
  ): Promise<AllowlistEntry> {
    const entry = await this.find(userId, address);
    if (!entry) {
      throw new ForbiddenException(
        'That address is not on your withdrawal allowlist.',
      );
    }
    if (entry.usableFrom.getTime() > now) {
      throw new ForbiddenException(
        `That address is not usable until ${entry.usableFrom.toISOString()}. A newly added address waits out a cooldown before it can be withdrawn to.`,
      );
    }
    return entry;
  }

  /** Addresses are compared case-insensitively; EVM checksums are cosmetic. */
  private async find(
    userId: string,
    address: string,
  ): Promise<AllowlistEntry | null> {
    const [row] = await this.db
      .select()
      .from(schema.withdrawalAddress)
      .where(
        and(
          eq(schema.withdrawalAddress.userId, userId),
          sql`lower(${schema.withdrawalAddress.address}) = lower(${address})`,
          isNull(schema.withdrawalAddress.revokedAt),
        ),
      )
      .limit(1);

    return row ? toEntry(row) : null;
  }

  private async networkId(): Promise<string> {
    const [row] = await this.db
      .select({ id: schema.blockchainNetwork.id })
      .from(schema.blockchainNetwork)
      .where(eq(schema.blockchainNetwork.code, this.networkCode))
      .limit(1);

    if (!row) {
      throw new Error(
        `No blockchain_network row for "${this.networkCode}". Seed it before allowlisting addresses.`,
      );
    }
    return row.id;
  }
}

function toEntry(row: typeof schema.withdrawalAddress.$inferSelect) {
  return {
    id: row.id,
    address: row.address,
    label: row.label,
    usableFrom: row.usableFrom,
  };
}
