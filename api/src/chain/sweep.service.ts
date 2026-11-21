import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../ledger/account.service';
import { Decimal } from '../money/money';
import type { SettingsReader } from '../settings/platform-settings';
import type { ChainClient } from './chain.types';
import type { Signer } from './signer';

type Db = NodePgDatabase<typeof schema>;

export interface SweepConfig {
  tokenAddress: string;
  hotWalletAddress: string;
  networkCode: string;
}

export interface SweepResult {
  swept: { address: string; amount: string; txHash: string }[];
}

/**
 * Moving deposits to the hot wallet (PRD §8.3).
 *
 * A deposit address is an inbox, not a vault. Two things make this harder
 * than it sounds. First, **the BEP-20 gas trap**: moving USDT out of an
 * address needs BNB *in that address*, and a freshly derived one has none —
 * so every sweep is two transactions and leaves BNB dust behind. Second, the
 * gas wallet that funds the first transaction is production infrastructure:
 * run it dry and every sweep stops while nothing errors and every dashboard
 * stays green.
 *
 * **A sweep posts no ledger journal.** It changes where the platform keeps
 * its own custody, not who owns what. Posting one would double-count every
 * deposit.
 */
@Injectable()
export class SweepService {
  private readonly log = new Logger(SweepService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly chain: ChainClient,
    private readonly signer: Signer,
    private readonly settings: SettingsReader,
    private readonly config: SweepConfig,
  ) {}

  async sweepOnce(): Promise<SweepResult> {
    const threshold = new Decimal(
      await this.settings.money('wallet.sweepThresholdUsdt'),
    );
    const topUp = await this.settings.money('wallet.gasTopUpBnb');
    const floor = new Decimal(await this.settings.money('wallet.gasFloorBnb'));

    const addresses = await this.depositAddresses();
    const swept: SweepResult['swept'] = [];

    for (const row of addresses) {
      const balance = new Decimal(
        await this.chain.tokenBalance(this.config.tokenAddress, row.address),
      );
      if (balance.lt(threshold)) continue;

      await this.assertGasAvailable(floor);

      // 1. Gas first, and only if the address cannot already pay its way.
      const gas = new Decimal(await this.chain.nativeBalance(row.address));
      if (gas.lt(new Decimal(topUp))) {
        await this.signer.sendGas(row.address, topUp);
      }

      // 2. Then the sweep itself. If this throws, nothing is recorded: a
      //    funded address that did not sweep is retried on the next pass.
      const txHash = await this.signer.sweepToken(
        row.derivationIndex,
        this.config.hotWalletAddress,
        balance.toFixed(),
      );

      swept.push({ address: row.address, amount: balance.toFixed(), txHash });
      this.log.log(`Swept ${balance.toFixed()} USDT from ${row.address}`);
    }

    return { swept };
  }

  /**
   * The check that keeps the silent failure loud. PRD §13.3 names the gas
   * wallet floor as an alert for exactly this reason.
   */
  private async assertGasAvailable(floor: Decimal): Promise<void> {
    const balance = new Decimal(
      await this.chain.nativeBalance(this.signer.gasWalletAddress()),
    );
    if (balance.lt(floor)) {
      throw new Error(
        `The gas wallet holds ${balance.toFixed()} BNB, below the ${floor.toFixed()} floor. Sweeping stops here rather than failing one address at a time.`,
      );
    }
  }

  private async depositAddresses(): Promise<
    { address: string; derivationIndex: number }[]
  > {
    const [network] = await this.db
      .select({ id: schema.blockchainNetwork.id })
      .from(schema.blockchainNetwork)
      .where(eq(schema.blockchainNetwork.code, this.config.networkCode))
      .limit(1);

    if (!network) return [];

    const rows = await this.db
      .select({
        address: schema.walletAddress.address,
        derivationIndex: schema.walletAddress.derivationIndex,
      })
      .from(schema.walletAddress)
      .where(eq(schema.walletAddress.networkId, network.id));

    return rows
      .filter((r) => r.derivationIndex !== null)
      .map((r) => ({
        address: r.address,
        derivationIndex: r.derivationIndex as number,
      }));
  }
}
