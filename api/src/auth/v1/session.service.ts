import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { DRIZZLE } from '../../ledger/account.service';

type Db = NodePgDatabase<typeof schema>;

export interface DeviceInfo {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** PRD §19: access 15 minutes, refresh 7 days, with rotation and a device list. */
const ACCESS_TTL_MS = 15 * 60_000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60_000;

@Injectable()
export class SessionService {
  private readonly jwt = new JwtService({});

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async issue(userId: string, device: DeviceInfo = {}): Promise<TokenPair> {
    return this.mint(userId, randomUUID(), device);
  }

  /**
   * Rotate a refresh token.
   *
   * Presenting a token that was already rotated means it leaked, so the whole
   * family is revoked rather than just that row — the attacker and the real
   * user both lose the session, which is the correct outcome when you cannot
   * tell which one is presenting it (PRD §13.5).
   */
  async rotate(refreshToken: string): Promise<TokenPair> {
    const candidates = await this.db
      .select()
      .from(schema.session)
      .orderBy(desc(schema.session.createdAt));

    let match: (typeof candidates)[number] | undefined;
    for (const row of candidates) {
      if (await bcrypt.compare(refreshToken, row.refreshTokenHash)) {
        match = row;
        break;
      }
    }

    if (!match) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (match.revokedAt) {
      await this.revokeFamily(match.familyId);
      throw new UnauthorizedException(
        'Refresh token reuse detected. Every session on this device has been revoked.',
      );
    }

    if (match.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired. Sign in again.');
    }

    const next = await this.mint(match.userId, match.familyId, {
      userAgent: match.userAgent,
      ipAddress: match.ipAddress,
    });

    await this.db
      .update(schema.session)
      .set({ revokedAt: new Date() })
      .where(eq(schema.session.id, match.id));

    return next;
  }

  async revokeAll(userId: string): Promise<void> {
    await this.db
      .update(schema.session)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(schema.session.userId, userId),
          isNull(schema.session.revokedAt),
        ),
      );
  }

  async devices(userId: string) {
    return this.db
      .select({
        id: schema.session.id,
        userAgent: schema.session.userAgent,
        ipAddress: schema.session.ipAddress,
        createdAt: schema.session.createdAt,
        revokedAt: schema.session.revokedAt,
      })
      .from(schema.session)
      .where(eq(schema.session.userId, userId))
      .orderBy(desc(schema.session.createdAt));
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.db
      .update(schema.session)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(schema.session.familyId, familyId),
          isNull(schema.session.revokedAt),
        ),
      );
  }

  private async mint(
    userId: string,
    familyId: string,
    device: DeviceInfo,
  ): Promise<TokenPair> {
    const refreshToken = randomBytes(32).toString('hex');

    // The access token is a signed JWT so it can be verified without a
    // database round trip. The refresh token is opaque on purpose: it is only
    // ever checked against its stored hash.
    const accessToken = await this.jwt.signAsync(
      { sub: userId, sid: familyId },
      {
        secret:
          process.env.JWT_ACCESS_SECRET ?? 'development_only_access_secret',
        expiresIn: Math.floor(ACCESS_TTL_MS / 1000),
      },
    );

    await this.db.insert(schema.session).values({
      userId,
      familyId,
      refreshTokenHash: await bcrypt.hash(refreshToken, 10),
      userAgent: device.userAgent ?? null,
      ipAddress: device.ipAddress ?? null,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });

    return { accessToken, refreshToken };
  }
}
