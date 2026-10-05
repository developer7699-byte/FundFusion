import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { d, Decimal, inrAmount, moneyString, usdtAmount } from '../money/decimal';
import { PrototypeStore } from '../prototype/prototype.store';
import { ProtoLedgerEntry } from '../prototype/types';

@Injectable()
export class LedgerService {
  constructor(private readonly store: PrototypeStore) {}

  post(input: {
    memo: string;
    idempotency: string;
    entries: ProtoLedgerEntry[];
    activity?: { userId: string; type: string; status: string; asset: string; amount: string };
  }) {
    const existingId = this.store.idempotency.get(input.idempotency);
    if (existingId) {
      return this.store.ledger.find((tx) => tx.id === existingId)!;
    }

    this.assertBalanced(input.entries);
    for (const entry of input.entries) {
      this.apply(entry);
    }

    const tx = {
      id: randomUUID(),
      reference: `SIM-${randomUUID().slice(0, 8).toUpperCase()}`,
      idempotency: input.idempotency,
      memo: input.memo,
      createdAt: new Date(),
      entries: input.entries,
    };
    this.store.ledger.push(tx);
    this.store.idempotency.set(input.idempotency, tx.id);
    if (input.activity) this.store.addActivity(input.activity);
    return tx;
  }

  assertBalanced(entries: ProtoLedgerEntry[]) {
    const byAsset = new Map<string, { debit: Decimal; credit: Decimal }>();
    for (const entry of entries) {
      const bucket = byAsset.get(entry.asset) ?? { debit: d('0'), credit: d('0') };
      const amt = entry.asset === 'INR' ? inrAmount(entry.amount) : usdtAmount(entry.amount);
      if (!amt.gt(0)) {
        throw new BadRequestException({
          success: false,
          error: { code: 'INVALID_AMOUNT', message: 'Amounts must be positive decimals.' },
        });
      }
      if (entry.direction === 'DEBIT') bucket.debit = bucket.debit.add(amt);
      else bucket.credit = bucket.credit.add(amt);
      byAsset.set(entry.asset, bucket);
    }
    for (const [asset, bucket] of byAsset) {
      if (!bucket.debit.eq(bucket.credit)) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'LEDGER_UNBALANCED',
            message: `Mock ledger rejected unbalanced ${asset} entries.`,
          },
        });
      }
    }
  }

  private apply(entry: ProtoLedgerEntry) {
    if (entry.accountType === 'PLATFORM_FEE' || entry.accountType === 'EXTERNAL') return;
    if (!entry.userId) {
      throw new BadRequestException({
        success: false,
        error: { code: 'LEDGER_ACCOUNT', message: 'User account required.' },
      });
    }
    const account = this.store.account(entry.userId, entry.asset);
    const amt = entry.asset === 'INR' ? inrAmount(entry.amount) : usdtAmount(entry.amount);
    let available = d(account.available);
    let locked = d(account.locked);
    if (entry.accountType === 'AVAILABLE') {
      available = entry.direction === 'CREDIT' ? available.add(amt) : available.sub(amt);
    }
    if (entry.accountType === 'LOCKED') {
      locked = entry.direction === 'CREDIT' ? locked.add(amt) : locked.sub(amt);
    }
    if (available.lt(0) || locked.lt(0)) {
      throw new BadRequestException({
        success: false,
        error: { code: 'INSUFFICIENT_FUNDS', message: 'Available simulated balance is too low.' },
      });
    }
    account.available = moneyString(available, entry.asset === 'INR' ? 2 : 6);
    account.locked = moneyString(locked, entry.asset === 'INR' ? 2 : 6);
  }
}
