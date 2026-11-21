import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { HDKey } from '@scure/bip32';
import { and, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { AccountService, DRIZZLE } from '../ledger/account.service';
import { depositAccountFrom, masterKey } from './derivation';

type Db = NodePgDatabase<typeof schema>;

export const BSC_TESTNET_NETWORK = 'BSC_TESTNET';

export interface HdWalletConfig {
  /**
   * The master seed phrase, from the environment only (PRD §13.5). It is
   * never written to the database, never a setting, and never reaches an
   * admin screen — a key an admin can read is a key that leaks with an admin
   * account.
   */
  seedPhrase: string;
  networkCode?: string;
  assetSymbol?: string;
}

/**
 * One HD-derived deposit address per user (PRD §8.1).
 *
 * The address is a function of the seed and an index, so it can always be
 * re-derived: an address we could not derive again is an address whose
 * deposits are unspendable.
 */
@Injectable()
export class HdWalletService {
  private readonly master: HDKey;
  private readonly networkCode: string;
  private readonly assetSymbol: string;

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly accounts: AccountService,
    config: HdWalletConfig,
  ) {
    this.master = masterKey(config.seedPhrase);
    this.networkCode = config.networkCode ?? BSC_TESTNET_NETWORK;
    this.assetSymbol = config.assetSymbol ?? 'USDT';
  }

  /** The address derived at `index`. Pure: same seed, same answer. */
  addressAt(index: number): string {
    return depositAccountFrom(this.master, index).address;
  }

  /**
   * This user's deposit address, creating it on first use.
   *
   * The index comes from the database rather than from a count held in
   * memory: two users signing up in the same instant must not be handed the
   * same index, because that would hand them the same address.
   */
  async addressFor(userId: string): Promise<string> {
    await this.assertMayHoldFunds(userId);

    const accountId = await this.accounts.ensureAccount(
      userId,
      this.assetSymbol,
    );
    const networkId = await this.networkId();

    const [existing] = await this.db
      .select({ address: schema.walletAddress.address })
      .from(schema.walletAddress)
      .where(
        and(
          eq(schema.walletAddress.accountId, accountId),
          eq(schema.walletAddress.networkId, networkId),
        ),
      )
      .limit(1);

    if (existing) return existing.address;

    return this.db.transaction(async (tx) => {
      // Serialise index allocation on the network row. Cheap, and the
      // alternative is a retry loop around a unique violation.
      await tx.execute(
        sql`SELECT id FROM blockchain_network WHERE id = ${networkId} FOR UPDATE`,
      );

      const [row] = await tx
        .select({ next: sql<number>`COALESCE(MAX(derivation_index), -1) + 1` })
        .from(schema.walletAddress)
        .where(eq(schema.walletAddress.networkId, networkId));

      const index = Number(row.next);
      const address = this.addressAt(index);

      await tx.insert(schema.walletAddress).values({
        accountId,
        networkId,
        address,
        derivationIndex: index,
        isDefault: true,
      });

      return address;
    });
  }

  /**
   * PRD §9.1 (revised 2026-11-21). Until the account is verified and has an
   * authenticator it has no deposit address at all — not an unfunded one.
   * The same two conditions `MoneyGateGuard` enforces on every other money
   * route, because two different rules deciding who may hold money is how
   * one of them gets forgotten.
   */
  private async assertMayHoldFunds(userId: string): Promise<void> {
    const [row] = await this.db
      .select({
        emailVerifiedAt: schema.user.emailVerifiedAt,
        mfaEnrolledAt: schema.user.mfaEnrolledAt,
      })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    if (!row?.emailVerifiedAt) {
      throw new ForbiddenException(
        'Verify your email address before receiving a deposit address.',
      );
    }
    if (!row.mfaEnrolledAt) {
      throw new ForbiddenException(
        'Set up your authenticator app before receiving a deposit address.',
      );
    }
  }

  private async networkId(): Promise<string> {
    const [row] = await this.db
      .select({ id: schema.blockchainNetwork.id })
      .from(schema.blockchainNetwork)
      .where(eq(schema.blockchainNetwork.code, this.networkCode))
      .limit(1);

    if (!row) {
      throw new Error(
        `No blockchain_network row for "${this.networkCode}". Seed it before deriving addresses.`,
      );
    }
    return row.id;
  }
}
