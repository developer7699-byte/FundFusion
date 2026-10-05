import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user';
import { ok } from '../common/http';
import { PrismaService } from '../prisma/prisma.service';
import { MockRateProvider } from '../providers/mock-rate.provider';

@ApiTags('customer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER', 'ADMIN')
@Controller('customer')
export class CustomerController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rates: MockRateProvider,
  ) {}

  @Get('overview')
  async overview(@CurrentUser() user: AuthUser) {
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId: user.sub, label: 'PRIMARY' },
      include: { accounts: { include: { asset: true } } },
    });
    const tx = await this.prisma.transaction.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    const usdt = wallet?.accounts.find((a) => a.asset.symbol === 'USDT');
    const available = new Decimal(usdt?.available ?? 0);
    const locked = new Decimal(usdt?.locked ?? 0);
    const rate = new Decimal(this.rates.usdtInr());
    return ok({
      simulated: true,
      rateLabel: 'Simulated USDT/INR display rate',
      usdtInrRate: rate.toFixed(4),
      wallet: {
        availableUsdt: available.toFixed(4),
        lockedUsdt: locked.toFixed(4),
        totalUsdt: available.add(locked).toFixed(4),
        inrEstimate: available.mul(rate).toFixed(2),
      },
      totals: {
        transactions: await this.prisma.transaction.count({ where: { userId: user.sub } }),
      },
      recent: tx.map((row) => ({
        id: row.id,
        type: row.type,
        status: row.status,
        amount: row.amount.toString(),
        asset: row.assetSymbol,
        createdAt: row.createdAt,
        simulated: row.simulated,
      })),
    });
  }
}
