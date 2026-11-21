import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../ledger/account.service';
import { PostingService } from '../ledger/posting.service';
import { usdt, usdtString } from '../money/money';
import type { ChainClient, TransferLog } from './chain.types';

type Db = NodePgDatabase<typeof schema>;

export interface WatcherConfig {
  tokenAddress: string;
  networkCode: string;
  /** Blocks per `eth_getLogs`. A long outage must not become one huge query. */
  maxBlockRange: bigint;
  /**
   * Where a watcher with no cursor begins. Defaults to the current finalized
   * head: a fresh install has no deposits behind it, because an address only
   * exists once a user asked for one. Set it to recover from an outage.
   */
  startBlock?: bigint;
}

export interface ScanResult {
  from: bigint;
  to: bigint;
  credited: string[];
}

/**
 * Finds deposits and credits them (PRD §8.2).
 *
 * It reads **at the finalized head and never at the chain head**. On BSC that
 * is not a preference: `eth_getLogs` returns incomplete results at the head,
 * so ERC-20 deposits are silently missed — and finality here is deterministic
 * (BEP-126), so waiting for it is both faster and a stronger guarantee than
 * counting confirmations.
 *
 * Because every log it acts on is already final, a credit goes straight to
 * AVAILABLE. Nothing posts to PENDING: a ledger entry written from a head
 * read would be money recorded from a source the PRD says cannot be trusted.
 */
@Injectable()
export class DepositWatcherService {
  private readonly log = new Logger(DepositWatcherService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly chain: ChainClient,
    private readonly posting: PostingService,
    private readonly config: WatcherConfig,
  ) {}

  async scanOnce(): Promise<ScanResult> {
    const networkId = await this.networkId();
    const finalized = await this.chain.finalizedBlockNumber();
    const cursor = await this.cursor(networkId, finalized);

    const from = cursor + 1n;
    if (from > finalized) return { from, to: cursor, credited: [] };

    const to =
      finalized - cursor > this.config.maxBlockRange
        ? cursor + this.config.maxBlockRange
        : finalized;

    const addresses = await this.ownedAddresses(networkId);
    const credited: string[] = [];

    if (addresses.length) {
      const logs = await this.chain.transferLogs(
        from,
        to,
        this.config.tokenAddress,
        addresses.map((a) => a.address),
      );

      const owner = new Map(
        addresses.map((a) => [a.address.toLowerCase(), a.accountId]),
      );

      for (const log of logs) {
        const accountId = owner.get(log.to.toLowerCase());
        if (!accountId) continue;
        if (await this.credit(log, accountId, networkId)) {
          credited.push(`${log.txHash}:${log.logIndex}`);
        }
      }
    }

    // Only now. A cursor that advances past a block whose credits threw is a
    // deposit nobody will ever look for again.
    await this.advance(networkId, to);
    return { from, to, credited };
  }

  /** Re-scan from a known point. Safe: crediting is idempotent per log. */
  async resetCursorTo(block: bigint): Promise<void> {
    await this.advance(await this.networkId(), block);
  }

  /**
   * One journal per log, keyed by the transaction and log index — derived
   * from the chain itself, so a re-scan after a restart collides by
   * construction rather than by the watcher remembering what it did.
   */
  private async credit(
    log: TransferLog,
    accountId: string,
    networkId: string,
  ): Promise<boolean> {
    const amount = usdtString(usdt(log.amount));

    const result = await this.posting.post({
      idempotencyKey: `deposit:${log.txHash}:${log.logIndex}`,
      memo: `deposit ${log.txHash}`,
      lines: [
        {
          accountId,
          accountType: 'AVAILABLE',
          direction: 'CREDIT',
          amount,
          assetSymbol: 'USDT',
        },
        {
          accountType: 'EXTERNAL',
          direction: 'DEBIT',
          amount,
          assetSymbol: 'USDT',
        },
      ],
    });

    if (result.replayed) return false;

    await this.db
      .insert(schema.deposit)
      .values({
        accountId,
        networkId,
        amount,
        status: 'CREDITED',
        txHash: log.txHash,
        logIndex: log.logIndex,
        blockNumber: log.blockNumber,
      })
      .onConflictDoNothing();

    this.log.log(`Credited ${amount} USDT from ${log.txHash}`);
    return true;
  }

  private async ownedAddresses(
    networkId: string,
  ): Promise<{ address: string; accountId: string }[]> {
    return this.db
      .select({
        address: schema.walletAddress.address,
        accountId: schema.walletAddress.accountId,
      })
      .from(schema.walletAddress)
      .where(eq(schema.walletAddress.networkId, networkId));
  }

  private async cursor(networkId: string, finalized: bigint): Promise<bigint> {
    const [row] = await this.db
      .select({ block: schema.chainCursor.lastScannedBlock })
      .from(schema.chainCursor)
      .where(eq(schema.chainCursor.networkId, networkId))
      .limit(1);

    if (row) return BigInt(row.block);

    // First run. Starting at zero would scan the chain from genesis; the
    // block before the finalized head means the first scan still covers it.
    const start = this.config.startBlock ?? finalized - 1n;
    return start < 0n ? 0n : start;
  }

  private async advance(networkId: string, block: bigint): Promise<void> {
    await this.db
      .insert(schema.chainCursor)
      .values({ networkId, lastScannedBlock: block })
      .onConflictDoUpdate({
        target: schema.chainCursor.networkId,
        set: { lastScannedBlock: block, updatedAt: new Date() },
      });
  }

  private async networkId(): Promise<string> {
    const [row] = await this.db
      .select({ id: schema.blockchainNetwork.id })
      .from(schema.blockchainNetwork)
      .where(eq(schema.blockchainNetwork.code, this.config.networkCode))
      .limit(1);

    if (!row) {
      throw new Error(
        `No blockchain_network row for "${this.config.networkCode}".`,
      );
    }
    return row.id;
  }
}
