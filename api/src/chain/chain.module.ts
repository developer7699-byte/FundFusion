import { DynamicModule, Logger, Module } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AccountService } from '../ledger/account.service';
import { LedgerModule } from '../ledger/ledger.module';
import { PostingService } from '../ledger/posting.service';
import { SettingsModule } from '../settings/settings.module';
import { chainConfigFrom, type ChainConfig } from './chain.config';
import { DepositWatcherService } from './deposit-watcher.service';
import { HdWalletService } from './hd-wallet.service';
import { SweepService } from './sweep.service';
import { ViemChainClient } from './viem-chain.client';

export const CHAIN_CONFIG = Symbol('CHAIN_CONFIG');
export const CHAIN_CLIENT = Symbol('CHAIN_CLIENT');
export const CHAIN_SERVICES = Symbol('CHAIN_SERVICES');

/** What the rest of the system can use once a chain is configured. */
export interface ChainServices {
  wallets: HdWalletService;
  /** Null until a token contract exists to watch for. */
  watcher: DepositWatcherService | null;
  /** Null until the signer and hot wallet arrive with the live sweep. */
  sweeps: SweepService | null;
}

/**
 * Whether this process has everything it needs to talk to a chain.
 *
 * A deployment without these values is a legitimate state — CI runs the whole
 * ledger and engine suite with no chain at all — and it must be a quiet
 * absence rather than a crash on boot. What is *not* legitimate is half a
 * configuration: an endpoint without a seed would derive no addresses while
 * cheerfully watching for deposits to them.
 */
export function isChainConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const keys = ['BSC_RPC_HTTP_URL', 'BSC_RPC_WS_URL', 'BSC_HD_SEED'];
  const present = keys.filter((k) => env[k]?.trim());
  if (present.length === 0) return false;
  if (present.length === keys.length) return true;

  throw new Error(
    `Chain configuration is incomplete: missing ${keys.filter((k) => !env[k]?.trim()).join(', ')}. Half a chain configuration watches for deposits to addresses it cannot derive.`,
  );
}

/**
 * The token is a separate question from the chain.
 *
 * Deposit addresses are derived from the seed alone, so they can exist — and
 * be shown to a user — before any token contract does. On testnet there is
 * no official Tether at all and the stand-in has to be deployed first
 * (DEPENDENCIES §2.4), so this is the ordinary state of a fresh environment,
 * not a misconfiguration.
 */
export function isTokenConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env.USDT_CONTRACT_ADDRESS?.trim());
}

/**
 * The chain seam (PRD §8.1). Everything above reads `ChainClient` and
 * `Signer`, so the provider underneath — or a third-party custodian later —
 * changes without the ledger changing.
 */
@Module({})
export class ChainModule {
  static register(): DynamicModule {
    if (!isChainConfigured()) {
      new Logger(ChainModule.name).warn(
        'No chain configuration; deposits, sweeps and withdrawals are inactive in this process.',
      );
      return {
        module: ChainModule,
        providers: [{ provide: CHAIN_SERVICES, useValue: null }],
        exports: [CHAIN_SERVICES],
      };
    }

    return {
      module: ChainModule,
      imports: [LedgerModule, SettingsModule],
      providers: [
        { provide: CHAIN_CONFIG, useFactory: () => chainConfigFrom() },
        {
          provide: CHAIN_CLIENT,
          useFactory: (config: ChainConfig) => new ViemChainClient(config),
          inject: [CHAIN_CONFIG],
        },
        {
          provide: HdWalletService,
          useFactory: (db: DbService, accounts: AccountService) =>
            new HdWalletService(db.db, accounts, {
              seedPhrase: process.env.BSC_HD_SEED ?? '',
            }),
          inject: [DbService, AccountService],
        },
        {
          provide: DepositWatcherService,
          useFactory: (
            db: DbService,
            client: ViemChainClient,
            posting: PostingService,
            config: ChainConfig,
          ): DepositWatcherService | null =>
            config.usdtAddress
              ? new DepositWatcherService(db.db, client, posting, {
                  tokenAddress: config.usdtAddress,
                  networkCode: 'BSC_TESTNET',
                  maxBlockRange: 500n,
                })
              : null,
          inject: [DbService, CHAIN_CLIENT, PostingService, CHAIN_CONFIG],
        },
        {
          provide: CHAIN_SERVICES,
          useFactory: (
            wallets: HdWalletService,
            watcher: DepositWatcherService | null,
          ): ChainServices | null =>
            // The sweeper needs a signer, which arrives with the hot wallet
            // in Task 6's live half. Until then deposits are watched and
            // credited; nothing moves them on.
            ({ wallets, watcher, sweeps: null }),
          inject: [HdWalletService, DepositWatcherService],
        },
      ],
      exports: [
        CHAIN_CONFIG,
        CHAIN_CLIENT,
        CHAIN_SERVICES,
        HdWalletService,
        DepositWatcherService,
      ],
    };
  }
}
