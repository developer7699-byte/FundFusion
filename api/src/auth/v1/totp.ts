import { base32 } from '@scure/base';
import { createHmac, randomBytes } from 'crypto';

/** RFC 6238's default, and what every authenticator app assumes. */
const STEP_SECONDS = 30;
const DIGITS = 6;

/** Which 30-second window a moment falls in. */
export function timeCounter(epochMillis: number): bigint {
  return BigInt(Math.floor(epochMillis / 1000 / STEP_SECONDS));
}

/**
 * One TOTP code (RFC 6238 over RFC 4226's HOTP).
 *
 * Written here rather than taken from a package: the algorithm is eight lines
 * and the standard publishes known-answer vectors, so this is verifiable in a
 * way a dependency is not — and it guards every withdrawal.
 */
export function totpCode(
  secretBase32: string,
  counter: bigint,
  digits: number = DIGITS,
): string {
  const key = base32.decode(secretBase32.toUpperCase());

  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(counter);

  const digest = createHmac('sha1', Buffer.from(key)).update(message).digest();

  // Dynamic truncation, RFC 4226 §5.3.
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];

  return String(binary % 10 ** digits).padStart(digits, '0');
}

/** A 160-bit secret, the length RFC 4226 recommends. */
export function generateSecret(): string {
  return base32.encode(randomBytes(20));
}

/**
 * What the QR code encodes. The label carries the account so somebody with
 * several accounts can tell them apart in the app.
 */
export function provisioningUri(
  secretBase32: string,
  account: string,
  issuer: string,
): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
