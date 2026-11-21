import { Logger } from '@nestjs/common';
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  parseAbiItem,
  parseEther,
  parseUnits,
  type EIP1193RequestFn,
  type PrivateKeyAccount,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { bscTestnet } from 'viem/chains';
import { Decimal } from '../money/money';
import { depositAccount, gasAccount, hotAccount } from './derivation';
import type { Signer } from './signer';

const TRANSFER = parseAbiItem(
  'function transfer(address to, uint256 value) returns (bool)',
);

/** BEP-20 USDT has 18 decimals, which is why the ledger column does too. */
const TOKEN_DECIMALS = 18;

export interface SignerConfig {
  httpUrl: string;
  /** The custody seed, from the environment only (PRD §13.5). */
  seedPhrase: string;
  tokenAddress: string;
}

/**
 * The sign-and-send side of custody (PRD §8.1, §8.3).
 *
 * Every method here waits for a receipt and checks it. Submitting a
 * transaction is not the same as it succeeding, and the two places that
 * difference matters are both in a sweep: gas that has not landed yet means
 * the token transfer reverts, and a token transfer that reverted but was
 * reported as swept leaves the USDT sitting in the deposit address while
 * everything downstream believes it moved.
 *
 * Keys live here and nowhere else. Nothing above this class holds one.
 */
export class ViemSigner implements Signer {
  private readonly log = new Logger(ViemSigner.name);
  private readonly gas: PrivateKeyAccount;
  private readonly hot: PrivateKeyAccount;
  private readonly publicClient: PublicClient;

  constructor(
    private readonly config: SignerConfig,
    /** Tests supply a scripted node; production supplies none and gets HTTP. */
    private readonly request?: EIP1193RequestFn,
  ) {
    this.gas = gasAccount(config.seedPhrase);
    this.hot = hotAccount(config.seedPhrase);
    this.publicClient = createPublicClient({
      chain: bscTestnet,
      transport: this.transport(),
    });
  }

  gasWalletAddress(): string {
    return this.gas.address;
  }

  hotWalletAddress(): string {
    return this.hot.address;
  }

  /**
   * Paying a withdrawal out of the hot wallet (PRD §8.4). Unlike a sweep
   * this needs no gas transaction first — the hot wallet holds BNB of its
   * own, because it is the one address that is funded on purpose.
   */
  async payout(to: string, amount: string): Promise<string> {
    this.assertPositive(amount, 'payout amount');

    const hash = await this.wallet(this.hot).writeContract({
      account: this.hot,
      chain: bscTestnet,
      address: this.config.tokenAddress as `0x${string}`,
      abi: [TRANSFER],
      functionName: 'transfer',
      args: [to as `0x${string}`, parseUnits(amount, TOKEN_DECIMALS)],
    });

    await this.assertMined(hash, `payout of ${amount} USDT to ${to}`);
    this.log.log(`Paid out ${amount} USDT to ${to}`);
    return hash;
  }

  /**
   * BNB into a deposit address so it can pay for its own sweep — the BEP-20
   * gas trap in PRD §8.3. Returns only once the BNB has actually landed.
   */
  async sendGas(to: string, amountBnb: string): Promise<string> {
    this.assertPositive(amountBnb, 'gas amount');

    const hash = await this.wallet(this.gas).sendTransaction({
      account: this.gas,
      chain: bscTestnet,
      to: to as `0x${string}`,
      value: parseEther(amountBnb),
    });

    await this.assertMined(hash, `gas top-up of ${amountBnb} BNB to ${to}`);
    this.log.log(`Sent ${amountBnb} BNB to ${to}`);
    return hash;
  }

  /** The whole USDT balance of the deposit address at `index`. */
  async sweepToken(index: number, to: string, amount: string): Promise<string> {
    this.assertPositive(amount, 'sweep amount');
    const from = depositAccount(this.config.seedPhrase, index);

    const hash = await this.wallet(from).writeContract({
      account: from,
      chain: bscTestnet,
      address: this.config.tokenAddress as `0x${string}`,
      abi: [TRANSFER],
      functionName: 'transfer',
      args: [to as `0x${string}`, parseUnits(amount, TOKEN_DECIMALS)],
    });

    await this.assertMined(
      hash,
      `sweep of ${amount} USDT from ${from.address}`,
    );
    return hash;
  }

  /**
   * A reverted transaction that returns a hash reads as a success to every
   * caller. This is where that stops.
   */
  private async assertMined(hash: string, what: string): Promise<void> {
    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: hash as `0x${string}`,
    });
    if (receipt.status !== 'success') {
      throw new Error(`The ${what} reverted on chain (${hash}).`);
    }
  }

  private assertPositive(amount: string, what: string): void {
    let value: Decimal;
    try {
      value = new Decimal(amount);
    } catch {
      throw new Error(`The ${what} "${amount}" is not a number.`);
    }
    if (!value.isFinite() || value.lte(0)) {
      throw new Error(`The ${what} must be positive, not "${amount}".`);
    }
  }

  private wallet(account: PrivateKeyAccount): WalletClient {
    return createWalletClient({
      account,
      chain: bscTestnet,
      transport: this.transport(),
    });
  }

  private transport() {
    return this.request
      ? custom({ request: this.request })
      : http(this.config.httpUrl);
  }
}
