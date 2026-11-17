import { Module } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AccountService, DRIZZLE } from './account.service';
import { BalanceService } from './balance.service';
import { PostingService } from './posting.service';

/**
 * The v1 ledger (PRD §5). Separate from the prototype's in-memory
 * LedgerService, which `wallet.service` and `ops.service` still depend on
 * until a later milestone retires those surfaces.
 */
@Module({
  providers: [
    { provide: DRIZZLE, useFactory: (db: DbService) => db.db, inject: [DbService] },
    AccountService,
    BalanceService,
    PostingService,
  ],
  exports: [AccountService, BalanceService, PostingService],
})
export class LedgerModule {}
