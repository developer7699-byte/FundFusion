import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../auth/current-user';
import { MoneyGateGuard, RequiresMoneyGate } from '../auth/v1/money-gate.guard';
import { ok } from '../common/http';
import { V1AuthGuard } from '../v1/v1-auth.guard';
import { AddPaymentMethodDto } from './payment.dto';
import { PaymentMethodService } from './payment-method.service';

/**
 * A user's INR payout destinations (PRD §6.3/§6.4). Behind the money gate: a
 * payout destination is where a trade's rupees are directed, so it is as
 * sensitive as a withdrawal address and sits behind the same enrolled
 * authenticator (PRD §9.1).
 */
@ApiTags('payment-methods')
@ApiBearerAuth()
@Controller('v1/wallet/payment-methods')
@UseGuards(V1AuthGuard, MoneyGateGuard)
@RequiresMoneyGate()
export class PaymentController {
  constructor(private readonly methods: PaymentMethodService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return ok(await this.methods.list(user.sub));
  }

  @Post()
  async add(@CurrentUser() user: AuthUser, @Body() dto: AddPaymentMethodDto) {
    return ok(await this.methods.add(user.sub, dto));
  }

  @Patch(':id/default')
  async setDefault(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return ok(await this.methods.setDefault(user.sub, id));
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.methods.remove(user.sub, id);
    return ok({ removed: true });
  }
}
