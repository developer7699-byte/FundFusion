import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MockRateProvider } from '../providers/mock-rate.provider';
import { CustomerController } from './customer.controller';

@Module({
  imports: [AuthModule],
  controllers: [CustomerController],
  providers: [MockRateProvider],
})
export class CustomerModule {}
