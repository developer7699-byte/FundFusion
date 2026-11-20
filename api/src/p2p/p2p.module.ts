import { Module } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { DRIZZLE } from '../ledger/account.service';
import { RateModule } from '../rates/rate.module';
import { RateService } from '../rates/rate.service';
import { AccountService } from '../ledger/account.service';
import { LedgerModule } from '../ledger/ledger.module';
import { PostingService } from '../ledger/posting.service';
import { BalanceService } from '../ledger/balance.service';
import { CapabilityModule } from '../capability/capability.module';
import { CapabilityService } from '../capability/capability.service';
import { AssignmentService } from './assignment.service';
import { EligibilityService } from './eligibility.service';
import { OrderService } from './order.service';
import { QuoteService } from './quote.service';
import { SettlementService } from './settlement.service';

/**
 * The P2P engine (PRD §6). Quotes first: everything downstream settles
 * against the snapshot a quote wrote, never against a current rate.
 */
@Module({
  imports: [RateModule, LedgerModule, CapabilityModule],
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (db: DbService) => db.db,
      inject: [DbService],
    },
    {
      provide: QuoteService,
      useFactory: (db: DbService, rates: RateService) =>
        new QuoteService(db.db, rates),
      inject: [DbService, RateService],
    },
    {
      provide: OrderService,
      useFactory: (
        db: DbService,
        quotes: QuoteService,
        posting: PostingService,
        accounts: AccountService,
      ) => new OrderService(db.db, quotes, posting, accounts),
      inject: [DbService, QuoteService, PostingService, AccountService],
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
  ],
  exports: [
    QuoteService,
    OrderService,
    EligibilityService,
    AssignmentService,
    SettlementService,
  ],
})
export class P2pModule {}
