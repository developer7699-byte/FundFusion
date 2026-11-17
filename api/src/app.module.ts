import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { platformConfig } from './config/platform.config';
import { DbModule } from './db/db.module';
import { LedgerModule } from './ledger/ledger.module';
import { CapabilityModule } from './capability/capability.module';
import { AuditModule } from './audit/audit.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { PrototypeModule } from './prototype/prototype.module';
import { WalletModule } from './wallet/wallet.module';
import { OpsModule } from './ops/ops.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [platformConfig] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    DbModule,
    LedgerModule,
    CapabilityModule,
    AuditModule,
    PrototypeModule,
    AuthModule,
    WalletModule,
    OpsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
