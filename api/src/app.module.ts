import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { PrototypeModule } from './prototype/prototype.module';
import { WalletModule } from './wallet/wallet.module';
import { OpsModule } from './ops/ops.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrototypeModule,
    PrismaModule,
    AuthModule,
    WalletModule,
    OpsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
