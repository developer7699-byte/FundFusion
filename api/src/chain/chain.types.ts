/** One ERC-20 Transfer into an address the platform controls. */
export interface TransferLog {
  from: string;
  to: string;
  /** Decimal string. A JavaScript number never holds money (PRD §5.1). */
  amount: string;
  txHash: string;
  logIndex: number;
  blockNumber: bigint;
}

/**
 * The read side of the chain (PRD §8.1). Narrow on purpose: everything above
 * it is written against this, so the provider underneath can change without
 * the ledger noticing.
 */
export interface ChainClient {
  assertNetwork(): Promise<void>;
  finalizedBlockNumber(): Promise<bigint>;
  transferLogs(
    fromBlock: bigint,
    toBlock: bigint,
    token: string,
    toAddresses: string[],
  ): Promise<TransferLog[]>;
  /** Native BNB, as a decimal string. */
  nativeBalance(address: string): Promise<string>;
  /** BEP-20 balance of the configured token, as a decimal string. */
  tokenBalance(token: string, address: string): Promise<string>;
}
