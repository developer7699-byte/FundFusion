import { Decimal, inr, inrString, payableUp, payoutDown, usdt, usdtString } from './money';

describe('usdt (PRD §5.1 — NUMERIC(38,18))', () => {
  it('keeps 18 decimal places exactly', () => {
    expect(usdtString(usdt('0.123456789012345678'))).toBe('0.123456789012345678');
  });

  // A value the column cannot hold must fail loudly at the boundary. Arriving
  // truncated is what makes a journal stop summing to zero.
  it('rejects more than 18 decimal places rather than truncating', () => {
    expect(() => usdt('0.1234567890123456789')).toThrow(/precision/i);
  });

  it('rejects a value that does not fit NUMERIC(38,18)', () => {
    expect(() => usdt('1'.repeat(21))).toThrow(/range/i);
  });

  it('always returns a string, never a JavaScript number', () => {
    expect(typeof usdtString(usdt('1'))).toBe('string');
  });

  it('accepts the largest value the column can hold', () => {
    const max = '9'.repeat(20) + '.' + '9'.repeat(18);
    expect(usdtString(usdt(max))).toBe(max);
  });
});

describe('inr (PRD §5.1 — NUMERIC(20,2))', () => {
  it('keeps 2 decimal places exactly', () => {
    expect(inrString(inr('9700.45'))).toBe('9700.45');
  });

  it('rejects more than 2 decimal places rather than truncating', () => {
    expect(() => inr('9700.456')).toThrow(/precision/i);
  });

  it('rejects a value that does not fit NUMERIC(20,2)', () => {
    expect(() => inr('1'.repeat(19))).toThrow(/range/i);
  });
});

describe('conservative rounding (PRD §5.1)', () => {
  it('rounds a customer payout down', () => {
    const r = payoutDown(new Decimal('9700.005'), 2);
    expect([r.value.toFixed(2), r.residue.toFixed(3)]).toEqual(['9700.00', '0.005']);
  });

  it('rounds a customer payable up', () => {
    const r = payableUp(new Decimal('9700.001'), 2);
    expect([r.value.toFixed(2), r.residue.toFixed(3)]).toEqual(['9700.01', '-0.009']);
  });

  it('reports a zero residue when the value is already exact', () => {
    expect(payoutDown(new Decimal('10.00'), 2).residue.isZero()).toBe(true);
  });

  it('residue plus rounded value reconstructs the original exactly', () => {
    const r = payoutDown(new Decimal('1.239'), 2);
    expect(r.value.plus(r.residue).toFixed(3)).toBe('1.239');
  });

  it('a payable residue also reconstructs the original', () => {
    const r = payableUp(new Decimal('1.231'), 2);
    expect(r.value.plus(r.residue).toFixed(3)).toBe('1.231');
  });

  it('the platform is never short — payout <= original <= payable', () => {
    const v = new Decimal('55.555');
    expect(payoutDown(v, 2).value.lte(v)).toBe(true);
    expect(payableUp(v, 2).value.gte(v)).toBe(true);
  });
});
