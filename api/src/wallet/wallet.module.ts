import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrototypeLedgerService } from '../prototype/prototype-ledger.service';
import { MockCryptoProvider } from '../providers/mock-crypto.provider';
import { MockRateProvider } from '../providers/mock-rate.provider';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [AuthModule],
  controllers: [WalletController],
  providers: [
    WalletService,
    PrototypeLedgerService,
    MockCryptoProvider,
    MockRateProvider,
  ],
  exports: [WalletService, PrototypeLedgerService, MockRateProvider],
})
export class WalletModule {}
