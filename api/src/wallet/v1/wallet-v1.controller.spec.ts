import { ServiceUnavailableException } from '@nestjs/common';
import type { AccountService } from '../../ledger/account.service';
import type { BalanceService } from '../../ledger/balance.service';
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

function controller() {
  const accounts = {
    ensureAccount: () => Promise.resolve('account-1'),
  } as unknown as AccountService;
  const balances = {
    balances: () => Promise.resolve(BALANCES),
  } as unknown as BalanceService;
  const activity = {
    forUser: () => Promise.resolve([]),
  } as unknown as ActivityService;

  return new WalletV1Controller(
    {} as AllowlistService,
    {} as WithdrawalService,
    activity,
    accounts,
    balances,
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
