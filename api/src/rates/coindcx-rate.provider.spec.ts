import { ServiceUnavailableException } from '@nestjs/common';
import { CoinDcxRateProvider } from './rate.provider';

/**
 * The live feed over HTTP (docs/DEPENDENCIES.md §3.1). `fetch` is stubbed so
 * the suite never reaches the network; what is under test is the parsing, the
 * 2dp rounding into the INR scale, and failing as ServiceUnavailableException
 * rather than leaking a raw error to the pricing guard.
 */
function stubFetch(impl: () => Promise<unknown>): void {
  (globalThis as { fetch: unknown }).fetch = jest.fn(impl);
}

function ticker(partial: Record<string, string>) {
  return { market: 'USDTINR', bid: '0', ask: '0', last_price: '0', ...partial };
}

function okResponse(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

let provider: CoinDcxRateProvider;

beforeEach(() => {
  provider = new CoinDcxRateProvider();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('CoinDcxRateProvider', () => {
  it('returns the bid/ask midpoint rounded to the 2dp INR scale', async () => {
    stubFetch(() =>
      okResponse([
        ticker({ market: 'BTCINR', bid: '1', ask: '2' }),
        ticker({ bid: '104.3300000000', ask: '104.3800000000' }),
      ]),
    );
    // (104.33 + 104.38) / 2 = 104.355 -> 104.36 half up
    expect(await provider.midRate()).toBe('104.36');
  });

  it('falls back to last_price when bid/ask are not positive', async () => {
    stubFetch(() =>
      okResponse([ticker({ bid: '0', ask: '0', last_price: '103.5000' })]),
    );
    expect(await provider.midRate()).toBe('103.50');
  });

  it('fails when the USDTINR market is absent', async () => {
    stubFetch(() => okResponse([ticker({ market: 'BTCINR', bid: '1', ask: '2' })]));
    await expect(provider.midRate()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('fails on a non-ok response', async () => {
    stubFetch(() => Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve([]) }));
    await expect(provider.midRate()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('fails closed when the feed is unreachable', async () => {
    stubFetch(() => Promise.reject(new Error('ECONNREFUSED')));
    await expect(provider.midRate()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('fails on an unusable price rather than throwing a raw parse error', async () => {
    stubFetch(() => okResponse([ticker({ bid: 'not-a-number', ask: 'x' })]));
    await expect(provider.midRate()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('serves a cached mid within the TTL, hitting the venue once', async () => {
    let clock = 1_000_000;
    const cached = new CoinDcxRateProvider(() => clock);
    const fetchMock = jest.fn(() =>
      okResponse([ticker({ bid: '104.00', ask: '104.00' })]),
    );
    (globalThis as { fetch: unknown }).fetch = fetchMock;

    expect(await cached.midRate()).toBe('104.00');
    clock += 10_000; // inside the 15s TTL
    expect(await cached.midRate()).toBe('104.00');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    clock += 10_000; // now past the TTL
    await cached.midRate();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
