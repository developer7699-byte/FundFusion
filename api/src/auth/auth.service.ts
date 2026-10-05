import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { PrototypeStore } from '../prototype/prototype.store';
import { LoginDto, RefreshDto, RegisterDto, RequestOtpDto, VerifyOtpDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly store: PrototypeStore,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    if (this.store.findUserByEmail(dto.email)) {
      throw new ConflictException({
        success: false,
        error: { code: 'EMAIL_TAKEN', message: 'An account already uses this email.' },
      });
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.store.createUser({
      email: dto.email,
      displayName: dto.displayName,
      passwordHash,
      status: 'PENDING_VERIFICATION',
      roles: ['CUSTOMER'],
      emailVerifiedAt: null,
    });
    return this.issueTokens(user.id, user.email, user.roles);
  }

  async login(dto: LoginDto) {
    const user = this.store.findUserByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
      });
    }
    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) {
      user.failedLoginCount += 1;
      throw new UnauthorizedException({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
      });
    }
    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'SUSPENDED', message: 'This account is suspended.' },
      });
    }
    user.failedLoginCount = 0;
    user.lastLoginAt = new Date();
    return this.issueTokens(user.id, user.email, user.roles);
  }

  async requestOtp(dto: RequestOtpDto) {
    const code = this.config.get<string>('OTP_STATIC_DEV') ?? '246810';
    this.store.otps.unshift({
      id: randomUUID(),
      email: dto.email.toLowerCase(),
      codeHash: await bcrypt.hash(code, 8),
      attempts: 0,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      consumedAt: null,
    });
    return {
      delivered: false,
      mock: true,
      message: 'OTP is mocked. Development code is 246810. No SMS is sent.',
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const challenge = this.store.otps.find(
      (row) => row.email === dto.email.toLowerCase() && !row.consumedAt,
    );
    if (!challenge || challenge.expiresAt < new Date() || challenge.attempts >= 5) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'OTP_INVALID', message: 'That code is invalid or expired.' },
      });
    }
    const okHash = await bcrypt.compare(dto.code, challenge.codeHash);
    challenge.attempts += 1;
    if (!okHash) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'OTP_INVALID', message: 'That code is invalid or expired.' },
      });
    }
    challenge.consumedAt = new Date();
    const user = this.store.findUserByEmail(dto.email);
    if (user) {
      user.emailVerifiedAt = new Date();
      user.status = 'ACTIVE';
    }
    return { verified: true, mock: true };
  }

  async refresh(dto: RefreshDto) {
    let payload: { sub: string; email: string; roles: string[]; family: string; typ: string };
    try {
      payload = this.jwt.verify(dto.refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'REFRESH_INVALID', message: 'Refresh token is invalid.' },
      });
    }
    const hash = this.hashToken(dto.refreshToken);
    const session = this.store.sessions.find(
      (row) => row.userId === payload.sub && row.refreshTokenHash === hash && !row.revokedAt,
    );
    if (!session || session.expiresAt < new Date() || payload.typ !== 'refresh') {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'REFRESH_REUSE', message: 'Refresh token is no longer valid.' },
      });
    }
    session.revokedAt = new Date();
    return this.issueTokens(payload.sub, payload.email, payload.roles, payload.family);
  }

  async logout(userId: string) {
    for (const session of this.store.sessions) {
      if (session.userId === userId && !session.revokedAt) session.revokedAt = new Date();
    }
    return { loggedOut: true };
  }

  me(userId: string) {
    const user = this.store.users.get(userId);
    if (!user) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Sign in required.' },
      });
    }
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      roles: user.roles,
      simulated: true,
    };
  }

  private async issueTokens(userId: string, email: string, roles: string[], familyId?: string) {
    const family = familyId ?? randomUUID();
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, roles, typ: 'access' },
      { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'), expiresIn: '15m' },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, email, roles, family, typ: 'refresh' },
      { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'), expiresIn: '7d' },
    );
    this.store.sessions.push({
      id: randomUUID(),
      userId,
      familyId: family,
      refreshTokenHash: this.hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: null,
    });
    return { accessToken, refreshToken, tokenType: 'Bearer', simulated: true };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
