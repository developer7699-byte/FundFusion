import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { AuditService } from '../audit/audit.service';
import { DRIZZLE } from '../ledger/account.service';

type Db = NodePgDatabase<typeof schema>;

export type PaymentMethodType = 'BANK' | 'UPI';

export interface PaymentMethodInput {
  type: PaymentMethodType;
  label: string;
  holderName: string;
  accountNumber?: string;
  ifsc?: string;
  upiVpa?: string;
}

export interface PaymentMethodView {
  id: string;
  type: PaymentMethodType;
  label: string;
  holderName: string;
  accountNumber: string | null;
  ifsc: string | null;
  upiVpa: string | null;
  isDefault: boolean;
  createdAt: Date;
}

const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT = /^\d{9,18}$/;
const VPA = /^[\w.-]{2,256}@[a-zA-Z]{2,64}$/;

/**
 * A user's INR payee destinations (PRD §6.3/§6.4). Reference data — no ledger,
 * no money. Every read and write is scoped to the owning user (PRD §13.5): a
 * payout destination is exactly the kind of row an IDOR would weaponise.
 */
@Injectable()
export class PaymentMethodService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async add(
    userId: string,
    input: PaymentMethodInput,
  ): Promise<PaymentMethodView> {
    const clean = normalise(input);

    const existing = await this.list(userId);
    const isDefault = existing.length === 0;

    const [row] = await this.db
      .insert(schema.paymentMethod)
      .values({
        userId,
        type: clean.type,
        label: clean.label,
        holderName: clean.holderName,
        accountNumber: clean.accountNumber,
        ifsc: clean.ifsc,
        upiVpa: clean.upiVpa,
        isDefault,
      })
      .returning();

    await this.audit.record({
      actorId: userId,
      action: 'PAYMENT_METHOD_ADD',
      entity: 'payment_method',
      entityId: row.id,
      reason: 'user added a payout destination',
      newValue: { type: row.type, label: row.label },
    });

    return toView(row);
  }

  async list(userId: string): Promise<PaymentMethodView[]> {
    const rows = await this.db
      .select()
      .from(schema.paymentMethod)
      .where(
        and(
          eq(schema.paymentMethod.userId, userId),
          isNull(schema.paymentMethod.deletedAt),
        ),
      )
      .orderBy(
        desc(schema.paymentMethod.isDefault),
        desc(schema.paymentMethod.createdAt),
      );
    return rows.map(toView);
  }

  async defaultFor(userId: string): Promise<PaymentMethodView | null> {
    const [row] = await this.db
      .select()
      .from(schema.paymentMethod)
      .where(
        and(
          eq(schema.paymentMethod.userId, userId),
          eq(schema.paymentMethod.isDefault, true),
          isNull(schema.paymentMethod.deletedAt),
        ),
      )
      .limit(1);
    return row ? toView(row) : null;
  }

  async setDefault(userId: string, id: string): Promise<PaymentMethodView> {
    return this.db.transaction(async (tx) => {
      const owned = await ownedLive(tx, userId, id);
      await tx
        .update(schema.paymentMethod)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(schema.paymentMethod.userId, userId),
            eq(schema.paymentMethod.isDefault, true),
            isNull(schema.paymentMethod.deletedAt),
          ),
        );
      const [row] = await tx
        .update(schema.paymentMethod)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(schema.paymentMethod.id, owned.id))
        .returning();
      return toView(row);
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const owned = await ownedLive(tx, userId, id);
      await tx
        .update(schema.paymentMethod)
        .set({
          deletedAt: new Date(),
          isDefault: false,
          updatedAt: new Date(),
        })
        .where(eq(schema.paymentMethod.id, owned.id));
    });

    await this.audit.record({
      actorId: userId,
      action: 'PAYMENT_METHOD_REMOVE',
      entity: 'payment_method',
      entityId: id,
      reason: 'user removed a payout destination',
    });
  }
}

/** A live method the user owns, or a 404 that does not reveal it exists. */
async function ownedLive(
  db: Db,
  userId: string,
  id: string,
): Promise<typeof schema.paymentMethod.$inferSelect> {
  const [row] = await db
    .select()
    .from(schema.paymentMethod)
    .where(
      and(
        eq(schema.paymentMethod.id, id),
        eq(schema.paymentMethod.userId, userId),
        isNull(schema.paymentMethod.deletedAt),
      ),
    )
    .limit(1);
  if (!row) throw new NotFoundException('No such payment method.');
  return row;
}

function normalise(input: PaymentMethodInput): PaymentMethodInput {
  const label = (input.label ?? '').trim();
  const holderName = (input.holderName ?? '').trim();
  if (!label || label.length > 80) {
    throw new BadRequestException(
      'A payment method needs a label (≤80 chars).',
    );
  }
  if (!holderName || holderName.length > 140) {
    throw new BadRequestException('A payment method needs a holder name.');
  }

  if (input.type === 'BANK') {
    const accountNumber = (input.accountNumber ?? '').trim();
    const ifsc = (input.ifsc ?? '').trim().toUpperCase();
    if (!ACCOUNT.test(accountNumber)) {
      throw new BadRequestException('A bank account number is 9 to 18 digits.');
    }
    if (!IFSC.test(ifsc)) {
      throw new BadRequestException(
        'That IFSC is not valid (e.g. HDFC0001234).',
      );
    }
    return {
      type: 'BANK',
      label,
      holderName,
      accountNumber,
      ifsc,
      upiVpa: undefined,
    };
  }

  const upiVpa = (input.upiVpa ?? '').trim();
  if (!VPA.test(upiVpa)) {
    throw new BadRequestException('That UPI ID is not valid (e.g. name@bank).');
  }
  return {
    type: 'UPI',
    label,
    holderName,
    accountNumber: undefined,
    ifsc: undefined,
    upiVpa,
  };
}

function toView(
  row: typeof schema.paymentMethod.$inferSelect,
): PaymentMethodView {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    holderName: row.holderName,
    accountNumber: row.accountNumber,
    ifsc: row.ifsc,
    upiVpa: row.upiVpa,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
  };
}
