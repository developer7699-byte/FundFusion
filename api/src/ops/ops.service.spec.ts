import { Test } from '@nestjs/testing';
import { LedgerService } from '../ledger/ledger.service';
import { PrototypeStore } from '../prototype/prototype.store';
import { MockRateProvider } from '../providers/mock-rate.provider';
import { OpsService } from './ops.service';

describe('OpsService escrow', () => {
  it('locks, merchant completes, and moves USDT off customer lock', async () => {
    const store = new PrototypeStore();
    store.ensureAccount('c1', 'USDT', '100.000000', '0');
    store.ensureAccount('user-merchant', 'USDT', '0', '0');
    const ops = new OpsService(store, new LedgerService(store), new MockRateProvider());
    const order = ops.createOrder('c1', { kind: 'SELL', usdtAmount: '10' });
    expect(store.account('c1', 'USDT').available).toBe('90.000000');
    expect(store.account('c1', 'USDT').locked).toBe('10.000000');
    ops.accept('user-merchant', order.id);
    ops.submitUtr('user-merchant', order.id, 'MOCKUTR123');
    ops.complete('user-merchant', order.id, 'MERCHANT');
    expect(store.account('c1', 'USDT').locked).toBe('0.000000');
    expect(store.account('user-merchant', 'USDT').available).toBe('10.000000');
  });
});
