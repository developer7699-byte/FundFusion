import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ok } from '../common/http';
import { AuthService } from './auth.service';
import { CurrentUser, type AuthUser } from './current-user';
import { LoginDto, RefreshDto, RegisterDto, RequestOtpDto, VerifyOtpDto } from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return ok(await this.auth.register(dto));
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return ok(await this.auth.login(dto));
  }

  @Post('otp/request')
  async requestOtp(@Body() dto: RequestOtpDto) {
    return ok(await this.auth.requestOtp(dto));
  }

  @Post('otp/verify')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return ok(await this.auth.verifyOtp(dto));
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return ok(await this.auth.refresh(dto));
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async logout(@CurrentUser() user: AuthUser) {
    return ok(await this.auth.logout(user.sub));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async me(@CurrentUser() user: AuthUser) {
    return ok(await this.auth.me(user.sub));
  }
}
