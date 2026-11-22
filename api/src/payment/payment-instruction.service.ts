import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../ledger/account.service';

type Db = NodePgDatabase<typeof schema>;

export interface PaymentInstructionView {
  orderId: string;
  payeeUserId: string;
  type: 'BANK' | 'UPI';
  holderName: string;
  accountNumber: string | null;
  ifsc: string | null;
  upiVpa: string | null;
}

export interface BindOptions {
  /** A specific method to bind; otherwise the payee's default is used. */
  methodId?: string;
  /** Run inside the caller's transaction, so a bind and a bond commit together. */
  tx?: Db;
}

/**
 * The seam the engine binds through. Kept narrow and optional on the engine
 * side (like the broadcaster) so the ledger services stay testable without the
 * payment module, and so there is exactly one place that freezes a payee.
 */
export interface PaymentInstructionBinder {
  bind(
    orderId: string,
    payeeUserId: string,
    opts?: BindOptions,
  ): Promise<PaymentInstructionView>;
}

/**
 * Freezes the payee's INR destination onto an order (PRD §6.3/§6.4). The
 * snapshot is law like the quote (PRD §7): once bound, editing or removing the
 * source method cannot change where a historical order said to pay. Binding is
 * idempotent — one instruction per order — so a retried confirm or accept
 * neither duplicates nor rewrites it.
 */
@Injectable()
export class PaymentInstructionService implements PaymentInstructionBinder {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async bind(
    orderId: string,
    payeeUserId: string,
    opts: BindOptions = {},
  ): Promise<PaymentInstructionView> {
    const db = opts.tx ?? this.db;
    const method = await this.resolve(db, payeeUserId, opts.methodId);

    const [row] = await db
      .insert(schema.orderPaymentInstruction)
      .values({
        orderId,
        payeeUserId,
        sourceMethodId: method.id,
        type: method.type,
        holderName: method.holderName,
        accountNumber: method.accountNumber,
        ifsc: method.ifsc,
        upiVpa: method.upiVpa,
      })
      .onConflictDoNothing()
      .returning();

    if (row) return toView(row);

    // Already bound (a retried confirm/accept). The first binding stands.
    const [existing] = await db
      .select()
      .from(schema.orderPaymentInstruction)
      .where(eq(schema.orderPaymentInstruction.orderId, orderId))
      .limit(1);
    return toView(existing);
  }

  private async resolve(
    db: Db,
    payeeUserId: string,
    methodId?: string,
  ): Promise<typeof schema.paymentMethod.$inferSelect> {
    const where = methodId
      ? and(
          eq(schema.paymentMethod.id, methodId),
          eq(schema.paymentMethod.userId, payeeUserId),
          isNull(schema.paymentMethod.deletedAt),
        )
      : and(
          eq(schema.paymentMethod.userId, payeeUserId),
          eq(schema.paymentMethod.isDefault, true),
          isNull(schema.paymentMethod.deletedAt),
        );

    const [row] = await db
      .select()
      .from(schema.paymentMethod)
      .where(where)
      .limit(1);

    if (!row) {
      throw new UnprocessableEntityException(
        methodId
          ? 'NO_PAYMENT_METHOD: that payment method is not available.'
          : 'NO_PAYMENT_METHOD: add a bank or UPI method to receive the rupees.',
      );
    }
    return row;
  }
}

function toView(
  row: typeof schema.orderPaymentInstruction.$inferSelect,
): PaymentInstructionView {
  return {
    orderId: row.orderId,
    payeeUserId: row.payeeUserId,
    type: row.type,
    holderName: row.holderName,
    accountNumber: row.accountNumber,
    ifsc: row.ifsc,
    upiVpa: row.upiVpa,
  };
}
