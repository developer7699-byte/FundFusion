import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../auth/current-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ok } from '../common/http';
import { DepositBroadcastDto, DepositStartDto, QuoteDto, SendDto, WithdrawDto } from './dto';
import { WalletService } from './wallet.service';

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER', 'ADMIN')
@Controller()
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('wallet')
  snapshot(@CurrentUser() user: AuthUser) {
    return ok(this.wallet.snapshot(user.sub));
  }

  @Get('customer/overview')
  overview(@CurrentUser() user: AuthUser) {
    const snap = this.wallet.snapshot(user.sub);
    return ok({
      simulated: true,
      rateLabel: snap.rateLabel,
      usdtInrRate: snap.usdtInrRate,
      wallet: snap.wallet,
      totals: snap.totals,
      recent: snap.activity.slice(0, 8).map((row) => ({
        id: row.id,
        type: row.type,
        status: row.status,
        amount: row.amount,
        asset: row.asset,
        createdAt: row.createdAt,
        simulated: true,
      })),
    });
  }

  @Get('wallet/activity/:id')
  activity(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return ok(this.wallet.activity(user.sub, id));
  }

  @Post('wallet/deposits')
  startDeposit(@CurrentUser() user: AuthUser, @Body() dto: DepositStartDto) {
    return ok(this.wallet.startDeposit(user.sub, dto));
  }

  @Post('wallet/deposits/:id/simulate-broadcast')
  broadcast(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DepositBroadcastDto,
  ) {
    return ok(this.wallet.broadcastDeposit(user.sub, id, dto));
  }

  @Post('wallet/deposits/:id/simulate-confirm')
  confirm(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return ok(this.wallet.confirmDeposit(user.sub, id));
  }

  @Post('wallet/send')
  send(@CurrentUser() user: AuthUser, @Body() dto: SendDto) {
    return ok(this.wallet.send(user.sub, dto, 'SEND'));
  }

  @Post('wallet/withdrawals')
  withdraw(@CurrentUser() user: AuthUser, @Body() dto: WithdrawDto) {
    return ok(this.wallet.send(user.sub, dto, 'WITHDRAW'));
  }

  @Post('wallet/quotes')
  quote(@CurrentUser() user: AuthUser, @Body() dto: QuoteDto) {
    return ok(this.wallet.quote(user.sub, dto));
  }

  @Post('wallet/quotes/:id/accept')
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return ok(this.wallet.acceptQuote(user.sub, id));
  }
}
