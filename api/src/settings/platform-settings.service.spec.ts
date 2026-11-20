import { AuditService } from '../audit/audit.service';
import { makeTestDb, seedUser, type TestDb } from '../ledger/test-db';
import { PLATFORM_SETTINGS } from './platform-settings';
import { PlatformSettingsService } from './platform-settings.service';

let t: TestDb;
let settings: PlatformSettingsService;
let adminId: string;

beforeAll(() => {
  t = makeTestDb();
}, 30000);

beforeEach(async () => {
  await t.reset();
  adminId = await seedUser(t.pool, 'admin@example.test');
  settings = new PlatformSettingsService(t.db, new AuditService(t.db));
});

afterAll(async () => {
  await t.close();
});

function change(reason = 'board approved the new markup') {
  return { actorId: adminId, reason };
}

describe('reading', () => {
  it('falls back to the documented default', async () => {
    expect(await settings.integer('rate.markupBps')).toBe(300);
  });

  it('returns what an admin set', async () => {
    await settings.set('rate.markupBps', 250, change());

    expect(await settings.integer('rate.markupBps')).toBe(250);
  });

  it('a change takes effect without a restart', async () => {
    await settings.integer('quote.ttlSeconds');
    await settings.set('quote.ttlSeconds', 120, change('longer window'));

    expect(await settings.integer('quote.ttlSeconds')).toBe(120);
  });

  it('money settings cross the boundary as strings', async () => {
    await settings.set('order.maxUsdt', '2500.5', change('raised the cap'));

    const max = await settings.money('order.maxUsdt');
    expect(max).toBe('2500.500000000000000000');
    expect(typeof max).toBe('string');
  });

  it('lists every setting with its value and bounds', async () => {
    const all = await settings.all();

    expect(all['eligibility.bufferBps']).toEqual(
      expect.objectContaining({ value: 1000, min: 500, max: 1000 }),
    );
    expect(Object.keys(all).length).toBeGreaterThan(10);
  });
});

/**
 * PRD §7 already refuses an admin's typed rate that moves too far, on the
 * grounds that a typed input is no more trustworthy than a bad feed tick. The
 * same holds for every number here.
 */
describe('bounds', () => {
  it('refuses a value above the maximum', async () => {
    await expect(
      settings.set('rate.markupBps', 9000, change()),
    ).rejects.toThrow(/between 0 and 2000/i);
  });

  it('refuses a value below the minimum', async () => {
    // PRD §6.5 fixes the collateral buffer between 5% and 10%.
    await expect(
      settings.set('eligibility.bufferBps', 0, change()),
    ).rejects.toThrow(/between 500 and 1000/i);
  });

  it('refuses a non-integer where an integer is required', async () => {
    await expect(
      settings.set('quote.ttlSeconds', 90.5, change()),
    ).rejects.toThrow(/whole number/i);
  });

  it('refuses a money value with more precision than the column holds', async () => {
    await expect(
      settings.set('order.minUsdt', '1.0000000000000000001', change()),
    ).rejects.toThrow();
  });

  it('refuses an unknown key', async () => {
    await expect(
      settings.set('rate.secretSauce' as never, 1, change()),
    ).rejects.toThrow(/unknown setting/i);
  });

  it('leaves the stored value untouched when a change is refused', async () => {
    await settings.set('rate.markupBps', 250, change());

    await expect(
      settings.set('rate.markupBps', 9000, change()),
    ).rejects.toThrow();

    expect(await settings.integer('rate.markupBps')).toBe(250);
  });
});

/**
 * PRD §6.9 gives a quote 90 s and the merchant search 120 s. The order of
 * those two is load-bearing: if a quote could expire before its own search
 * window closed, an order would sit broadcast at a price nobody is allowed to
 * honour. Two independently editable numbers can be typed into that gap, so
 * the relationship is enforced rather than documented.
 */
describe('numbers that must agree with each other', () => {
  it('refuses a search window shorter than the quote TTL', async () => {
    await expect(
      settings.set('order.searchWindowSeconds', 30, change('faster matching')),
    ).rejects.toThrow(/quote ttl|90/i);
  });

  it('refuses a quote TTL longer than the search window', async () => {
    await expect(
      settings.set('quote.ttlSeconds', 300, change('longer to decide')),
    ).rejects.toThrow(/search window|120/i);
  });

  it('allows a consistent pair', async () => {
    await settings.set('order.searchWindowSeconds', 300, change('slower desk'));
    await settings.set('quote.ttlSeconds', 240, change('longer to decide'));

    expect(await settings.integer('quote.ttlSeconds')).toBe(240);
  });
});

/** PRD §9.4: every privileged action carries an actor and a reason. */
describe('accountability', () => {
  it('records who changed what, and why', async () => {
    await settings.set('rate.markupBps', 250, change('margin review Q4'));

    const r = await t.pool.query(
      `SELECT actor_id, action, entity_id, reason, old_value, new_value
         FROM audit_log ORDER BY created_at DESC LIMIT 1`,
    );
    const row = r.rows[0] as {
      actor_id: string;
      action: string;
      entity_id: string;
      reason: string;
      old_value: unknown;
      new_value: unknown;
    };

    expect(row.actor_id).toBe(adminId);
    expect(row.action).toBe('SETTING_CHANGE');
    expect(row.entity_id).toBe('rate.markupBps');
    expect(row.reason).toBe('margin review Q4');
    expect(row.old_value).toEqual({ value: 300 });
    expect(row.new_value).toEqual({ value: 250 });
  });

  it('refuses a change with no reason', async () => {
    await expect(
      settings.set('rate.markupBps', 250, { actorId: adminId, reason: '  ' }),
    ).rejects.toThrow(/reason/i);
  });

  it('records the previous value as it was, not as a default', async () => {
    await settings.set('rate.markupBps', 250, change('first'));
    await settings.set('rate.markupBps', 275, change('second'));

    const r = await t.pool.query(
      `SELECT old_value FROM audit_log ORDER BY created_at DESC LIMIT 1`,
    );
    expect((r.rows[0] as { old_value: unknown }).old_value).toEqual({
      value: 250,
    });
  });
});

/**
 * Secrets are not settings. A custody seed an admin screen can read is a seed
 * that leaks with an admin account.
 */
describe('what this registry refuses to hold', () => {
  it('has no key for a custody seed, signer or provider credential', () => {
    const keys = Object.keys(PLATFORM_SETTINGS);
    const secrets = keys.filter((k) =>
      /seed|mnemonic|key|secret|credential|password|token/i.test(k),
    );
    expect(secrets).toEqual([]);
  });
});
