import { Injectable } from '@nestjs/common';
import {
  createPublicClient,
  custom,
  formatUnits,
  http,
  parseAbiItem,
  type EIP1193RequestFn,
  type PublicClient,
} from 'viem';
import { bscTestnet } from 'viem/chains';
import type { ChainClient, TransferLog } from './chain.types';

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);

const BALANCE_OF = parseAbiItem(
  'function balanceOf(address owner) view returns (uint256)',
);

/** BEP-20 USDT has 18 decimals, which is why the ledger column does too. */
const TOKEN_DECIMALS = 18;

@Injectable()
export class ViemChainClient implements ChainClient {
  private readonly client: PublicClient;

  constructor(
    private readonly config: { httpUrl: string; chainId: number },
    /** Tests supply a scripted node; production supplies none and gets HTTP. */
    request?: EIP1193RequestFn,
  ) {
    this.client = createPublicClient({
      chain: bscTestnet,
      transport: request ? custom({ request: request }) : http(config.httpUrl),
    });
  }

  /** A signer pointed at the wrong chain is a bug, not a configuration. */
  async assertNetwork(): Promise<void> {
    const chainId = await this.client.getChainId();
    if (chainId !== this.config.chainId) {
      throw new Error(
        `The configured endpoint is chain ${chainId}, not chain ${this.config.chainId}.`,
      );
    }
  }

  /**
   * PRD §8.2. The finalized head, never the chain head: on BSC the head
   * returns incomplete `eth_getLogs` results, and finality here is
   * deterministic rather than probabilistic, so counting confirmations would
   * be both slower and a weaker guarantee.
   */
  async finalizedBlockNumber(): Promise<bigint> {
    let number: bigint | null | undefined;
    try {
      ({ number } = await this.client.getBlock({ blockTag: 'finalized' }));
    } catch (err) {
      // The driver's own message is "Block could not be found", which tells
      // whoever is reading the alert nothing about which block or why.
      throw new Error(
        `The node could not supply a finalized block: ${(err as Error).message}`,
      );
    }

    if (number === null || number === undefined) {
      throw new Error(
        'The node reported no finalized block. Treating that as "scan everything" would read at the head.',
      );
    }
    return number;
  }

  async nativeBalance(address: string): Promise<string> {
    const wei = await this.client.getBalance({
      address: address as `0x${string}`,
    });
    return formatUnits(wei, 18);
  }

  async tokenBalance(token: string, address: string): Promise<string> {
    const raw = await this.client.readContract({
      address: token as `0x${string}`,
      abi: [BALANCE_OF],
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });
    return formatUnits(raw, TOKEN_DECIMALS);
  }

  async transferLogs(
    fromBlock: bigint,
    toBlock: bigint,
    token: string,
    toAddresses: string[],
  ): Promise<TransferLog[]> {
    if (toBlock < fromBlock) {
      throw new Error(
        `Empty block range: ${fromBlock} to ${toBlock}. A range that runs backwards means a cursor past the finalized head.`,
      );
    }

    const owned = new Set(toAddresses.map((a) => a.toLowerCase()));
    const logs = await this.client.getLogs({
      address: token as `0x${string}`,
      event: TRANSFER_EVENT,
      fromBlock,
      toBlock,
    });

    return logs
      .filter((log) => owned.has(String(log.args.to).toLowerCase()))
      .map((log) => ({
        from: String(log.args.from),
        to: String(log.args.to),
        amount: formatUnits(log.args.value ?? 0n, TOKEN_DECIMALS),
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        blockNumber: log.blockNumber,
      }));
  }
}
