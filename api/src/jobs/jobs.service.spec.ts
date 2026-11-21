import { JobsService, type JobTargets } from './jobs.service';

function targets(over: Partial<JobTargets> = {}): JobTargets & {
  calls: Record<string, number>;
} {
  const calls = { deposits: 0, orders: 0, sweeps: 0 };
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

    expect(t.calls).toEqual({ deposits: 0, orders: 0, sweeps: 0 });
  });
});
