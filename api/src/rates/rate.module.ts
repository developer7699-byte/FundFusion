import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { PlatformSettingsService } from '../settings/platform-settings.service';
import {
  CoinDcxRateProvider,
  MockRateProvider,
  type RateProvider,
} from './rate.provider';
import { RateService } from './rate.service';

export const RATE_PROVIDER = Symbol('RATE_PROVIDER');

/**
 * The live feed is CoinDCX (docs/DEPENDENCIES.md §3.1). Tests and anyone who
 * sets `RATES_PROVIDER=mock` get the deterministic offline provider instead, so
 * the suite never reaches the network. Nothing above this module changes.
 */
function makeRateProvider(): RateProvider {
  const offline =
    process.env.NODE_ENV === 'test' || process.env.RATES_PROVIDER === 'mock';
  return offline ? new MockRateProvider() : new CoinDcxRateProvider();
}

@Module({
  imports: [SettingsModule],
  providers: [
    { provide: RATE_PROVIDER, useFactory: makeRateProvider },
    {
      provide: RateService,
      useFactory: (provider: RateProvider, settings: PlatformSettingsService) =>
        new RateService(provider, settings),
      inject: [RATE_PROVIDER, PlatformSettingsService],
    },
  ],
  exports: [RateService, RATE_PROVIDER],
})
export class RateModule {}
