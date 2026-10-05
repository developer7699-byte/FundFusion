import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LedgerService } from '../ledger/ledger.service';
import { MockCryptoProvider } from '../providers/mock-crypto.provider';
import { MockRateProvider } from '../providers/mock-rate.provider';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [AuthModule],
  controllers: [WalletController],
  providers: [WalletService, LedgerService, MockCryptoProvider, MockRateProvider],
  exports: [WalletService, LedgerService, MockRateProvider],
})
export class WalletModule {}
