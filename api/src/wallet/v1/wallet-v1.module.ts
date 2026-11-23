import { Module } from '@nestjs/common';
import { AuditModule } from '../../audit/audit.module';
import { AuditService } from '../../audit/audit.service';
import { MfaService } from '../../auth/v1/mfa.service';
import { CapabilityModule } from '../../capability/capability.module';
import { CapabilityService } from '../../capability/capability.service';
import { DbService } from '../../db/db.service';
import { AccountService, DRIZZLE } from '../../ledger/account.service';
import { LedgerModule } from '../../ledger/ledger.module';
import { PostingService } from '../../ledger/posting.service';
import { RateModule } from '../../rates/rate.module';
import { PlatformSettingsService } from '../../settings/platform-settings.service';
import { SettingsModule } from '../../settings/settings.module';
import { ActivityService } from './activity.service';
import { AllowlistService } from './allowlist.service';
import { WalletV1Controller } from './wallet-v1.controller';
import { WithdrawalService } from './withdrawal.service';

/**
 * Withdrawals and the address allowlist (PRD §8.4).
 *
 * Built with factories rather than constructor injection because both
 * services depend on `SettingsReader` — an interface, so that a unit test can
 * supply the two numbers it cares about without a database. Nest cannot
 * inject an interface, so the wiring names the implementation here, once.
 */
@Module({
  imports: [
    LedgerModule,
    CapabilityModule,
    AuditModule,
    SettingsModule,
    RateModule,
  ],
  controllers: [WalletV1Controller],
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (db: DbService) => db.db,
      inject: [DbService],
    },
    {
      provide: MfaService,
      useFactory: (db: DbService) => new MfaService(db.db),
      inject: [DbService],
    },
    {
      provide: ActivityService,
      useFactory: (db: DbService) => new ActivityService(db.db),
      inject: [DbService],
    },
    {
      provide: AllowlistService,
      useFactory: (
        db: DbService,
        mfa: MfaService,
        audit: AuditService,
        settings: PlatformSettingsService,
      ) => new AllowlistService(db.db, mfa, audit, settings),
      inject: [DbService, MfaService, AuditService, PlatformSettingsService],
    },
    {
      provide: WithdrawalService,
      useFactory: (
        db: DbService,
        allowlist: AllowlistService,
        mfa: MfaService,
        capabilities: CapabilityService,
        posting: PostingService,
        accounts: AccountService,
        audit: AuditService,
        settings: PlatformSettingsService,
      ) =>
        new WithdrawalService(
          db.db,
          allowlist,
          mfa,
          capabilities,
          posting,
          accounts,
          audit,
          settings,
        ),
      inject: [
        DbService,
        AllowlistService,
        MfaService,
        CapabilityService,
        PostingService,
        AccountService,
        AuditService,
        PlatformSettingsService,
      ],
    },
  ],
  exports: [AllowlistService, WithdrawalService, ActivityService],
})
export class WalletV1Module {}
