import { idempotencyKeyFrom } from './idempotency.decorator';

describe('the Idempotency-Key header (PRD §5 rule 2)', () => {
  it('returns the header', () => {
    expect(
      idempotencyKeyFrom({ headers: { 'idempotency-key': 'abc-123' } }),
    ).toBe('abc-123');
  });

  it('trims it', () => {
    expect(
      idempotencyKeyFrom({ headers: { 'idempotency-key': '  abc-123  ' } }),
    ).toBe('abc-123');
  });

  /**
   * The header is the only thing standing between a retry and a second
   * order. Defaulting to a generated one would make every retry a new
   * request, which is precisely the failure it exists to prevent.
   */
  it('refuses a missing key', () => {
    expect(() => idempotencyKeyFrom({ headers: {} })).toThrow(
      /Idempotency-Key/,
    );
  });

  it('refuses a blank key', () => {
    expect(() =>
      idempotencyKeyFrom({ headers: { 'idempotency-key': '   ' } }),
    ).toThrow(/Idempotency-Key/);
  });

  /** A key is an index entry, not a payload. */
  it('refuses a key longer than 255 characters', () => {
    expect(() =>
      idempotencyKeyFrom({ headers: { 'idempotency-key': 'x'.repeat(256) } }),
    ).toThrow(/255/);
  });

  it('refuses a repeated header rather than guessing which one meant it', () => {
    expect(() =>
      idempotencyKeyFrom({ headers: { 'idempotency-key': ['a', 'b'] } }),
    ).toThrow(/Idempotency-Key/);
  });
});
