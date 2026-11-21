import { chainConfigFrom, BSC_TESTNET_CHAIN_ID } from './chain.config';

const env = {
  BSC_RPC_HTTP_URL: 'https://bsc-testnet.example/v1/key',
  BSC_RPC_WS_URL: 'wss://bsc-testnet.example/ws/v1/key',
  USDT_CONTRACT_ADDRESS: '0x1111111111111111111111111111111111111111',
};

describe('chain configuration (PRD §12)', () => {
  it('reads both endpoints and the token address', () => {
    const config = chainConfigFrom(env);

    expect(config.httpUrl).toBe(env.BSC_RPC_HTTP_URL);
    expect(config.wsUrl).toBe(env.BSC_RPC_WS_URL);
    expect(config.chainId).toBe(BSC_TESTNET_CHAIN_ID);
  });

  /**
   * The watcher needs a WSS subscription. The public testnet RPC drops
   * requests, and a watcher that misses a block loses a deposit silently —
   * so a missing endpoint is a refusal to start, not a warning.
   */
  it('refuses to start without an HTTP endpoint', () => {
    expect(() => chainConfigFrom({ ...env, BSC_RPC_HTTP_URL: '' })).toThrow(
      /BSC_RPC_HTTP_URL/,
    );
  });

  it('refuses to start without a WebSocket endpoint', () => {
    expect(() => chainConfigFrom({ ...env, BSC_RPC_WS_URL: '' })).toThrow(
      /BSC_RPC_WS_URL/,
    );
  });

  /**
   * There is no official Tether on BSC testnet, so the stand-in has to be
   * deployed before there is an address to configure. A fresh environment
   * legitimately has none.
   */
  it('allows a token address that does not exist yet', () => {
    expect(
      chainConfigFrom({ ...env, USDT_CONTRACT_ADDRESS: '' }).usdtAddress,
    ).toBe('');
  });

  it('refuses a token address that is not an address', () => {
    expect(() =>
      chainConfigFrom({ ...env, USDT_CONTRACT_ADDRESS: 'not-an-address' }),
    ).toThrow(/address/i);
  });

  /**
   * PRD §12: every v1 environment is BSC testnet. Pointing a signer at
   * mainnet is a bug, not a configuration — so reaching mainnet has to be a
   * deliberate change to this file, not a value someone pastes into `.env`.
   */
  it('refuses mainnet', () => {
    expect(() => chainConfigFrom({ ...env, BSC_CHAIN_ID: '56' })).toThrow(
      /testnet|97/i,
    );
  });
});
