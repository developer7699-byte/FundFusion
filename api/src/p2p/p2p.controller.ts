import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../auth/current-user';
import { MoneyGateGuard, RequiresMoneyGate } from '../auth/v1/money-gate.guard';
import { ok } from '../common/http';
import { IdempotencyKey } from '../common/idempotency.decorator';
import { V1AuthGuard } from '../v1/v1-auth.guard';
import { AssignmentService } from './assignment.service';
import { OrderFeedService } from './order-feed.service';
import { OrderService } from './order.service';
import { ConfirmOrderDto, CreateQuoteDto, SubmitUtrDto } from './p2p.dto';
import { QuoteService } from './quote.service';
import { SettlementService } from './settlement.service';

/**
 * The P2P engine over HTTP (PRD §6).
 *
 * Thin by design. Every refusal this surface returns is the engine's, made
 * inside the transaction that would otherwise have moved the money — the
 * controller adds no check of its own, because a check here would be a
 * second place that decides, and the one inside the transaction is the one
 * that is actually safe.
 */
@ApiTags('p2p')
@Controller('v1/p2p')
@UseGuards(V1AuthGuard, MoneyGateGuard)
@RequiresMoneyGate()
export class P2pController {
  constructor(
    private readonly quotes: QuoteService,
    private readonly orders: OrderService,
    private readonly assignments: AssignmentService,
    private readonly settlement: SettlementService,
    private readonly feed: OrderFeedService,
  ) {}

  /** A price, snapshotted. Everything downstream settles against this row. */
  @Post('quotes')
  async quote(@CurrentUser() user: AuthUser, @Body() dto: CreateQuoteDto) {
    return ok(
      await this.quotes.create({
        userId: user.sub,
        side: dto.side,
        usdtAmount: dto.usdtAmount,
        inrAmount: dto.inrAmount,
      }),
    );
  }

  @Post('orders')
  async confirm(
    @CurrentUser() user: AuthUser,
    @Body() dto: ConfirmOrderDto,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return ok(await this.orders.confirm(dto.quoteId, user.sub, idempotencyKey));
  }

  /** Every order this caller is a party to — the orders screen. */
  @Get('orders')
  async myOrders(@CurrentUser() user: AuthUser) {
    return ok(await this.feed.minePaged(user.sub));
  }

  @Get('orders/:id')
  async order(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return ok(await this.feed.detail(id, user.sub));
  }

  @Get('merchant/feed')
  async merchantFeed(@CurrentUser() user: AuthUser) {
    return ok(await this.feed.availableFor(user.sub));
  }

  @Post('orders/:id/accept')
  async accept(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return ok(await this.assignments.accept(id, user.sub, idempotencyKey));
  }

  /** Evidence, not authority — a UTR alone never releases escrow (PRD §6.8). */
  @Post('orders/:id/utr')
  async utr(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SubmitUtrDto,
  ) {
    return ok(await this.settlement.submitUtr(id, user.sub, dto.utr));
  }

  @Post('orders/:id/confirm')
  async confirmReceipt(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return ok(
      await this.settlement.confirmReceipt(id, user.sub, idempotencyKey),
    );
  }
}
