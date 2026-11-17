import { CapabilityService } from './capability.service';
import { makeTestDb, seedUser, type TestDb } from '../ledger/test-db';

let t: TestDb;
let capabilities: CapabilityService;
let customerId: string;
let actorId: string;

const past = () => new Date(Date.now() - 60_000);
const future = () => new Date(Date.now() + 3_600_000);

function meta(over: Partial<{ expiresAt: Date | null }> = {}) {
  return { actorId, reason: 'risk hold for testing', ...over };
}

beforeAll(() => {
  t = makeTestDb();
  capabilities = new CapabilityService(t.db);
}, 30000);

beforeEach(async () => {
  await t.reset();
  customerId = await seedUser(t.pool, 'cap-customer@example.test');
  actorId = await seedUser(t.pool, 'cap-admin@example.test');
  await t.pool.query(
    `INSERT INTO role (name) VALUES ('CUSTOMER') ON CONFLICT DO NOTHING`,
  );
  const role = await t.pool.query(
    `SELECT id FROM role WHERE name = 'CUSTOMER'`,
  );
  await t.pool.query(
    `INSERT INTO user_role (user_id, role_id) VALUES ($1, $2)`,
    [customerId, (role.rows[0] as { id: string }).id],
  );
  for (const cap of ['DEPOSIT', 'WITHDRAW', 'SEND', 'P2P_BUY']) {
    await t.pool.query(
      `INSERT INTO role_capability (role, capability) VALUES ('CUSTOMER', $1) ON CONFLICT DO NOTHING`,
      [cap],
    );
  }
});

afterAll(async () => {
  await t.close();
});

describe('capability resolution (PRD §9.3)', () => {
  it('a role grant is effective', async () => {
    expect(await capabilities.can(customerId, 'DEPOSIT')).toBe(true);
  });

  it('a capability the role lacks is not effective', async () => {
    expect(await capabilities.can(customerId, 'P2P_SELL')).toBe(false);
  });

  it('a user grant adds a capability the role lacks', async () => {
    await capabilities.grant(customerId, 'P2P_SELL', meta());
    expect(await capabilities.can(customerId, 'P2P_SELL')).toBe(true);
  });

  it('a user deny beats a role grant', async () => {
    await capabilities.deny(customerId, 'DEPOSIT', meta());
    expect(await capabilities.can(customerId, 'DEPOSIT')).toBe(false);
  });

  it('a deny written after a grant wins', async () => {
    await capabilities.grant(customerId, 'P2P_SELL', meta());
    await capabilities.deny(customerId, 'P2P_SELL', meta());
    expect(await capabilities.can(customerId, 'P2P_SELL')).toBe(false);
  });

  // The discriminating case. A support agent granting an exception must not
  // silently lift a risk hold, however recently the grant was written.
  it('a grant written AFTER a deny still loses', async () => {
    await capabilities.deny(customerId, 'P2P_SELL', meta());
    await capabilities.grant(customerId, 'P2P_SELL', meta());
    expect(await capabilities.can(customerId, 'P2P_SELL')).toBe(false);
  });

  it('a deny and a grant coexist as separate rows', async () => {
    await capabilities.deny(customerId, 'DEPOSIT', meta());
    await capabilities.grant(customerId, 'DEPOSIT', meta());
    const r = await t.pool.query(
      `SELECT effect FROM user_capability WHERE user_id = $1 AND capability = 'DEPOSIT'`,
      [customerId],
    );
    expect(r.rows).toHaveLength(2);
    expect(await capabilities.can(customerId, 'DEPOSIT')).toBe(false);
  });

  it('effective() returns the whole set', async () => {
    expect([...(await capabilities.effective(customerId))].sort()).toEqual([
      'DEPOSIT',
      'P2P_BUY',
      'SEND',
      'WITHDRAW',
    ]);
  });
});

// An inverted expiry comparison passes every simple case and fails exactly here.
describe('expiry (PRD §9.3)', () => {
  it('an expired deny stops being enforced', async () => {
    await capabilities.deny(customerId, 'DEPOSIT', meta({ expiresAt: past() }));
    expect(await capabilities.can(customerId, 'DEPOSIT')).toBe(true);
  });

  it('a live deny is still enforced', async () => {
    await capabilities.deny(
      customerId,
      'DEPOSIT',
      meta({ expiresAt: future() }),
    );
    expect(await capabilities.can(customerId, 'DEPOSIT')).toBe(false);
  });

  it('a deny with no expiry never lapses', async () => {
    await capabilities.deny(customerId, 'DEPOSIT', meta({ expiresAt: null }));
    expect(await capabilities.can(customerId, 'DEPOSIT')).toBe(false);
  });

  it('an expired grant stops being effective', async () => {
    await capabilities.grant(
      customerId,
      'P2P_SELL',
      meta({ expiresAt: past() }),
    );
    expect(await capabilities.can(customerId, 'P2P_SELL')).toBe(false);
  });
});

describe('override hygiene (PRD §9.3)', () => {
  it('an override without a reason is refused', async () => {
    await expect(
      capabilities.deny(customerId, 'DEPOSIT', { actorId, reason: '' }),
    ).rejects.toThrow(/reason/i);
  });

  it('a whitespace-only reason is refused', async () => {
    await expect(
      capabilities.deny(customerId, 'DEPOSIT', { actorId, reason: '   ' }),
    ).rejects.toThrow(/reason/i);
  });

  it('the override records its actor and reason', async () => {
    await capabilities.deny(customerId, 'DEPOSIT', meta());
    const r = await t.pool.query(
      `SELECT actor_id, reason FROM user_capability WHERE user_id = $1`,
      [customerId],
    );
    expect((r.rows[0] as { actor_id: string }).actor_id).toBe(actorId);
    expect((r.rows[0] as { reason: string }).reason).toBe(
      'risk hold for testing',
    );
  });
});
