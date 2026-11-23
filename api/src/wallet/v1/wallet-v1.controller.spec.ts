import { ServiceUnavailableException } from '@nestjs/common';
import type { AccountService } from '../../ledger/account.service';
import type { BalanceService } from '../../ledger/balance.service';
import type { RateService } from '../../rates/rate.service';
import type { ActivityService } from './activity.service';
import type { AllowlistService } from './allowlist.service';
import { WalletV1Controller } from './wallet-v1.controller';
import type { WithdrawalService } from './withdrawal.service';

/**
 * A process with no chain configuration is a legitimate deployment — CI runs
 * the whole suite that way (PRD §13.4) — so what the dashboard does there is
 * behaviour, not an accident. These are the only wallet cases that do not
 * need a database, which is why they are here rather than in the e2e suite
 * that skips itself without a custody seed.
 */
const BALANCES = {
  AVAILABLE: '12.000000000000000000',
  LOCKED: '0.000000000000000000',
} as unknown as Awaited<ReturnType<BalanceService['balances']>>;

function controller(
  indicative: () => Promise<string> = () => Promise.resolve('84.25'),
  activityRows: unknown[] = [],
) {
  const accounts = {
    ensureAccount: () => Promise.resolve('account-1'),
  } as unknown as AccountService;
  const balances = {
    balances: () => Promise.resolve(BALANCES),
  } as unknown as BalanceService;
  const activity = {
    forUser: () => Promise.resolve(activityRows),
  } as unknown as ActivityService;
  const rates = { indicative } as unknown as RateService;

  return new WalletV1Controller(
    {} as AllowlistService,
    {} as WithdrawalService,
    activity,
    accounts,
    balances,
    rates,
    null,
  );
}

const USER = { sub: 'user-1' } as Parameters<WalletV1Controller['summary']>[0];

describe('the wallet dashboard without a chain configuration', () => {
  it('still reports balances, and says there is no address rather than failing', async () => {
    const res = await controller().summary(USER);

    expect(res.data.balances.AVAILABLE).toBe('12.000000000000000000');
    expect(res.data.address).toBeNull();
  });

  it('still refuses the address route outright, because there is nothing to issue', async () => {
    await expect(controller().address(USER)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});

describe('the dashboard ₹ estimate (PRD §13.5 — indicative only)', () => {
  it('decorates each balance bucket with a server-computed ₹ string', async () => {
    const res = await controller().summary(USER);

    expect(res.data.usdtInrRate).toBe('84.25');
    expect(res.data.inr?.AVAILABLE).toBe('1011.00'); // 12 * 84.25
    expect(typeof res.data.inr?.AVAILABLE).toBe('string');
  });

  it('falls soft to null ₹ when the pricing feed is down, never failing the read', async () => {
    const down = () =>
      Promise.reject(new ServiceUnavailableException('feed down'));
    const res = await controller(down).summary(USER);

    expect(res.data.balances.AVAILABLE).toBe('12.000000000000000000');
    expect(res.data.usdtInrRate).toBeNull();
    expect(res.data.inr).toBeNull();
  });

  it('adds an indicative ₹ to each USDT activity row', async () => {
    const res = await controller(undefined, [
      { id: 'e1', amount: '10.000000000000000000', assetSymbol: 'USDT' },
    ]).activityFeed(USER);

    expect(res.data[0].amountInr).toBe('842.50'); // 10 * 84.25
  });

  it('never applies a USDT→INR rate to a non-USDT row', async () => {
    const res = await controller(undefined, [
      { id: 'e1', amount: '500.00', assetSymbol: 'INR' },
    ]).activityFeed(USER);

    expect(res.data[0].amountInr).toBeNull();
  });
});
