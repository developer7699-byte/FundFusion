import { Module } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { DRIZZLE } from '../ledger/account.service';
import { CapabilityService } from './capability.service';

@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (db: DbService) => db.db,
      inject: [DbService],
    },
    CapabilityService,
  ],
  exports: [CapabilityService],
})
export class CapabilityModule {}
