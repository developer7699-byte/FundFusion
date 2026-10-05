import { Test } from '@nestjs/testing';
import { MockRateProvider } from './providers/mock-rate.provider';

describe('MockRateProvider', () => {
  it('returns a decimal string rather than a float', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [MockRateProvider],
    }).compile();
    const rates = moduleRef.get(MockRateProvider);
    expect(rates.usdtInr()).toBe('84.250000000000000000');
  });
});
