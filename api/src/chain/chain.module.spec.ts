import { isChainConfigured, isTokenConfigured } from './chain.module';

const full = {
  BSC_RPC_HTTP_URL: 'https://node',
  BSC_RPC_WS_URL: 'wss://node',
  USDT_CONTRACT_ADDRESS: '0x1111111111111111111111111111111111111111',
  BSC_HD_SEED: 'twelve words would go here',
};

describe('deciding whether this process talks to a chain', () => {
  it('is configured when every value is present', () => {
    expect(isChainConfigured(full)).toBe(true);
  });

  /** CI runs the ledger and engine suites with no chain at all. */
  it('is a quiet absence when nothing is set', () => {
    expect(isChainConfigured({})).toBe(false);
  });

  /**
   * Half a configuration is the dangerous state: an endpoint with no seed
   * watches for deposits to addresses it cannot derive, and the deposits are
   * unspendable by the time anyone notices.
   */
  it('refuses half a configuration', () => {
    expect(() => isChainConfigured({ ...full, BSC_HD_SEED: '' })).toThrow(
      /BSC_HD_SEED/,
    );
  });

  /**
   * Addresses derive from the seed alone, so a chain can be configured
   * before any token exists to watch for — which is every fresh testnet
   * environment, since the stand-in token has to be deployed first.
   */
  it('treats the token as a separate question', () => {
    expect(isChainConfigured({ ...full, USDT_CONTRACT_ADDRESS: '' })).toBe(
      true,
    );
    expect(isTokenConfigured({ ...full, USDT_CONTRACT_ADDRESS: '' })).toBe(
      false,
    );
    expect(isTokenConfigured(full)).toBe(true);
  });

  it('names every missing value, not just the first', () => {
    expect(() =>
      isChainConfigured({ ...full, BSC_HD_SEED: '', BSC_RPC_WS_URL: '' }),
    ).toThrow(/BSC_RPC_WS_URL.*BSC_HD_SEED|BSC_HD_SEED.*BSC_RPC_WS_URL/);
  });
});
