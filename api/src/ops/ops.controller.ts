import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ok } from '../common/http';
import { OpsService } from './ops.service';

class CreateOrderDto {
  @IsString()
  kind!: 'SELL' | 'UPI_PAY';
  @IsOptional()
  @IsString()
  usdtAmount?: string;
  @IsOptional()
  @IsString()
  inrAmount?: string;
  @IsOptional()
  @IsString()
  upiId?: string;
  @IsOptional()
  @IsString()
  beneficiary?: string;
}

@ApiTags('ops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Roles('CUSTOMER', 'ADMIN')
  @Get('orders')
  mine(@CurrentUser() user: AuthUser) {
    return ok(this.ops.customerOrders(user.sub));
  }

  @Roles('CUSTOMER', 'MERCHANT', 'ADMIN')
  @Get('orders/:id')
  one(@Param('id') id: string) {
    return ok(this.ops.order(id));
  }

  @Roles('CUSTOMER')
  @Post('orders')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return ok(this.ops.createOrder(user.sub, dto));
  }

  @Roles('CUSTOMER')
  @Post('orders/:id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return ok(this.ops.cancel(user.sub, id));
  }

  @Roles('CUSTOMER')
  @Post('orders/:id/dispute')
  dispute(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { reason: string }) {
    return ok(this.ops.dispute(user.sub, id, body.reason ?? 'Mock dispute'));
  }

  @Roles('CUSTOMER')
  @Post('upi/parse')
  parse(@Body() body: { payload: string }) {
    return ok(this.ops.parseUpi(body.payload ?? ''));
  }

  @Roles('CUSTOMER')
  @Get('gift-cards')
  gifts() {
    return ok(this.ops.giftCatalog());
  }

  @Roles('CUSTOMER')
  @Get('gift-cards/brands/:id')
  brand(@Param('id') id: string) {
    return ok(this.ops.giftBrand(id));
  }

  @Roles('CUSTOMER')
  @Get('gift-cards/history')
  giftHistory(@CurrentUser() user: AuthUser) {
    return ok(this.ops.giftOrders(user.sub));
  }

  @Roles('CUSTOMER')
  @Post('gift-cards/orders')
  buyGift(@CurrentUser() user: AuthUser, @Body() body: { productId: string }) {
    return ok(this.ops.buyGift(user.sub, body.productId));
  }

  @Roles('CUSTOMER')
  @Post('utilities/orders')
  util(@CurrentUser() user: AuthUser, @Body() body: { service: string; consumerId: string; amountInr: string }) {
    return ok(this.ops.payUtility(user.sub, body.service, body.consumerId, body.amountInr));
  }

  @Roles('CUSTOMER')
  @Get('utilities/history')
  utilHistory(@CurrentUser() user: AuthUser) {
    return ok(this.ops.utilOrders(user.sub));
  }

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
  ticket(@CurrentUser() user: AuthUser, @Body() body: { category: string; subject: string; body: string }) {
    return ok(this.ops.openTicket(user.sub, body.category, body.subject, body.body));
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
  reply(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { body: string }) {
    return ok(this.ops.replyTicket(user.sub, id, body.body));
  }

  @Roles('MERCHANT', 'ADMIN')
  @Get('merchant/dashboard')
  merchDash(@CurrentUser() user: AuthUser) {
    return ok(this.ops.merchantDesk(user.roles.includes('ADMIN') ? 'user-merchant' : user.sub));
  }

  @Roles('MERCHANT', 'ADMIN')
  @Get('merchant/available-orders')
  available() {
    return ok(this.ops.merchantAvailable());
  }

  @Roles('MERCHANT', 'ADMIN')
  @Get('merchant/orders')
  merchOrders(@CurrentUser() user: AuthUser) {
    return ok(this.ops.merchantOrders(user.roles.includes('ADMIN') ? 'user-merchant' : user.sub));
  }

  @Roles('MERCHANT')
  @Post('merchant/orders/:id/accept')
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return ok(this.ops.accept(user.sub, id));
  }

  @Roles('MERCHANT')
  @Post('merchant/orders/:id/utr')
  utr(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { utr: string; note?: string }) {
    return ok(this.ops.submitUtr(user.sub, id, body.utr, body.note));
  }

  @Roles('MERCHANT')
  @Post('merchant/orders/:id/complete')
  merchComplete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return ok(this.ops.complete(user.sub, id, 'MERCHANT'));
  }

  @Roles('ADMIN')
  @Get('admin/overview')
  admin() {
    return ok(this.ops.adminOverview());
  }

  @Roles('ADMIN')
  @Get('admin/users')
  users() {
    return ok(this.ops.users());
  }

  @Roles('ADMIN')
  @Post('admin/users/:id/status')
  status(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { status: 'ACTIVE' | 'SUSPENDED' }) {
    return ok(this.ops.setUserStatus(user.sub, id, body.status));
  }

  @Roles('ADMIN')
  @Get('admin/orders')
  allOrders() {
    return ok(this.ops.allOrders());
  }

  @Roles('ADMIN')
  @Get('admin/ledger')
  ledger() {
    return ok(this.ops.ledgerRows());
  }

  @Roles('ADMIN')
  @Get('admin/audit-logs')
  audit() {
    return ok(this.ops.audits());
  }

  @Roles('ADMIN')
  @Get('admin/disputes')
  disputes() {
    return ok(this.ops.disputes());
  }

  @Roles('ADMIN')
  @Post('admin/orders/:id/complete')
  adminComplete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return ok(this.ops.complete(user.sub, id, 'ADMIN'));
  }

  @Roles('ADMIN')
  @Post('admin/orders/:id/refund')
  refund(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return ok(this.ops.refund(user.sub, id));
  }

  @Roles('ADMIN')
  @Get('admin/settings')
  settings() {
    return ok(this.ops.settings());
  }
}
