import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuditService } from '../audit/audit.service';
import { DbService } from '../db/db.service';
import { AccountService, DRIZZLE } from '../ledger/account.service';
import { LedgerModule } from '../ledger/ledger.module';
import { PostingService } from '../ledger/posting.service';
import { EligibilityService } from '../p2p/eligibility.service';
import { P2pModule } from '../p2p/p2p.module';
import { QuoteService } from '../p2p/quote.service';
import { PlatformSettingsService } from '../settings/platform-settings.service';
import { SettingsModule } from '../settings/settings.module';
import { DefaultTrackerService } from './default-tracker.service';
import { DisputeController } from './dispute.controller';
import { DisputeService } from './dispute.service';
import { ResolutionService } from './resolution.service';

/**
 * Disputes (PRD §6.10). Built with factories because both services take a
 * `SettingsReader` — an interface, so a unit test can supply the two numbers
 * it cares about without a database. Nest cannot inject an interface, so the
 * wiring names the implementation here, once.
 */
@Module({
  imports: [LedgerModule, AuditModule, SettingsModule, P2pModule],
  controllers: [DisputeController],
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (db: DbService) => db.db,
      inject: [DbService],
    },
    {
      provide: DisputeService,
      useFactory: (db: DbService, audit: AuditService) =>
        new DisputeService(db.db, audit),
      inject: [DbService, AuditService],
    },
    {
      provide: DefaultTrackerService,
      useFactory: (
        db: DbService,
        audit: AuditService,
        settings: PlatformSettingsService,
      ) => new DefaultTrackerService(db.db, audit, settings),
      inject: [DbService, AuditService, PlatformSettingsService],
    },
    {
      provide: ResolutionService,
      useFactory: (
        db: DbService,
        quotes: QuoteService,
        eligibility: EligibilityService,
        posting: PostingService,
        accounts: AccountService,
        audit: AuditService,
        settings: PlatformSettingsService,
        defaults: DefaultTrackerService,
      ) =>
        new ResolutionService(
          db.db,
          quotes,
          eligibility,
          posting,
          accounts,
          audit,
          settings,
          defaults,
        ),
      inject: [
        DbService,
        QuoteService,
        EligibilityService,
        PostingService,
        AccountService,
        AuditService,
        PlatformSettingsService,
        DefaultTrackerService,
      ],
    },
  ],
  exports: [DisputeService, ResolutionService, DefaultTrackerService],
})
export class DisputesModule {}
