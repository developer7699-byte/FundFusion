import { CapabilityService } from '../capability/capability.service';
import { makeTestDb, seedUser, type TestDb } from '../ledger/test-db';
import { MerchantService } from './merchant.service';

let t: TestDb;
let merchants: MerchantService;
let userId: string;

beforeAll(() => {
  t = makeTestDb();
}, 30000);

beforeEach(async () => {
  await t.reset();
  merchants = new MerchantService(t.db, new CapabilityService(t.db));
  userId = await seedUser(t.pool, 'desk@example.test');
});

afterAll(async () => {
  await t.close();
});

describe('opening a merchant desk (PRD §6.5, §9.3)', () => {
  it('opens a desk and grants both P2P capabilities', async () => {
    const profile = await merchants.open(userId, 'Bandra Desk');

    expect(profile.deskName).toBe('Bandra Desk');
    expect(profile.status).toBe('ACTIVE');
    const granted = await new CapabilityService(t.db).effective(userId);
    expect(granted.has('P2P_BUY')).toBe(true);
    expect(granted.has('P2P_SELL')).toBe(true);
  });

  it('refuses a second desk for the same user', async () => {
    await merchants.open(userId, 'Bandra Desk');

    await expect(merchants.open(userId, 'Andheri Desk')).rejects.toThrow(
      /already/i,
    );
  });
});
