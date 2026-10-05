import { LedgerService } from './ledger.service';
import { PrototypeStore } from '../prototype/prototype.store';

describe('LedgerService', () => {
  it('posts a balanced mock deposit and credits available USDT', () => {
    const store = new PrototypeStore();
    store.ensureAccount('user-1', 'USDT', '10.000000', '0.000000');
    const ledger = new LedgerService(store);
    ledger.post({
      memo: 'test',
      idempotency: 'dep-1',
      entries: [
        { accountType: 'EXTERNAL', direction: 'DEBIT', amount: '2.500000', asset: 'USDT' },
        { accountType: 'AVAILABLE', direction: 'CREDIT', amount: '2.500000', asset: 'USDT', userId: 'user-1' },
      ],
    });
    expect(store.account('user-1', 'USDT').available).toBe('12.500000');
  });

  it('rejects unbalanced books and is idempotent', () => {
    const store = new PrototypeStore();
    store.ensureAccount('user-1', 'USDT', '10.000000', '0.000000');
    const ledger = new LedgerService(store);
    expect(() =>
      ledger.post({
        memo: 'bad',
        idempotency: 'bad-1',
        entries: [
          { accountType: 'AVAILABLE', direction: 'DEBIT', amount: '1.000000', asset: 'USDT', userId: 'user-1' },
        ],
      }),
    ).toThrow();
    ledger.post({
      memo: 'send',
      idempotency: 'send-1',
      entries: [
        { accountType: 'AVAILABLE', direction: 'DEBIT', amount: '1.000000', asset: 'USDT', userId: 'user-1' },
        { accountType: 'EXTERNAL', direction: 'CREDIT', amount: '1.000000', asset: 'USDT' },
      ],
    });
    ledger.post({
      memo: 'send',
      idempotency: 'send-1',
      entries: [
        { accountType: 'AVAILABLE', direction: 'DEBIT', amount: '1.000000', asset: 'USDT', userId: 'user-1' },
        { accountType: 'EXTERNAL', direction: 'CREDIT', amount: '1.000000', asset: 'USDT' },
      ],
    });
    expect(store.account('user-1', 'USDT').available).toBe('9.000000');
  });

  it('will not spend locked funds', () => {
    const store = new PrototypeStore();
    store.ensureAccount('user-1', 'USDT', '5.000000', '75.000000');
    const ledger = new LedgerService(store);
    expect(() =>
      ledger.post({
        memo: 'over',
        idempotency: 'over-1',
        entries: [
          { accountType: 'AVAILABLE', direction: 'DEBIT', amount: '6.000000', asset: 'USDT', userId: 'user-1' },
          { accountType: 'EXTERNAL', direction: 'CREDIT', amount: '6.000000', asset: 'USDT' },
        ],
      }),
    ).toThrow();
    expect(store.account('user-1', 'USDT').locked).toBe('75.000000');
  });
});
