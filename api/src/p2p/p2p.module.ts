import { Module } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { DRIZZLE } from '../ledger/account.service';
import { RateModule } from '../rates/rate.module';
import { SettingsModule } from '../settings/settings.module';
import { PlatformSettingsService } from '../settings/platform-settings.service';
import { RateService } from '../rates/rate.service';
import { AccountService } from '../ledger/account.service';
import { LedgerModule } from '../ledger/ledger.module';
import { PostingService } from '../ledger/posting.service';
import { BalanceService } from '../ledger/balance.service';
import { CapabilityModule } from '../capability/capability.module';
import { CapabilityService } from '../capability/capability.service';
import { AbandonmentService } from './abandonment.service';
import { AssignmentService } from './assignment.service';
import { EligibilityService } from './eligibility.service';
import { OrderService } from './order.service';
import { QuoteService } from './quote.service';
import { SettlementService } from './settlement.service';
import { TimeoutService } from './timeout.service';

/**
 * The P2P engine (PRD §6). Quotes first: everything downstream settles
 * against the snapshot a quote wrote, never against a current rate.
 */
@Module({
  imports: [RateModule, LedgerModule, CapabilityModule, SettingsModule],
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (db: DbService) => db.db,
      inject: [DbService],
    },
    {
      provide: QuoteService,
      useFactory: (
        db: DbService,
        rates: RateService,
        settings: PlatformSettingsService,
      ) => new QuoteService(db.db, rates, settings),
      inject: [DbService, RateService, PlatformSettingsService],
    },
    {
      provide: AbandonmentService,
      useFactory: (db: DbService, settings: PlatformSettingsService) =>
        new AbandonmentService(db.db, settings),
      inject: [DbService, PlatformSettingsService],
    },
    {
      provide: OrderService,
      useFactory: (
        db: DbService,
        quotes: QuoteService,
        posting: PostingService,
        accounts: AccountService,
        abandonment: AbandonmentService,
      ) => new OrderService(db.db, quotes, posting, accounts, abandonment),
      inject: [
        DbService,
        QuoteService,
        PostingService,
        AccountService,
        AbandonmentService,
      ],
    },
    {
      provide: EligibilityService,
      useFactory: (
        db: DbService,
        quotes: QuoteService,
        balances: BalanceService,
        capabilities: CapabilityService,
        accounts: AccountService,
      ) =>
        new EligibilityService(db.db, quotes, balances, capabilities, accounts),
      inject: [
        DbService,
        QuoteService,
        BalanceService,
        CapabilityService,
        AccountService,
      ],
    },
    {
      provide: AssignmentService,
      useFactory: (
        db: DbService,
        quotes: QuoteService,
        eligibility: EligibilityService,
        posting: PostingService,
        accounts: AccountService,
      ) => new AssignmentService(db.db, quotes, eligibility, posting, accounts),
      inject: [
        DbService,
        QuoteService,
        EligibilityService,
        PostingService,
        AccountService,
      ],
    },
    {
      provide: SettlementService,
      useFactory: (
        db: DbService,
        quotes: QuoteService,
        eligibility: EligibilityService,
        posting: PostingService,
        accounts: AccountService,
      ) => new SettlementService(db.db, quotes, eligibility, posting, accounts),
      inject: [
        DbService,
        QuoteService,
        EligibilityService,
        PostingService,
        AccountService,
      ],
    },
    {
      provide: TimeoutService,
      useFactory: (
        db: DbService,
        posting: PostingService,
        accounts: AccountService,
        settings: PlatformSettingsService,
      ) => new TimeoutService(db.db, posting, accounts, settings),
      inject: [
        DbService,
        PostingService,
        AccountService,
        PlatformSettingsService,
      ],
    },
  ],
  exports: [
    AbandonmentService,
    TimeoutService,
    QuoteService,
    OrderService,
    EligibilityService,
    AssignmentService,
    SettlementService,
  ],
})
export class P2pModule {}
