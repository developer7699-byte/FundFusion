import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../auth/current-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ok } from '../common/http';
import { OpsService } from './ops.service';

/**
 * What is left of the prototype surface: notifications and support tickets.
 *
 * Its orders, its merchant desk and its admin reads were replaced by the v1
 * engine in M4.6 and deleted, because two surfaces answering the same
 * question is how one of them quietly becomes wrong. Notifications arrive
 * with M6; until then these routes are the only ones serving those screens.
 */
@ApiTags('ops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Roles('CUSTOMER', 'MERCHANT', 'ADMIN')
  @Get('notifications')
  notices(@CurrentUser() user: AuthUser) {
    return ok(this.ops.notices(user.sub));
  }

  @Roles('CUSTOMER', 'MERCHANT', 'ADMIN')
  @Post('notifications/read')
  read(@CurrentUser() user: AuthUser, @Body() body: { id?: string }) {
    return ok(this.ops.markRead(user.sub, body.id));
  }

  @Roles('CUSTOMER')
  @Post('support')
  ticket(
    @CurrentUser() user: AuthUser,
    @Body() body: { category: string; subject: string; body: string },
  ) {
    return ok(
      this.ops.openTicket(user.sub, body.category, body.subject, body.body),
    );
  }

  @Roles('CUSTOMER', 'ADMIN')
  @Get('support')
  tickets(@CurrentUser() user: AuthUser) {
    return ok(this.ops.ticketsFor(user.sub, user.roles.includes('ADMIN')));
  }

  @Roles('CUSTOMER', 'ADMIN')
  @Get('support/:id')
  ticketOne(@Param('id') id: string) {
    return ok(this.ops.ticket(id));
  }

  @Roles('CUSTOMER', 'ADMIN')
  @Post('support/:id/reply')
  reply(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    return ok(this.ops.replyTicket(user.sub, id, body.body));
  }
}
