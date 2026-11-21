import { base32 } from '@scure/base';
import { generateSecret, provisioningUri, timeCounter, totpCode } from './totp';

/**
 * RFC 6238 Appendix B. The published vectors are the reason this is written
 * here rather than pulled in: an implementation with known-answer tests from
 * the standard is verifiable, and a dependency is one more thing in the
 * supply chain of the control that guards every withdrawal.
 */
const RFC_SEED = base32.encode(
  new TextEncoder().encode('12345678901234567890'),
);

describe('RFC 6238 known answers (SHA-1, 8 digits)', () => {
  const vectors: [number, string][] = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ];

  for (const [seconds, expected] of vectors) {
    it(`T=${seconds} yields ${expected}`, () => {
      expect(totpCode(RFC_SEED, timeCounter(seconds * 1000), 8)).toBe(expected);
    });
  }
});

describe('the codes an authenticator app shows', () => {
  it('is six digits by default', () => {
    expect(totpCode(RFC_SEED, timeCounter(59_000))).toMatch(/^\d{6}$/);
  });

  it('is the last six of the eight-digit answer', () => {
    expect(totpCode(RFC_SEED, timeCounter(59_000))).toBe('287082');
  });

  it('changes every thirty seconds', () => {
    expect(timeCounter(0)).toBe(0n);
    expect(timeCounter(29_999)).toBe(0n);
    expect(timeCounter(30_000)).toBe(1n);
  });

  it('pads a short code rather than showing five digits', () => {
    // Some counters produce a value below 100000; it must still be six long.
    const codes = Array.from({ length: 200 }, (_, i) =>
      totpCode(RFC_SEED, BigInt(i)),
    );
    expect(codes.every((c) => c.length === 6)).toBe(true);
  });
});

describe('enrolment', () => {
  it('generates a secret an authenticator app can read', () => {
    const secret = generateSecret();

    expect(secret).toMatch(/^[A-Z2-7]+=*$/);
    expect(base32.decode(secret).length).toBe(20);
  });

  it('generates a different secret every time', () => {
    expect(generateSecret()).not.toBe(generateSecret());
  });

  it('builds a provisioning URI the app can scan', () => {
    const uri = provisioningUri(
      'ABCDEFGHIJKLMNOP',
      'you@example.test',
      'FundFusion',
    );

    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain('secret=ABCDEFGHIJKLMNOP');
    expect(uri).toContain('issuer=FundFusion');
    // The label carries the account, so a person with several accounts can
    // tell them apart in the app.
    expect(uri).toContain(encodeURIComponent('you@example.test'));
  });
});
