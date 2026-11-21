import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../auth/current-user';
import { AdminGuard, RequiresAdmin } from '../auth/v1/admin.guard';
import { RequiresStaff, StaffGuard } from '../auth/v1/staff.guard';
import { ok } from '../common/http';
import { IdempotencyKey } from '../common/idempotency.decorator';
import { V1AuthGuard } from '../v1/v1-auth.guard';
import { DisputeService } from './dispute.service';
import { OpenDisputeDto, ResolveDisputeDto } from './dispute.dto';
import { ResolutionService } from './resolution.service';

/**
 * Disputes over HTTP (PRD §6.10).
 *
 * The split between reading and resolving is PRD §9.2 made routable:
 * `RequiresStaff` admits SUPPORT and SUPER_ADMIN to every read, and
 * `RequiresAdmin` admits SUPER_ADMIN alone to the one route that moves
 * money. A support account able to release escrow is the most common
 * insider-fraud path in platforms like this.
 */
@ApiTags('disputes')
@Controller('v1')
export class DisputeController {
  constructor(
    private readonly disputes: DisputeService,
    private readonly resolution: ResolutionService,
  ) {}

  /** Either party to the order. Opening one moves no money. */
  @Post('p2p/orders/:id/dispute')
  @UseGuards(V1AuthGuard)
  async open(
    @CurrentUser() user: AuthUser,
    @Param('id') orderId: string,
    @Body() dto: OpenDisputeDto,
  ) {
    return ok(await this.disputes.open(orderId, user.sub, dto.reason));
  }

  @Get('admin/disputes')
  @UseGuards(V1AuthGuard, StaffGuard)
  @RequiresStaff()
  async queue() {
    return ok(await this.disputes.queue());
  }

  @Get('admin/disputes/:id')
  @UseGuards(V1AuthGuard, StaffGuard)
  @RequiresStaff()
  async one(@Param('id') id: string) {
    return ok(await this.disputes.get(id));
  }

  /** The one route here that moves money, and the only one SUPPORT cannot reach. */
  @Post('admin/disputes/:id/resolve')
  @UseGuards(V1AuthGuard, AdminGuard)
  @RequiresAdmin()
  async resolve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return ok(
      await this.resolution.resolve(
        id,
        user.sub,
        {
          outcome: dto.outcome,
          reason: dto.reason,
          counterpartyAmount: dto.counterpartyAmount,
        },
        idempotencyKey,
      ),
    );
  }
}
