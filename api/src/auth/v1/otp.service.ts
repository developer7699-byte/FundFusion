import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { DRIZZLE } from '../../ledger/account.service';

type Db = NodePgDatabase<typeof schema>;

const MAX_ATTEMPTS = 5;
const TTL_MINUTES = 10;
const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(err: unknown): boolean {
  let cur: unknown = err;
  for (let depth = 0; cur && depth < 5; depth++) {
    if ((cur as { code?: string }).code === UNIQUE_VIOLATION) return true;
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

/**
 * Phone OTP — the financial gate (PRD §9.1).
 *
 * The code comes from OTP_STATIC_DEV and is written to the log. No SMS
 * provider is contacted in this milestone, and the code is never returned in
 * a response body: a development shortcut that leaks into an API response is
 * the same shortcut in production.
 */
@Injectable()
export class OtpService {
  private readonly log = new Logger(OtpService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  private code(): string {
    const staticCode = process.env.OTP_STATIC_DEV;
    if (staticCode && staticCode.trim()) return staticCode.trim();
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async request(userId: string, phone: string): Promise<{ sent: boolean }> {
    const code = this.code();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + TTL_MINUTES * 60_000);

    await this.db.insert(schema.otpChallenge).values({
      userId,
      destination: phone,
      purpose: 'REGISTER',
      codeHash,
      expiresAt,
    });

    this.log.log(
      `OTP for ${phone}: ${code} (development only, expires in ${TTL_MINUTES}m)`,
    );
    return { sent: true };
  }

  async verify(
    userId: string,
    phone: string,
    code: string,
  ): Promise<{ verified: boolean }> {
    const [challenge] = await this.db
      .select()
      .from(schema.otpChallenge)
      .where(
        and(
          eq(schema.otpChallenge.userId, userId),
          eq(schema.otpChallenge.destination, phone),
          isNull(schema.otpChallenge.consumedAt),
        ),
      )
      .orderBy(desc(schema.otpChallenge.createdAt))
      .limit(1);

    if (!challenge) {
      throw new BadRequestException(
        'Invalid code. No open challenge for this number.',
      );
    }

    if (challenge.attempts >= MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many attempts. Request a new code before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'That code has expired. Request a new one.',
      );
    }

    const ok = await bcrypt.compare(code, challenge.codeHash);
    if (!ok) {
      await this.db
        .update(schema.otpChallenge)
        .set({ attempts: challenge.attempts + 1 })
        .where(eq(schema.otpChallenge.id, challenge.id));
      throw new BadRequestException('Invalid code.');
    }

    // The unique index on user.phone arbitrates, not a read-then-write: two
    // concurrent verifications of the same number must not both succeed.
    try {
      await this.db
        .update(schema.user)
        .set({ phone, phoneVerifiedAt: new Date() })
        .where(eq(schema.user.id, userId));
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          'That number is already verified on another account.',
        );
      }
      throw err;
    }

    await this.db
      .update(schema.otpChallenge)
      .set({ consumedAt: new Date() })
      .where(eq(schema.otpChallenge.id, challenge.id));

    return { verified: true };
  }
}
