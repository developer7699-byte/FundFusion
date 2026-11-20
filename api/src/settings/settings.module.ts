import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuditService } from '../audit/audit.service';
import { DbService } from '../db/db.service';
import { PlatformSettingsService } from './platform-settings.service';

/**
 * The commercial parameters (PRD §6, §7). Separate from `ConfigModule`, which
 * holds deployment configuration: these are numbers the business changes
 * during the day, not values a deploy pins.
 */
@Module({
  imports: [AuditModule],
  providers: [
    {
      provide: PlatformSettingsService,
      useFactory: (db: DbService, audit: AuditService) =>
        new PlatformSettingsService(db.db, audit),
      inject: [DbService, AuditService],
    },
  ],
  exports: [PlatformSettingsService],
})
export class SettingsModule {}
