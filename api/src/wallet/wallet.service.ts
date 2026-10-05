import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { d, inrAmount, moneyString, usdtAmount } from '../money/decimal';
import { LedgerService } from '../ledger/ledger.service';
import { PrototypeStore } from '../prototype/prototype.store';
import { MockCryptoProvider } from '../providers/mock-crypto.provider';
import { MockRateProvider } from '../providers/mock-rate.provider';
import { DepositBroadcastDto, DepositStartDto, QuoteDto, SendDto } from './dto';

@Injectable()
export class WalletService {
  constructor(
    private readonly store: PrototypeStore,
    private readonly ledger: LedgerService,
    private readonly crypto: MockCryptoProvider,
    private readonly rates: MockRateProvider,
  ) {}

  snapshot(userId: string) {
    const usdt = this.store.account(userId, 'USDT');
    const inr = this.store.account(userId, 'INR');
    const rate = d(this.rates.usdtInr());
    const available = usdtAmount(usdt.available);
    const locked = usdtAmount(usdt.locked);
    return {
      simulated: true,
      label: 'All balances are mock prototype figures. No chain or bank settlement.',
      rateLabel: 'Simulated USDT/INR display rate',
      usdtInrRate: rate.toFixed(4),
      assets: [
        {
          symbol: 'USDT',
          available: usdt.available,
          locked: usdt.locked,
          total: moneyString(available.add(locked), 6),
        },
        {
          symbol: 'INR',
          available: inr.available,
          locked: inr.locked,
          total: inr.available,
          displayOnly: true,
        },
      ],
      wallet: {
        availableUsdt: usdt.available,
        lockedUsdt: usdt.locked,
        totalUsdt: moneyString(available.add(locked), 6),
        inrEstimate: moneyString(inrAmount(available.mul(rate)), 2),
      },
      addresses: this.store.addresses.filter((a) => a.userId === userId),
      activity: this.store.activity.filter((a) => a.userId === userId).slice(0, 25),
      totals: { transactions: this.store.activity.filter((a) => a.userId === userId).length },
    };
  }

  startDeposit(userId: string, dto: DepositStartDto) {
    const address = this.crypto.generateAddress(dto.network, userId);
    const deposit = {
      id: randomUUID(),
      userId,
      asset: 'USDT' as const,
      network: dto.network,
      address,
      amount: '0.000000',
      status: 'ADDRESS_READY' as const,
      confirmations: 0,
      requiredConfirmations: this.crypto.requiredConfirmations(),
      mockTxHash: null,
      createdAt: new Date(),
    };
    this.store.deposits.unshift(deposit);
    this.store.addresses.unshift({
      id: randomUUID(),
      userId,
      asset: 'USDT',
      network: dto.network,
      address,
      isDefault: false,
    });
    return { ...deposit, qrPayload: address, mockRail: true };
  }

  broadcastDeposit(userId: string, id: string, dto: DepositBroadcastDto) {
    const deposit = this.requireDeposit(userId, id);
    if (deposit.status !== 'ADDRESS_READY') {
      throw new BadRequestException({
        success: false,
        error: { code: 'DEPOSIT_STATE', message: 'Mock deposit is not waiting for a broadcast.' },
      });
    }
    const amount = usdtAmount(dto.amount);
    if (!amount.gt(0)) {
      throw new BadRequestException({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Enter a positive mock amount.' },
      });
    }
    deposit.amount = moneyString(amount, 6);
    deposit.status = 'BROADCAST_SIMULATED';
    deposit.mockTxHash = this.crypto.mockTxHash();
    deposit.confirmations = 0;
    return deposit;
  }

  confirmDeposit(userId: string, id: string) {
    const deposit = this.requireDeposit(userId, id);
    if (deposit.status === 'ADDRESS_READY') {
      throw new BadRequestException({
        success: false,
        error: { code: 'DEPOSIT_STATE', message: 'Simulate a mock broadcast first.' },
      });
    }
    if (deposit.status === 'COMPLETED') return deposit;
    deposit.confirmations += 1;
    deposit.status = 'CONFIRMING';
    if (deposit.confirmations >= deposit.requiredConfirmations) {
      this.ledger.post({
        memo: `Mock deposit ${deposit.mockTxHash}`,
        idempotency: `deposit:${deposit.id}`,
        entries: [
          { accountType: 'EXTERNAL', direction: 'DEBIT', amount: deposit.amount, asset: 'USDT' },
          {
            accountType: 'AVAILABLE',
            direction: 'CREDIT',
            amount: deposit.amount,
            asset: 'USDT',
            userId,
          },
        ],
        activity: {
          userId,
          type: 'DEPOSIT',
          status: 'COMPLETED',
          asset: 'USDT',
          amount: deposit.amount,
        },
      });
      deposit.status = 'COMPLETED';
    }
    return deposit;
  }

  send(userId: string, dto: SendDto, kind: 'SEND' | 'WITHDRAW') {
    const amount = usdtAmount(dto.amount);
    const fee = usdtAmount(this.crypto.networkFee(dto.network));
    const total = amount.add(fee);
    const available = usdtAmount(this.store.account(userId, 'USDT').available);
    if (available.lt(total)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INSUFFICIENT_FUNDS',
          message: `Need ${moneyString(total, 6)} USDT available (amount + mock fee). Locked funds are not spendable.`,
        },
      });
    }
    const idempotency = dto.idempotencyKey ?? `${kind}:${userId}:${randomUUID()}`;
    const tx = this.ledger.post({
      memo: `${kind} mock ${dto.network} to ${dto.toAddress}`,
      idempotency,
      entries: [
        { accountType: 'AVAILABLE', direction: 'DEBIT', amount: moneyString(amount, 6), asset: 'USDT', userId },
        { accountType: 'AVAILABLE', direction: 'DEBIT', amount: moneyString(fee, 6), asset: 'USDT', userId },
        { accountType: 'EXTERNAL', direction: 'CREDIT', amount: moneyString(amount, 6), asset: 'USDT' },
        { accountType: 'PLATFORM_FEE', direction: 'CREDIT', amount: moneyString(fee, 6), asset: 'USDT' },
      ],
      activity: {
        userId,
        type: kind,
        status: 'COMPLETED',
        asset: 'USDT',
        amount: moneyString(amount, 6),
      },
    });
    return {
      simulated: true,
      kind,
      receipt: tx.reference,
      toAddress: dto.toAddress,
      network: dto.network,
      amount: moneyString(amount, 6),
      fee: moneyString(fee, 6),
      mockTxHash: this.crypto.mockTxHash(),
      note: 'Mock rail only. No broadcast reached a public network.',
    };
  }

  quote(userId: string, dto: QuoteDto) {
    const rate = d(this.rates.usdtInr());
    const feeBps = d('0.004');
    let fromAsset = dto.fromAsset ?? (dto.side === 'BUY' ? 'INR' : 'USDT');
    let fromAmount = d(dto.amount);
    let toAmount: ReturnType<typeof d>;
    let feeAmount: ReturnType<typeof d>;
    let toAsset = 'USDT';
    if (dto.side === 'BUY') {
      fromAsset = 'INR';
      toAsset = 'USDT';
      const gross = inrAmount(fromAmount).div(rate);
      feeAmount = usdtAmount(gross.mul(feeBps));
      toAmount = usdtAmount(gross.sub(feeAmount));
      fromAmount = inrAmount(fromAmount);
    } else if (dto.side === 'SELL') {
      fromAsset = 'USDT';
      toAsset = 'INR';
      fromAmount = usdtAmount(fromAmount);
      const grossInr = inrAmount(fromAmount.mul(rate));
      feeAmount = inrAmount(grossInr.mul(feeBps));
      toAmount = inrAmount(grossInr.sub(feeAmount));
    } else {
      fromAsset = 'USDT';
      toAsset = 'INR';
      fromAmount = usdtAmount(fromAmount);
      feeAmount = usdtAmount(fromAmount.mul(feeBps));
      toAmount = inrAmount(fromAmount.sub(feeAmount).mul(rate));
    }
    const quote = {
      id: randomUUID(),
      userId,
      side: dto.side,
      fromAsset,
      toAsset,
      fromAmount: fromAsset === 'INR' ? moneyString(fromAmount, 2) : moneyString(fromAmount, 6),
      toAmount: toAsset === 'INR' ? moneyString(toAmount, 2) : moneyString(toAmount, 6),
      rate: rate.toFixed(4),
      feeAmount: dto.side === 'SELL' ? moneyString(feeAmount, 2) : moneyString(feeAmount, 6),
      expiresAt: new Date(Date.now() + 30_000),
      consumedAt: null,
      merchantLabel: 'Sample desk · Orbit (simulated)',
    };
    this.store.quotes.unshift(quote);
    return { ...quote, simulated: true };
  }

  acceptQuote(userId: string, quoteId: string) {
    const quote = this.store.quotes.find((q) => q.id === quoteId && q.userId === userId);
    if (!quote) {
      throw new NotFoundException({
        success: false,
        error: { code: 'QUOTE_MISSING', message: 'Quote not found.' },
      });
    }
    if (quote.consumedAt) {
      throw new BadRequestException({
        success: false,
        error: { code: 'QUOTE_USED', message: 'Quote already consumed.' },
      });
    }
    if (quote.expiresAt < new Date()) {
      throw new BadRequestException({
        success: false,
        error: { code: 'QUOTE_EXPIRED', message: 'Quote expired. Request a new mock quote.' },
      });
    }
    if (quote.side === 'BUY') {
      this.ledger.post({
        memo: `Mock buy ${quote.id}`,
        idempotency: `quote:${quote.id}`,
        entries: [
          { accountType: 'EXTERNAL', direction: 'DEBIT', amount: quote.toAmount, asset: 'USDT' },
          { accountType: 'AVAILABLE', direction: 'CREDIT', amount: quote.toAmount, asset: 'USDT', userId },
        ],
        activity: { userId, type: 'BUY', status: 'COMPLETED', asset: 'USDT', amount: quote.toAmount },
      });
    } else if (quote.side === 'SELL') {
      this.ledger.post({
        memo: `Mock sell lock ${quote.id}`,
        idempotency: `quote:${quote.id}`,
        entries: [
          { accountType: 'AVAILABLE', direction: 'DEBIT', amount: quote.fromAmount, asset: 'USDT', userId },
          { accountType: 'LOCKED', direction: 'CREDIT', amount: quote.fromAmount, asset: 'USDT', userId },
        ],
        activity: { userId, type: 'SELL', status: 'FUNDS_LOCKED', asset: 'USDT', amount: quote.fromAmount },
      });
    } else {
      this.ledger.post({
        memo: `Mock convert ${quote.id}`,
        idempotency: `quote:${quote.id}`,
        entries: [
          { accountType: 'AVAILABLE', direction: 'DEBIT', amount: quote.fromAmount, asset: 'USDT', userId },
          { accountType: 'EXTERNAL', direction: 'CREDIT', amount: quote.fromAmount, asset: 'USDT' },
          { accountType: 'EXTERNAL', direction: 'DEBIT', amount: quote.toAmount, asset: 'INR' },
          { accountType: 'AVAILABLE', direction: 'CREDIT', amount: quote.toAmount, asset: 'INR', userId },
        ],
        activity: { userId, type: 'CONVERT', status: 'COMPLETED', asset: 'USDT', amount: quote.fromAmount },
      });
    }
    quote.consumedAt = new Date();
    return { ...quote, simulated: true, accepted: true };
  }

  activity(userId: string, id: string) {
    const row = this.store.activity.find((a) => a.id === id && a.userId === userId);
    if (!row) {
      throw new NotFoundException({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found.' },
      });
    }
    return row;
  }

  private requireDeposit(userId: string, id: string) {
    const deposit = this.store.deposits.find((drow) => drow.id === id && drow.userId === userId);
    if (!deposit) {
      throw new NotFoundException({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Deposit not found.' },
      });
    }
    return deposit;
  }
}
