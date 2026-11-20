import { Module } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { DRIZZLE } from '../ledger/account.service';
import { RateModule } from '../rates/rate.module';
import { RateService } from '../rates/rate.service';
import { AccountService } from '../ledger/account.service';
import { LedgerModule } from '../ledger/ledger.module';
import { PostingService } from '../ledger/posting.service';
import { OrderService } from './order.service';
import { QuoteService } from './quote.service';

/**
 * The P2P engine (PRD §6). Quotes first: everything downstream settles
 * against the snapshot a quote wrote, never against a current rate.
 */
@Module({
  imports: [RateModule, LedgerModule],
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
  ],
  exports: [QuoteService, OrderService],
})
export class P2pModule {}
