import { isAddress } from 'viem';

/** BSC testnet. PRD §12 puts every v1 environment here. */
export const BSC_TESTNET_CHAIN_ID = 97;

export interface ChainConfig {
  httpUrl: string;
  /** The watcher subscribes here; PRD §8.2 requires it, so it is not optional. */
  wsUrl: string;
  chainId: number;
  /** Empty until the stand-in token is deployed (DEPENDENCIES §2.4). */
  usdtAddress: `0x${string}` | '';
}

function required(env: Record<string, string | undefined>, key: string) {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(
      `${key} is not set. The chain endpoints come from NodeReal (docs/DEPENDENCIES.md §2.1); the public RPC drops requests and a watcher that misses a block loses a deposit silently.`,
    );
  }
  return value;
}

/**
 * Chain configuration, validated at startup rather than at first use.
 *
 * A wallet that starts with half its configuration and discovers the rest
 * when money arrives is a wallet that discovers it at the worst moment.
 */
export function chainConfigFrom(
  env: Record<string, string | undefined> = process.env,
): ChainConfig {
  const httpUrl = required(env, 'BSC_RPC_HTTP_URL');
  const wsUrl = required(env, 'BSC_RPC_WS_URL');
  const usdtAddress = env.USDT_CONTRACT_ADDRESS?.trim() ?? '';

  if (usdtAddress && !isAddress(usdtAddress)) {
    throw new Error(
      `USDT_CONTRACT_ADDRESS is not an address: "${usdtAddress}".`,
    );
  }

  const chainId = Number(env.BSC_CHAIN_ID ?? BSC_TESTNET_CHAIN_ID);
  if (chainId !== BSC_TESTNET_CHAIN_ID) {
    // PRD §12: production is decided later. Reaching mainnet should be a
    // deliberate change to this file with a decision behind it, never a
    // value someone pastes into an environment.
    throw new Error(
      `v1 runs on BSC testnet (chain ${BSC_TESTNET_CHAIN_ID}); chain ${chainId} was configured.`,
    );
  }

  return {
    httpUrl,
    wsUrl,
    chainId,
    usdtAddress: usdtAddress as `0x${string}` | '',
  };
}
