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
import { MfaService } from '../auth/v1/mfa.service';
import { SessionService } from '../auth/v1/session.service';
import { MoneyGateGuard, RequiresMoneyGate } from '../auth/v1/money-gate.guard';
import { AdminGuard, RequiresAdmin } from '../auth/v1/admin.guard';
import { PlatformSettingsService } from '../settings/platform-settings.service';
import type { SettingKey } from '../settings/platform-settings';
import { V1AuthGuard } from './v1-auth.guard';
import { V1Service } from './v1.service';
import type { CapabilityKey } from '../capability/capability.types';
import {
  DenyCapabilityDto,
  ChangeSettingDto,
  EmailCodeDto,
  LoginDto,
  MfaCodeDto,
  RefreshDto,
  RegisterV1Dto,
} from './v1.dto';

@ApiTags('v1')
@Controller('v1')
export class V1Controller {
  constructor(
    private readonly v1: V1Service,
    private readonly mfa: MfaService,
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

  /** The code sent at registration. Returns a session (PRD §9.1). */
  @Post('auth/register/verify')
  async verifyEmail(@Body() dto: EmailCodeDto) {
    return ok(await this.v1.verifyEmail(dto.email, dto.code));
  }

  /** Step one: email and password. No session yet — a code goes out. */
  @Post('auth/login')
  async login(@Body() dto: LoginDto) {
    return ok(await this.v1.login(dto.email, dto.password));
  }

  /** Step two: the emailed code becomes a session. */
  @Post('auth/login/verify')
  async loginVerify(@Body() dto: EmailCodeDto) {
    return ok(await this.v1.loginVerify(dto.email, dto.code));
  }

  /**
   * Enrolling the authenticator that gates every money operation. The secret
   * is shown once, here, and never again.
   */
  @Post('auth/mfa/begin')
  @UseGuards(V1AuthGuard)
  async beginMfa(@CurrentUser() user: AuthUser) {
    return ok(await this.mfa.beginEnrolment(user.sub));
  }

  @Post('auth/mfa/confirm')
  @UseGuards(V1AuthGuard)
  async confirmMfa(@CurrentUser() user: AuthUser, @Body() dto: MfaCodeDto) {
    await this.mfa.confirmEnrolment(user.sub, dto.code);
    return ok({ enrolled: true });
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

  /**
   * A money operation, gated on an enrolled authenticator (PRD §9.1). The
   * guard — not this method — is what enforces it.
   */
  @Get('wallet/balances')
  @UseGuards(V1AuthGuard, MoneyGateGuard)
  @RequiresMoneyGate()
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
