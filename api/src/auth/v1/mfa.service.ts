import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { DRIZZLE } from '../../ledger/account.service';
import { generateSecret, provisioningUri, timeCounter, totpCode } from './totp';

type Db = NodePgDatabase<typeof schema>;

/** One window either side, for the clock drift every phone has. */
const DRIFT_WINDOWS = 1n;

/**
 * The authenticator (PRD §9.1, revised 2026-11-21).
 *
 * This is the financial gate: an account without an enrolled authenticator
 * has no deposit address, no balance and cannot place orders. It is also the
 * fresh factor a withdrawal needs on top of a session (§8.4), which is why a
 * code is accepted exactly once.
 */
@Injectable()
export class MfaService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async beginEnrolment(
    userId: string,
  ): Promise<{ secret: string; uri: string }> {
    const user = await this.load(userId);

    if (user.mfaEnrolledAt) {
      // Otherwise anyone holding a live session quietly swaps the second
      // factor for one they control.
      throw new ConflictException(
        'An authenticator is already enrolled on this account. Removing it is a support action, not a self-service one.',
      );
    }

    const secret = generateSecret();
    await this.db
      .update(schema.user)
      .set({ mfaSecret: secret, updatedAt: new Date() })
      .where(eq(schema.user.id, userId));

    return {
      secret,
      uri: provisioningUri(secret, user.email, 'FundFusion'),
    };
  }

  /** Enrolment completes only once a code proves the app holds the secret. */
  async confirmEnrolment(
    userId: string,
    code: string,
    now: number = Date.now(),
  ): Promise<void> {
    const user = await this.load(userId);
    if (!user.mfaSecret) {
      throw new BadRequestException('Start enrolment before confirming it.');
    }

    const counter = this.match(user.mfaSecret, code, now);
    if (counter === null) {
      throw new BadRequestException(
        'That code does not match. Check the time on the phone running the authenticator.',
      );
    }

    await this.db
      .update(schema.user)
      .set({
        mfaEnrolledAt: new Date(now),
        mfaLastCounter: counter,
        updatedAt: new Date(),
      })
      .where(eq(schema.user.id, userId));
  }

  async isEnrolled(userId: string): Promise<boolean> {
    return Boolean((await this.load(userId)).mfaEnrolledAt);
  }

  /**
   * Throws unless the code is valid and has not been used. A code stays valid
   * for its whole window, so accepting it twice would let one six-digit code
   * authorise several withdrawals.
   */
  async verify(
    userId: string,
    code: string,
    now: number = Date.now(),
  ): Promise<void> {
    const user = await this.load(userId);
    if (!user.mfaEnrolledAt || !user.mfaSecret) {
      throw new ForbiddenException(
        'Enrol an authenticator before moving money.',
      );
    }

    const counter = this.match(user.mfaSecret, code, now);
    if (counter === null) {
      throw new BadRequestException('That code is not valid.');
    }

    const last = user.mfaLastCounter;
    if (last !== null && BigInt(last) >= counter) {
      throw new BadRequestException(
        'That code has already been used. Wait for the next one.',
      );
    }

    await this.db
      .update(schema.user)
      .set({ mfaLastCounter: counter, updatedAt: new Date() })
      .where(eq(schema.user.id, userId));
  }

  /** The window this code belongs to, or null if it belongs to none nearby. */
  private match(secret: string, code: string, now: number): bigint | null {
    const current = timeCounter(now);
    for (let drift = -DRIFT_WINDOWS; drift <= DRIFT_WINDOWS; drift++) {
      const counter = current + drift;
      if (counter >= 0n && totpCode(secret, counter) === code.trim()) {
        return counter;
      }
    }
    return null;
  }

  private async load(userId: string) {
    const [row] = await this.db
      .select({
        email: schema.user.email,
        mfaSecret: schema.user.mfaSecret,
        mfaEnrolledAt: schema.user.mfaEnrolledAt,
        mfaLastCounter: schema.user.mfaLastCounter,
      })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    if (!row) throw new ForbiddenException('No such account.');
    return row;
  }
}
