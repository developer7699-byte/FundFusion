import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/** Verifies the signed access token minted by SessionService. */
@Injectable()
export class V1AuthGuard implements CanActivate {
  private readonly jwt = new JwtService({});

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { sub: string };
    }>();

    const header = String(req.headers.authorization ?? '');
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('Sign in required.');

    try {
      req.user = this.jwt.verify<{ sub: string }>(token, {
        secret:
          process.env.JWT_ACCESS_SECRET ?? 'development_only_access_secret',
      });
      return true;
    } catch {
      throw new UnauthorizedException(
        'That session has expired. Sign in again.',
      );
    }
  }
}
