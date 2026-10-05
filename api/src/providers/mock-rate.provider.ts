import { Injectable } from '@nestjs/common';

@Injectable()
export class MockRateProvider {
  usdtInr(): string {
    return '84.250000000000000000';
  }
}
