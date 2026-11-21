import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../../auth/current-user';
import {
  MoneyGateGuard,
  RequiresMoneyGate,
} from '../../auth/v1/money-gate.guard';
import { CHAIN_SERVICES, type ChainServices } from '../../chain/chain.module';
import { BSC_TESTNET_NETWORK } from '../../chain/hd-wallet.service';
import { IdempotencyKey } from '../../common/idempotency.decorator';
import { ok } from '../../common/http';
import { AccountService } from '../../ledger/account.service';
import { BalanceService } from '../../ledger/balance.service';
import { V1AuthGuard } from '../../v1/v1-auth.guard';
import { ActivityService } from './activity.service';
import { AllowlistService } from './allowlist.service';
import { AddAllowlistAddressDto, RequestWithdrawalDto } from './wallet-v1.dto';
import { WithdrawalService } from './withdrawal.service';

/**
 * The wallet over HTTP (PRD §8).
 *
 * Every route here moves money or decides where money may go, so every one
 * of them sits behind `MoneyGateGuard` — a verified email and an enrolled
 * authenticator (PRD §9.1). The guard is the only place that decides this;
 * no handler repeats the check, because two rules deciding who may move
 * money is how one of them gets forgotten.
 */
@ApiTags('wallet')
@Controller('v1/wallet')
@UseGuards(V1AuthGuard, MoneyGateGuard)
@RequiresMoneyGate()
export class WalletV1Controller {
  constructor(
    private readonly allowlist: AllowlistService,
    private readonly withdrawals: WithdrawalService,
    private readonly activity: ActivityService,
    private readonly accounts: AccountService,
    private readonly balances: BalanceService,
    @Inject(CHAIN_SERVICES) private readonly chain: ChainServices | null,
  ) {}

  /**
   * Everything a dashboard opens with, in one request: the derived balances
   * and the address to deposit to.
   *
   * The address is null, rather than a 503, on a process with no chain
   * configuration. The balances are real either way, and failing the whole
   * dashboard because this server cannot issue an address would hide money
   * the ledger is certain about behind a deployment detail.
   */
  @Get('summary')
  async summary(@CurrentUser() user: AuthUser) {
    const accountId = await this.accounts.ensureAccount(user.sub, 'USDT');
    return ok({
      balances: await this.balances.balances(accountId),
      address: this.chain
        ? await this.chain.wallets.addressFor(user.sub)
        : null,
      network: BSC_TESTNET_NETWORK,
    });
  }

  /** This user's own journal entries, newest first (PRD §5 rule 1). */
  @Get('activity')
  async activityFeed(@CurrentUser() user: AuthUser) {
    return ok(await this.activity.forUser(user.sub));
  }

  @Get('address')
  async address(@CurrentUser() user: AuthUser) {
    return ok({
      address: await this.wallets().addressFor(user.sub),
      network: BSC_TESTNET_NETWORK,
    });
  }

  @Get('allowlist')
  async listAllowlist(@CurrentUser() user: AuthUser) {
    return ok(await this.allowlist.list(user.sub));
  }

  @Post('allowlist')
  async addAllowlist(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddAllowlistAddressDto,
  ) {
    return ok(
      await this.allowlist.add(user.sub, dto.address, dto.code, {
        label: dto.label,
      }),
    );
  }

  @Post('withdrawals')
  async withdraw(
    @CurrentUser() user: AuthUser,
    @Body() dto: RequestWithdrawalDto,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return ok(
      await this.withdrawals.request(
        user.sub,
        dto.address,
        dto.amount,
        dto.code,
        idempotencyKey,
      ),
    );
  }

  /**
   * A process with no chain configuration is a legitimate deployment — CI
   * runs the whole suite that way — but it cannot hand out an address it
   * could never derive a key for. That is a 503, not a 500: the request was
   * fine, this process cannot serve it.
   */
  private wallets() {
    if (!this.chain) {
      throw new ServiceUnavailableException(
        'This server has no chain configuration, so it cannot issue deposit addresses.',
      );
    }
    return this.chain.wallets;
  }
}
