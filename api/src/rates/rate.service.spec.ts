import { MockRateProvider } from './rate.provider';
import { RateService } from './rate.service';

let provider: MockRateProvider;
let rates: RateService;

beforeEach(() => {
  provider = new MockRateProvider();
  rates = new RateService(provider);
});

describe('markup (PRD §7)', () => {
  it('a sell rate is below mid — the customer receives less than mid', async () => {
    const q = await rates.quote('SELL');
    expect(Number(q.customerRate)).toBeLessThan(Number(q.referenceRate));
  });

  it('a buy rate is above mid — the customer pays more than mid', async () => {
    const q = await rates.quote('BUY');
    expect(Number(q.customerRate)).toBeGreaterThan(Number(q.referenceRate));
  });

  it('records the reference rate alongside the customer rate', async () => {
    const q = await rates.quote('SELL');
    expect(q.referenceRate).toBe('97.00');
    expect(q.markupBps).toBeGreaterThan(0);
  });

  it('applies the configured markup exactly', async () => {
    rates = new RateService(provider, {
      markupBps: 300,
      maxDeviationBps: 2000,
    });
    const q = await rates.quote('SELL');
    expect(q.customerRate).toBe('94.09'); // 97.00 * (1 - 0.03)
  });
});

// The bound is what stops a bad feed tick becoming a payout. Without it a
// spike to ₹1,000 promises ₹97,000 on a 100 USDT sell.
describe('deviation bound (PRD §7)', () => {
  it('accepts a tick inside the bound', async () => {
    await rates.quote('SELL');
    provider.next('98.00');
    await expect(rates.quote('SELL')).resolves.toBeDefined();
  });

  it('rejects a tick beyond the bound', async () => {
    await rates.quote('SELL');
    provider.next('1000.00');
    await expect(rates.quote('SELL')).rejects.toThrow(/deviation|unavailable/i);
  });

  it('rejects a collapse as well as a spike', async () => {
    await rates.quote('SELL');
    provider.next('1.00');
    await expect(rates.quote('SELL')).rejects.toThrow(/deviation|unavailable/i);
  });

  it('fails closed — reports pricing unavailable rather than guessing', async () => {
    await rates.quote('SELL');
    provider.next('1000.00');
    await expect(rates.quote('SELL')).rejects.toThrow(/unavailable/i);
  });

  it('the same bound applies to an admin override', async () => {
    await rates.quote('SELL');
    expect(() => rates.override('1000.00')).toThrow(/deviation|unavailable/i);
  });

  it('an admin override inside the bound is accepted', async () => {
    await rates.quote('SELL');
    rates.override('98.50');
    const q = await rates.quote('SELL');
    expect(q.referenceRate).toBe('98.50');
  });

  it('the first tick has nothing to deviate from and is accepted', async () => {
    provider.next('500.00');
    await expect(rates.quote('SELL')).resolves.toBeDefined();
  });

  it('a non-numeric tick is refused', async () => {
    provider.next('not-a-rate');
    await expect(rates.quote('SELL')).rejects.toThrow();
  });
});
