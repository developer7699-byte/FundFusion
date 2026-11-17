import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { Decimal, usdt, usdtString } from '../money/money';
import { AccountService, DRIZZLE } from './account.service';
import { BalanceService } from './balance.service';
import type { Bucket, PostingRequest, PostingResult } from './ledger.types';

type Db = NodePgDatabase<typeof schema>;

/** Postgres unique-violation. A replayed idempotency key surfaces as this. */
const UNIQUE_VIOLATION = '23505';

/**
 * Drizzle wraps driver errors, so the SQLSTATE sits on `cause` rather than on
 * the error itself. Walk the chain rather than trusting the top-level shape.
 */
function isUniqueViolation(err: unknown): boolean {
  let cur: unknown = err;
  for (let depth = 0; cur && depth < 5; depth++) {
    if ((cur as { code?: string }).code === UNIQUE_VIOLATION) return true;
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

@Injectable()
export class PostingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly accounts: AccountService,
    private readonly balances: BalanceService,
  ) {}

  /**
   * Write one balanced journal (PRD §5). Every money operation is atomic,
   * idempotent and auditable: the whole journal commits or none of it does.
   */
  async post(req: PostingRequest): Promise<PostingResult> {
    this.validate(req);
    const fingerprint = this.fingerprint(req);

    try {
      return await this.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(schema.ledgerTransaction)
          .values({
            reference: randomUUID(),
            memo: req.memo,
            idempotency: req.idempotencyKey,
            fingerprint,
          })
          .returning({ id: schema.ledgerTransaction.id });

        await tx.insert(schema.ledgerEntry).values(
          req.lines.map((line) => ({
            transactionId: row.id,
            accountId: line.accountId ?? null,
            accountType: line.accountType,
            direction: line.direction,
            amount: usdtString(usdt(line.amount)),
            assetSymbol: line.assetSymbol,
          })),
        );

        return { id: row.id, replayed: false };
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        return this.resolveReplay(req, fingerprint);
      }
      throw err;
    }
  }

  /**
   * Post a journal together with its rounding residue.
   *
   * PRD §5.1: every residue posts to a dedicated ROUNDING account. A residue
   * that is silently dropped produces an unbalanced journal, which makes the
   * reconciliation alert fire permanently, which teaches everyone to ignore it
   * — and an ignored reconciliation alert is where real losses hide.
   *
   * A positive residue is value the customer did not receive, so it is
   * CREDITED to ROUNDING. A negative residue (a payable rounded up) is
   * DEBITED.
   */
  async postWithRounding(
    req: PostingRequest,
    residue: { amount: string; assetSymbol: string },
  ): Promise<PostingResult> {
    const value = usdt(residue.amount);
    if (value.isZero()) {
      return this.post(req);
    }

    return this.post({
      ...req,
      lines: [
        ...req.lines,
        {
          accountType: 'ROUNDING',
          direction: value.gt(0) ? 'CREDIT' : 'DEBIT',
          amount: usdtString(value.abs()),
          assetSymbol: residue.assetSymbol,
        },
      ],
    });
  }

  /**
   * Post a debit that must not overdraw its bucket.
   *
   * The row lock is the whole point: two concurrent callers must not each read
   * a sufficient balance before either commits. Drizzle expresses `FOR UPDATE`
   * natively, which is why the PRD chose it over Prisma (§11).
   */
  async postDebit(
    accountId: string,
    bucket: Bucket,
    amount: string,
    req: PostingRequest,
  ): Promise<PostingResult> {
    this.validate(req);
    const fingerprint = this.fingerprint(req);
    const wanted = usdt(amount);

    try {
      return await this.db.transaction(async (tx) => {
        await tx.execute(sql`SELECT id FROM wallet_account WHERE id = ${accountId} FOR UPDATE`);

        const current = new Decimal(await this.balances.balance(accountId, bucket, tx));
        if (current.lt(wanted)) {
          throw new BadRequestException(
            `Insufficient ${bucket} balance: have ${current.toFixed()}, need ${wanted.toFixed()}.`,
          );
        }

        const [row] = await tx
          .insert(schema.ledgerTransaction)
          .values({
            reference: randomUUID(),
            memo: req.memo,
            idempotency: req.idempotencyKey,
            fingerprint,
          })
          .returning({ id: schema.ledgerTransaction.id });

        await tx.insert(schema.ledgerEntry).values(
          req.lines.map((line) => ({
            transactionId: row.id,
            accountId: line.accountId ?? null,
            accountType: line.accountType,
            direction: line.direction,
            amount: usdtString(usdt(line.amount)),
            assetSymbol: line.assetSymbol,
          })),
        );

        return { id: row.id, replayed: false };
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        return this.resolveReplay(req, fingerprint);
      }
      throw err;
    }
  }

  private async resolveReplay(req: PostingRequest, fingerprint: string): Promise<PostingResult> {
    const [existing] = await this.db
      .select({
        id: schema.ledgerTransaction.id,
        fingerprint: schema.ledgerTransaction.fingerprint,
      })
      .from(schema.ledgerTransaction)
      .where(eq(schema.ledgerTransaction.idempotency, req.idempotencyKey))
      .limit(1);

    if (existing?.fingerprint === fingerprint) {
      return { id: existing.id, replayed: true };
    }

    // Same key, different intent. Answering with the stored result would
    // silently discard this request (PRD §5 rule 2).
    throw new ConflictException(
      `Idempotency key "${req.idempotencyKey}" was already used with a different request body.`,
    );
  }

  private validate(req: PostingRequest): void {
    if (req.lines.length < 2) {
      throw new BadRequestException('A journal needs at least two legs.');
    }

    let net = new Decimal(0);
    for (const line of req.lines) {
      const amount = usdt(line.amount); // throws on precision or range
      if (!amount.gt(0)) {
        throw new BadRequestException(
          `Every journal leg needs a positive amount, received "${line.amount}".`,
        );
      }
      net = line.direction === 'CREDIT' ? net.plus(amount) : net.minus(amount);
    }

    if (!net.isZero()) {
      throw new BadRequestException(
        `Journal is not balanced: credits minus debits is ${net.toFixed()}, must be exactly 0.`,
      );
    }
  }

  private fingerprint(req: PostingRequest): string {
    const canonical = JSON.stringify({
      memo: req.memo,
      lines: req.lines.map((l) => ({
        accountId: l.accountId ?? null,
        accountType: l.accountType,
        direction: l.direction,
        amount: usdtString(usdt(l.amount)),
        assetSymbol: l.assetSymbol,
      })),
    });
    return createHash('sha256').update(canonical).digest('hex').slice(0, 32);
  }
}
