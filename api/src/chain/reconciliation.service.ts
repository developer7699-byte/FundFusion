import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../ledger/account.service';
import { Decimal, usdt, usdtString } from '../money/money';
import {
  fixedSettings,
  type SettingsReader,
} from '../settings/platform-settings';
import type { ChainClient } from './chain.types';

type Db = NodePgDatabase<typeof schema>;

export interface ReconciliationConfig {
  tokenAddress: string;
  networkCode: string;
  hotWalletAddress: string;
}

export interface ReconciliationReport {
  /** What the ledger says the platform holds. */
  ledgerUsdt: string;
  /** What the chain says it holds, across the hot wallet and every deposit address. */
  onChainUsdt: string;
  /** On-chain minus ledger. Negative means the platform is short. */
  drift: string;
  tolerance: string;
  unbalancedJournals: string[];
  clean: boolean;
}

/**
 * Is the data correct right now (PRD §13.1)?
 *
 * Two checks, and they are not of equal value. That every journal sums to
 * zero is nearly free and catches almost nothing — correctly written
 * double-entry balances by construction, so it mostly proves the arithmetic
 * back to itself. **The second check is the one that matters**, because it
 * is the only check whose two sides are produced by independent systems:
 * our ledger, and the chain. It catches missed credits, double credits and
 * unauthorised withdrawals, none of which check one can see.
 */
@Injectable()
export class ReconciliationService {
  private readonly log = new Logger(ReconciliationService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly chain: ChainClient,
    private readonly settings: SettingsReader = fixedSettings(),
    private readonly config: ReconciliationConfig = {
      tokenAddress: '',
      networkCode: 'BSC_TESTNET',
      hotWalletAddress: '',
    },
  ) {}

  async check(): Promise<ReconciliationReport> {
    const [ledger, onChain, unbalancedJournals, tolerance] = await Promise.all([
      this.ledgerCustody(),
      this.onChainCustody(),
      this.unbalancedJournals(),
      this.settings.money('reconciliation.dustToleranceUsdt'),
    ]);

    const drift = onChain.minus(ledger);
    const clean =
      drift.abs().lte(usdt(tolerance)) && unbalancedJournals.length === 0;

    const report: ReconciliationReport = {
      ledgerUsdt: usdtString(ledger),
      onChainUsdt: usdtString(onChain),
      drift: usdtString(drift),
      tolerance: usdtString(usdt(tolerance)),
      unbalancedJournals,
      clean,
    };

    if (!clean) {
      this.log.error(
        `Reconciliation drift: ledger ${report.ledgerUsdt}, chain ${report.onChainUsdt}, drift ${report.drift}. Unbalanced journals: ${unbalancedJournals.length}.`,
      );
    }
    return report;
  }

  /**
   * Everything that is not EXTERNAL. Every journal balances, so this is the
   * net that has come in from outside and not gone back out — which is
   * exactly what the platform should be holding on chain. A withdrawal
   * debits a user bucket and credits EXTERNAL, so it leaves this total the
   * moment it leaves the chain.
   */
  private async ledgerCustody(): Promise<Decimal> {
    const res = await this.db.execute<{ total: string }>(sql`
      SELECT COALESCE(
               SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE -amount END),
               0
             )::numeric(38,18)::text AS total
        FROM ledger_entry
       WHERE account_type <> 'EXTERNAL'
         AND asset_symbol = 'USDT'
    `);
    return new Decimal(res.rows[0].total);
  }

  /** The hot wallet plus every deposit address not yet swept out of. */
  private async onChainCustody(): Promise<Decimal> {
    const addresses = [...(await this.depositAddresses())];
    if (this.config.hotWalletAddress) {
      addresses.push(this.config.hotWalletAddress);
    }

    let total = new Decimal(0);
    for (const address of addresses) {
      total = total.plus(
        await this.chain.tokenBalance(this.config.tokenAddress, address),
      );
    }
    return total;
  }

  private async depositAddresses(): Promise<string[]> {
    const [network] = await this.db
      .select({ id: schema.blockchainNetwork.id })
      .from(schema.blockchainNetwork)
      .where(eq(schema.blockchainNetwork.code, this.config.networkCode))
      .limit(1);

    if (!network) return [];

    const rows = await this.db
      .select({ address: schema.walletAddress.address })
      .from(schema.walletAddress)
      .where(eq(schema.walletAddress.networkId, network.id));

    return rows.map((r) => r.address);
  }

  private async unbalancedJournals(): Promise<string[]> {
    const res = await this.db.execute<{ transaction_id: string }>(sql`
      SELECT transaction_id
        FROM ledger_entry
       GROUP BY transaction_id
      HAVING SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE -amount END) <> 0
    `);
    return res.rows.map((r) => r.transaction_id);
  }
}
