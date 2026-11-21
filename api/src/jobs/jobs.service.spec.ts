import { JobsService, type JobTargets } from './jobs.service';

function targets(over: Partial<JobTargets> = {}): JobTargets & {
  calls: Record<string, number>;
} {
  const calls = { deposits: 0, orders: 0, sweeps: 0, reconcile: 0 };
  return {
    calls,
    scanDeposits: () => {
      calls.deposits++;
      return Promise.resolve();
    },
    expireOrders: () => {
      calls.orders++;
      return Promise.resolve();
    },
    sweepDeposits: () => {
      calls.sweeps++;
      return Promise.resolve();
    },
    reconcile: () => {
      calls.reconcile++;
      return Promise.resolve();
    },
    ...over,
  };
}

/**
 * PRD §6.9 and §8.2 describe several clocks. None of them run unless
 * something calls them — and both failure modes here are silent: a watcher
 * that stopped looks exactly like a chain with no deposits, and an expiry
 * sweep that stopped looks exactly like a desk with no stale orders.
 */
describe('scheduled work', () => {
  it('runs the deposit watcher', async () => {
    const t = targets();
    const jobs = new JobsService(t, { enabled: true });

    await jobs.scanDeposits();

    expect(t.calls.deposits).toBe(1);
  });

  it('runs the order timeout sweep', async () => {
    const t = targets();
    const jobs = new JobsService(t, { enabled: true });

    await jobs.expireOrders();

    expect(t.calls.orders).toBe(1);
  });

  it('runs the deposit sweep', async () => {
    const t = targets();
    const jobs = new JobsService(t, { enabled: true });

    await jobs.sweepDeposits();

    expect(t.calls.sweeps).toBe(1);
  });

  /**
   * A scan that outlives its interval must not have a second copy started on
   * top of it: two watchers scanning the same range race each other for the
   * same journal keys, and two sweeps can fund and spend the same gas twice.
   */
  it('does not start a second run while one is still going', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let started = 0;
    const jobs = new JobsService(
      targets({
        scanDeposits: () => {
          started++;
          return gate;
        },
      }),
      { enabled: true },
    );

    const first = jobs.scanDeposits();
    await jobs.scanDeposits();
    release();
    await first;

    expect(started).toBe(1);
  });

  it('runs again after a run finishes', async () => {
    const t = targets();
    const jobs = new JobsService(t, { enabled: true });

    await jobs.scanDeposits();
    await jobs.scanDeposits();

    expect(t.calls.deposits).toBe(2);
  });

  it('a failing run does not stop the next one', async () => {
    let attempts = 0;
    const jobs = new JobsService(
      targets({
        scanDeposits: () => {
          attempts++;
          return attempts === 1
            ? Promise.reject(new Error('rpc went away'))
            : Promise.resolve();
        },
      }),
      { enabled: true },
    );

    await jobs.scanDeposits();
    await jobs.scanDeposits();

    expect(attempts).toBe(2);
  });

  it('swallows nothing silently — a failure is logged', async () => {
    const logged: string[] = [];
    const jobs = new JobsService(
      targets({
        scanDeposits: () => Promise.reject(new Error('rpc went away')),
      }),
      { enabled: true },
      { error: (message: string) => logged.push(message) },
    );

    await jobs.scanDeposits();

    expect(logged.join(' ')).toMatch(/rpc went away/);
  });

  /** A migration runner or a one-off script must not start watching chains. */
  it('does nothing when scheduling is disabled', async () => {
    const t = targets();
    const jobs = new JobsService(t, { enabled: false });

    await jobs.scanDeposits();
    await jobs.expireOrders();
    await jobs.sweepDeposits();
    await jobs.reconcile();

    expect(t.calls).toEqual({
      deposits: 0,
      orders: 0,
      sweeps: 0,
      reconcile: 0,
    });
  });
});

/**
 * PRD §13.1. The one check whose two sides are produced by independent
 * systems, and PRD §13.3 names drift as an alert — so the failure that
 * matters here is a run that found drift and said nothing, which is
 * indistinguishable from a clean run.
 */
describe('reconciliation', () => {
  it('runs on its schedule', async () => {
    const t = targets();
    const jobs = new JobsService(t, { enabled: true });

    await jobs.reconcile();

    expect(t.calls.reconcile).toBe(1);
  });

  it('does nothing when jobs are disabled', async () => {
    const t = targets();
    const jobs = new JobsService(t, { enabled: false });

    await jobs.reconcile();

    expect(t.calls.reconcile).toBe(0);
  });

  it('logs rather than throwing when reconciliation fails', async () => {
    const errors: string[] = [];
    const jobs = new JobsService(
      targets({
        reconcile: () => Promise.reject(new Error('rpc went away')),
      }),
      { enabled: true },
      { error: (m) => errors.push(m) },
    );

    await expect(jobs.reconcile()).resolves.toBeUndefined();
    expect(errors.join()).toMatch(/reconcil/i);
  });

  it('does not overlap itself', async () => {
    let running = 0;
    let concurrent = 0;
    const jobs = new JobsService(
      targets({
        reconcile: async () => {
          running++;
          concurrent = Math.max(concurrent, running);
          await new Promise((r) => setTimeout(r, 20));
          running--;
        },
      }),
      { enabled: true },
    );

    await Promise.all([jobs.reconcile(), jobs.reconcile()]);

    expect(concurrent).toBe(1);
  });
});
