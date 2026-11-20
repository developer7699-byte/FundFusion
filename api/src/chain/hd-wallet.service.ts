import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { and, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { privateKeyToAccount } from 'viem/accounts';
import { toHex } from 'viem';
import * as schema from '../db/schema';
import { AccountService, DRIZZLE } from '../ledger/account.service';

type Db = NodePgDatabase<typeof schema>;

/** BIP-44 for an EVM chain. BSC shares coin type 60 with Ethereum. */
const ACCOUNT_PATH = "m/44'/60'/0'/0";

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
    const phrase = config.seedPhrase?.trim();
    if (!phrase) {
      throw new Error(
        'BSC_HD_SEED is not set. Custody cannot start without a seed, and inventing one would strand every deposit made against it.',
      );
    }
    if (!validateMnemonic(phrase, wordlist)) {
      throw new Error(
        'BSC_HD_SEED is not a valid BIP-39 mnemonic. A mistyped seed derives different addresses, silently.',
      );
    }

    this.master = HDKey.fromMasterSeed(mnemonicToSeedSync(phrase));
    this.networkCode = config.networkCode ?? BSC_TESTNET_NETWORK;
    this.assetSymbol = config.assetSymbol ?? 'USDT';
  }

  /** The address derived at `index`. Pure: same seed, same answer. */
  addressAt(index: number): string {
    const child = this.master.derive(`${ACCOUNT_PATH}/${index}`);
    if (!child.privateKey) {
      throw new Error(`Could not derive a key at index ${index}.`);
    }
    return privateKeyToAccount(toHex(child.privateKey)).address;
  }

  /**
   * This user's deposit address, creating it on first use.
   *
   * The index comes from the database rather than from a count held in
   * memory: two users signing up in the same instant must not be handed the
   * same index, because that would hand them the same address.
   */
  async addressFor(userId: string): Promise<string> {
    await this.assertVerifiedPhone(userId);

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

  private async assertVerifiedPhone(userId: string): Promise<void> {
    const [row] = await this.db
      .select({ phoneVerifiedAt: schema.user.phoneVerifiedAt })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    if (!row?.phoneVerifiedAt) {
      // PRD §9.1: until the phone is verified the account has no deposit
      // address at all — not an unfunded one.
      throw new ForbiddenException(
        'Verify your phone number before receiving a deposit address.',
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
