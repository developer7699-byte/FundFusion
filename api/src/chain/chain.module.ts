import { Module } from '@nestjs/common';
import { chainConfigFrom, type ChainConfig } from './chain.config';
import { ViemChainClient } from './viem-chain.client';

export const CHAIN_CONFIG = Symbol('CHAIN_CONFIG');
export const CHAIN_CLIENT = Symbol('CHAIN_CLIENT');

/**
 * The chain seam (PRD §8.1). Everything above it reads `ChainClient`, so the
 * provider underneath — or a third-party custodian later — can change without
 * the ledger changing.
 */
@Module({
  providers: [
    { provide: CHAIN_CONFIG, useFactory: () => chainConfigFrom() },
    {
      provide: CHAIN_CLIENT,
      useFactory: (config: ChainConfig) => new ViemChainClient(config),
      inject: [CHAIN_CONFIG],
    },
  ],
  exports: [CHAIN_CONFIG, CHAIN_CLIENT],
})
export class ChainModule {}
