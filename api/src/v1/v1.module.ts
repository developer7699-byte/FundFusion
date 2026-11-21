import { Module } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { DRIZZLE } from '../ledger/account.service';
import { LedgerModule } from '../ledger/ledger.module';
import { CapabilityModule } from '../capability/capability.module';
import { AuditModule } from '../audit/audit.module';
import { EmailOtpService } from '../auth/v1/email-otp.service';
import { EMAIL_SENDER, LoggingEmailSender } from '../auth/v1/email-sender';
import { MfaService } from '../auth/v1/mfa.service';
import { SessionService } from '../auth/v1/session.service';
import { MoneyGateGuard } from '../auth/v1/money-gate.guard';
import { AdminGuard } from '../auth/v1/admin.guard';
import { StaffGuard } from '../auth/v1/staff.guard';
import { AdminReadService } from './admin-read.service';
import { SettingsModule } from '../settings/settings.module';
import { V1Controller } from './v1.controller';
import { V1Service } from './v1.service';

/**
 * A thin HTTP surface over the v1 services, so M0–M2 can be exercised by hand
 * and end to end. The prototype controllers are untouched.
 */
@Module({
  imports: [LedgerModule, CapabilityModule, AuditModule, SettingsModule],
  controllers: [V1Controller],
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (db: DbService) => db.db,
      inject: [DbService],
    },
    V1Service,
    { provide: EMAIL_SENDER, useClass: LoggingEmailSender },
    EmailOtpService,
    MfaService,
    SessionService,
    MoneyGateGuard,
    AdminGuard,
    StaffGuard,
    AdminReadService,
  ],
})
export class V1Module {}
