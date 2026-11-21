/**
 * The sign-and-send side of custody (PRD §8.1).
 *
 * Deliberately narrow, and deliberately separate from `ChainClient`: reading
 * the chain is harmless, signing is not. A third-party custodian replaces
 * this interface later without the ledger changing — and nothing above it
 * ever holds a key.
 */
export interface Signer {
  /** The gas wallet's own address. */
  gasWalletAddress(): string;
  /** BNB from the gas wallet, so a deposit address can pay for its own sweep. */
  sendGas(to: string, amountBnb: string): Promise<string>;
  /** USDT out of the deposit address derived at `index`. */
  sweepToken(index: number, to: string, amount: string): Promise<string>;
}
