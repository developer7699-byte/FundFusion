import { AuditService } from './audit.service';
import { makeTestDb, seedUser, type TestDb } from '../ledger/test-db';

let t: TestDb;
let audit: AuditService;
let actorId: string;

beforeAll(() => {
  t = makeTestDb();
  audit = new AuditService(t.db);
}, 30000);

beforeEach(async () => {
  // DELETE is blocked by the append-only trigger, which is the point. TRUNCATE
  // is a statement-level operation that row-level triggers do not see — the
  // documented boundary of this protection, and the only way to reset here.
  await t.reset();
  actorId = await seedUser(t.pool, 'admin@example.test');
});

afterAll(async () => {
  await t.close();
});

function action(over: Partial<{ reason: string }> = {}) {
  return {
    actorId,
    action: 'ORDER_REFUND',
    entity: 'p2p_order',
    entityId: 'order-1',
    reason: 'customer never received the rupees',
    ipAddress: '127.0.0.1',
    ...over,
  };
}

describe('AuditService (PRD §9.4)', () => {
  it('records a privileged action with its reason', async () => {
    const id = await audit.record(action());
    const r = await t.pool.query(
      `SELECT reason, action FROM audit_log WHERE id = $1`,
      [id],
    );
    expect((r.rows[0] as { reason: string }).reason).toBe(
      'customer never received the rupees',
    );
  });

  // An audit row that explains nothing is worse than none: it looks like
  // oversight while providing none.
  it('refuses to record without a reason', async () => {
    await expect(audit.record(action({ reason: '' }))).rejects.toThrow(
      /reason/i,
    );
  });

  it('refuses a whitespace-only reason', async () => {
    await expect(audit.record(action({ reason: '   ' }))).rejects.toThrow(
      /reason/i,
    );
  });

  it('writes nothing when the reason is refused', async () => {
    await audit.record(action({ reason: '' })).catch(() => undefined);
    const r = await t.pool.query(`SELECT count(*)::int AS n FROM audit_log`);
    expect((r.rows[0] as { n: number }).n).toBe(0);
  });
});

// Append-only enforced by the DATABASE, not by discipline. A rule only the
// application enforces is a rule any psql session or migration can bypass.
describe('append-only (PRD §9.4)', () => {
  it('an audit row cannot be updated', async () => {
    const id = await audit.record(action());
    await expect(
      t.pool.query(`UPDATE audit_log SET reason = 'rewritten' WHERE id = $1`, [
        id,
      ]),
    ).rejects.toThrow(/append-only/i);
  });

  it('an audit row cannot be deleted', async () => {
    const id = await audit.record(action());
    await expect(
      t.pool.query(`DELETE FROM audit_log WHERE id = $1`, [id]),
    ).rejects.toThrow(/append-only/i);
  });

  it('inserting still works', async () => {
    await expect(audit.record(action())).resolves.toBeDefined();
  });
});

describe('the boundary of append-only', () => {
  // Stated rather than hidden: a row-level trigger does not fire on TRUNCATE,
  // so a superuser can still clear the table. The trigger defends against
  // application-level tampering, which is the threat it exists for.
  it('TRUNCATE is not blocked by a row-level trigger', async () => {
    await audit.record({
      actorId,
      action: 'X',
      entity: 'y',
      entityId: 'z',
      reason: 'boundary check',
    });
    await expect(
      t.pool.query(`TRUNCATE audit_log CASCADE`),
    ).resolves.toBeDefined();
  });
});
