import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
}

/**
 * Google is the only OAuth provider in v1 (PRD §9.1).
 *
 * The service is a config seam: it is inert until credentials exist, so the
 * milestone completes without them and sign-in fails with a message naming
 * exactly what an operator must set, rather than crashing on boot.
 */
@Injectable()
export class GoogleOauthService {
  private value(key: string): string {
    return (process.env[key] ?? '').trim();
  }

  isConfigured(): boolean {
    return Boolean(
      this.value('GOOGLE_CLIENT_ID') && this.value('GOOGLE_CLIENT_SECRET'),
    );
  }

  async verifyIdToken(idToken: string): Promise<GoogleIdentity> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it.',
      );
    }

    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!res.ok) {
      throw new ServiceUnavailableException(
        'Google rejected that sign-in token.',
      );
    }

    const claims = (await res.json()) as {
      sub?: string;
      email?: string;
      email_verified?: string | boolean;
      aud?: string;
    };

    if (claims.aud !== this.value('GOOGLE_CLIENT_ID')) {
      throw new ServiceUnavailableException(
        'That token was issued for a different client.',
      );
    }

    return {
      sub: claims.sub ?? '',
      email: claims.email ?? '',
      emailVerified:
        claims.email_verified === true || claims.email_verified === 'true',
    };
  }
}
