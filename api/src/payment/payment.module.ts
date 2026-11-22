import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuditService } from '../audit/audit.service';
import { DbService } from '../db/db.service';
import { DRIZZLE } from '../ledger/account.service';
import { PaymentController } from './payment.controller';
import { PaymentInstructionService } from './payment-instruction.service';
import { PaymentMethodService } from './payment-method.service';

/**
 * Payment methods and the per-order payee instruction (PRD §6.3/§6.4).
 * Reference data, not money — no ledger module here.
 */
@Module({
  imports: [AuditModule],
  controllers: [PaymentController],
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (db: DbService) => db.db,
      inject: [DbService],
    },
    {
      provide: PaymentMethodService,
      useFactory: (db: DbService, audit: AuditService) =>
        new PaymentMethodService(db.db, audit),
      inject: [DbService, AuditService],
    },
    {
      provide: PaymentInstructionService,
      useFactory: (db: DbService) => new PaymentInstructionService(db.db),
      inject: [DbService],
    },
  ],
  exports: [PaymentMethodService, PaymentInstructionService],
})
export class PaymentModule {}
