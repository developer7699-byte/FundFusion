import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';

@Injectable()
export class MockCryptoProvider {
  generateAddress(network: string, userId: string) {
    const slug = createHash('sha256').update(`${userId}:${network}:${randomUUID()}`).digest('hex').slice(0, 20);
    return `NXMOCK_${network}_${slug}`;
  }

  mockTxHash() {
    return `0xmock${randomUUID().replaceAll('-', '').slice(0, 24)}`;
  }

  networkFee(network: string) {
    if (network === 'ETH') return '1.200000';
    return '0.800000';
  }

  requiredConfirmations() {
    return 3;
  }
}
