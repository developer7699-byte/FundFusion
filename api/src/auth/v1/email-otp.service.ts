import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { DRIZZLE } from '../../ledger/account.service';
import {
  EMAIL_SENDER,
  LoggingEmailSender,
  type EmailSender,
} from './email-sender';

type Db = NodePgDatabase<typeof schema>;

const MAX_ATTEMPTS = 5;
const TTL_MINUTES = 10;

export type OtpPurpose = 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD' | 'ADMIN_2FA';

/**
 * One-time codes by email (PRD §9.1, revised 2026-11-21).
 *
 * Email rather than SMS: TRAI DLT registration is ₹5,900 and 7–10 working
 * days, and without a transactional alpha header an SMS code never reaches a
 * DND-registered number — which is most Indian mobiles. Email needs a domain
 * and DNS records, both of which this project needs anyway.
 *
 * The code is never returned in a response body, in any environment.
 */
@Injectable()
export class EmailOtpService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Optional()
    @Inject(EMAIL_SENDER)
    private readonly mail: EmailSender = new LoggingEmailSender(),
  ) {}

  private code(): string {
    const fixed = process.env.OTP_STATIC_DEV;
    if (fixed && fixed.trim()) return fixed.trim();
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async request(userId: string, email: string, purpose: OtpPurpose) {
    const code = this.code();

    await this.db.insert(schema.otpChallenge).values({
      userId,
      destination: email.toLowerCase(),
      purpose,
      codeHash: await bcrypt.hash(code, 10),
      expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000),
    });

    await this.mail.send(
      email,
      'Your sign-in code',
      `${code} — it expires in ${TTL_MINUTES} minutes. If you did not ask for this, ignore it.`,
    );

    return { sent: true as const };
  }

  /**
   * Consumes the code. Throws unless it is the open challenge for this
   * address and purpose.
   */
  async consume(
    userId: string,
    email: string,
    purpose: OtpPurpose,
    code: string,
  ): Promise<void> {
    const [challenge] = await this.db
      .select()
      .from(schema.otpChallenge)
      .where(
        and(
          eq(schema.otpChallenge.userId, userId),
          eq(schema.otpChallenge.destination, email.toLowerCase()),
          eq(schema.otpChallenge.purpose, purpose),
          isNull(schema.otpChallenge.consumedAt),
        ),
      )
      .orderBy(desc(schema.otpChallenge.createdAt))
      .limit(1);

    if (!challenge) {
      throw new BadRequestException('Invalid code. Ask for a new one.');
    }
    if (challenge.attempts >= MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many attempts. Request a new code before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (challenge.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'That code has expired. Ask for a new one.',
      );
    }

    if (!(await bcrypt.compare(code, challenge.codeHash))) {
      await this.db
        .update(schema.otpChallenge)
        .set({ attempts: challenge.attempts + 1 })
        .where(eq(schema.otpChallenge.id, challenge.id));
      throw new BadRequestException('Invalid code.');
    }

    await this.db
      .update(schema.otpChallenge)
      .set({ consumedAt: new Date() })
      .where(eq(schema.otpChallenge.id, challenge.id));
  }
}
