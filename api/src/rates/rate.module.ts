import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { PlatformSettingsService } from '../settings/platform-settings.service';
import { MockRateProvider } from './rate.provider';
import { RateService } from './rate.service';

export const RATE_PROVIDER = Symbol('RATE_PROVIDER');

/**
 * The provider is swapped for CoinDCX behind the same interface once the feed
 * is configured (docs/DEPENDENCIES.md §3.1). Nothing above this module changes.
 */
@Module({
  imports: [SettingsModule],
  providers: [
    { provide: RATE_PROVIDER, useClass: MockRateProvider },
    {
      provide: RateService,
      useFactory: (
        provider: MockRateProvider,
        settings: PlatformSettingsService,
      ) => new RateService(provider, settings),
      inject: [RATE_PROVIDER, PlatformSettingsService],
    },
  ],
  exports: [RateService, RATE_PROVIDER],
})
export class RateModule {}
