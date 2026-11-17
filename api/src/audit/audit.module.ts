import { Module } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { DRIZZLE } from '../ledger/account.service';
import { AuditService } from './audit.service';

@Module({
  providers: [
    { provide: DRIZZLE, useFactory: (db: DbService) => db.db, inject: [DbService] },
    AuditService,
  ],
  exports: [AuditService],
})
export class AuditModule {}
