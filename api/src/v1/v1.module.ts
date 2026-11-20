import { Module } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { DRIZZLE } from '../ledger/account.service';
import { LedgerModule } from '../ledger/ledger.module';
import { CapabilityModule } from '../capability/capability.module';
import { AuditModule } from '../audit/audit.module';
import { OtpService } from '../auth/v1/otp.service';
import { SessionService } from '../auth/v1/session.service';
import { PhoneGateGuard } from '../auth/v1/phone-gate.guard';
import { V1Controller } from './v1.controller';
import { V1Service } from './v1.service';

/**
 * A thin HTTP surface over the v1 services, so M0–M2 can be exercised by hand
 * and end to end. The prototype controllers are untouched.
 */
@Module({
  imports: [LedgerModule, CapabilityModule, AuditModule],
  controllers: [V1Controller],
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (db: DbService) => db.db,
      inject: [DbService],
    },
    V1Service,
    OtpService,
    SessionService,
    PhoneGateGuard,
  ],
})
export class V1Module {}
