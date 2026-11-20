import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ok } from '../common/http';
import { CurrentUser, type AuthUser } from '../auth/current-user';
import { OtpService } from '../auth/v1/otp.service';
import { SessionService } from '../auth/v1/session.service';
import {
  PhoneGateGuard,
  RequiresVerifiedPhone,
} from '../auth/v1/phone-gate.guard';
import { AdminGuard, RequiresAdmin } from '../auth/v1/admin.guard';
import { PlatformSettingsService } from '../settings/platform-settings.service';
import type { SettingKey } from '../settings/platform-settings';
import { V1AuthGuard } from './v1-auth.guard';
import { V1Service } from './v1.service';
import type { CapabilityKey } from '../capability/capability.types';
import {
  DenyCapabilityDto,
  ChangeSettingDto,
  OtpRequestDto,
  OtpVerifyDto,
  RefreshDto,
  RegisterV1Dto,
} from './v1.dto';

@ApiTags('v1')
@Controller('v1')
export class V1Controller {
  constructor(
    private readonly v1: V1Service,
    private readonly otp: OtpService,
    private readonly sessions: SessionService,
    private readonly settings: PlatformSettingsService,
  ) {}

  @Post('admin/seed')
  seed() {
    return this.v1.seed().then(ok);
  }

  @Post('auth/register')
  async register(@Body() dto: RegisterV1Dto) {
    return ok(await this.v1.register(dto.email, dto.password, dto.displayName));
  }

  @Post('auth/refresh')
  async refresh(@Body() dto: RefreshDto) {
    return ok(await this.sessions.rotate(dto.refreshToken));
  }

  @Get('auth/me')
  @UseGuards(V1AuthGuard)
  async me(@CurrentUser() user: AuthUser) {
    return ok(await this.v1.me(user.sub));
  }

  @Post('auth/otp/request')
  @UseGuards(V1AuthGuard)
  async requestOtp(@CurrentUser() user: AuthUser, @Body() dto: OtpRequestDto) {
    return ok(await this.otp.request(user.sub, dto.phone));
  }

  @Post('auth/otp/verify')
  @UseGuards(V1AuthGuard)
  async verifyOtp(@CurrentUser() user: AuthUser, @Body() dto: OtpVerifyDto) {
    return ok(await this.otp.verify(user.sub, dto.phone, dto.code));
  }

  /**
   * A money operation, gated on a verified phone (PRD §9.1). The guard — not
   * this method — is what enforces it.
   */
  @Get('wallet/balances')
  @UseGuards(V1AuthGuard, PhoneGateGuard)
  @RequiresVerifiedPhone()
  async balances(@CurrentUser() user: AuthUser) {
    return ok(await this.v1.walletBalances(user.sub));
  }

  @Post('admin/capabilities/deny')
  @UseGuards(V1AuthGuard, AdminGuard)
  @RequiresAdmin()
  async deny(@Body() dto: DenyCapabilityDto) {
    return ok(
      await this.v1.denyCapability(
        dto.userId,
        dto.capability as CapabilityKey,
        dto.reason,
      ),
    );
  }

  @Post('admin/capabilities/grant')
  @UseGuards(V1AuthGuard, AdminGuard)
  @RequiresAdmin()
  async grant(@Body() dto: DenyCapabilityDto) {
    return ok(
      await this.v1.grantCapability(
        dto.userId,
        dto.capability as CapabilityKey,
        dto.reason,
      ),
    );
  }

  /**
   * The commercial numbers (PRD §6, §7). Readable so an admin can see what
   * the engine is actually running on, which is not always what anyone
   * remembers setting.
   */
  @Get('admin/settings')
  @UseGuards(V1AuthGuard, AdminGuard)
  @RequiresAdmin()
  async listSettings() {
    return ok(await this.settings.all());
  }

  /** Every change is bounded, attributed and given a reason (PRD §9.4). */
  @Put('admin/settings/:key')
  @UseGuards(V1AuthGuard, AdminGuard)
  @RequiresAdmin()
  async changeSetting(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Body() dto: ChangeSettingDto,
  ) {
    await this.settings.set(key as SettingKey, dto.value, {
      actorId: user.sub,
      reason: dto.reason,
    });
    return ok(await this.settings.all());
  }

  @Get('admin/audit')
  @UseGuards(V1AuthGuard, AdminGuard)
  @RequiresAdmin()
  async audit() {
    return ok(await this.v1.auditTrail());
  }
}
