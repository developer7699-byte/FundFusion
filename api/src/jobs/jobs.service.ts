import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';

/** What the scheduler drives. Each one is already idempotent on its own. */
export interface JobTargets {
  scanDeposits(): Promise<void>;
  expireOrders(): Promise<void>;
  sweepDeposits(): Promise<void>;
  /** PRD §13.1. Daily, because it reads every deposit address from the chain. */
  reconcile(): Promise<void>;
}

export interface JobsConfig {
  /**
   * Off for tests, migrations and one-off scripts. A process that only meant
   * to run a migration should not start watching a chain.
   */
  enabled: boolean;
}

interface JobLogger {
  error(message: string): void;
}

/**
 * The clocks (PRD §6.9, §8.2, §8.3).
 *
 * Every job here fails silently when it stops: a watcher that died looks
 * exactly like a chain with no deposits, and an expiry sweep that died looks
 * exactly like a desk with no stale orders. So each run is logged on failure
 * and never allowed to overlap itself — two watchers scanning one range race
 * for the same journal keys, and two sweeps can spend the same gas twice.
 */
@Injectable()
export class JobsService {
  private readonly running = new Set<string>();

  constructor(
    private readonly targets: JobTargets,
    private readonly config: JobsConfig,
    private readonly log: JobLogger = new Logger(JobsService.name),
  ) {}

  /** Finality is 1–2 s, so this is the interval a deposit waits on. */
  @Interval(5_000)
  scanDeposits(): Promise<void> {
    return this.run('deposits', () => this.targets.scanDeposits());
  }

  /** PRD §6.9's windows are minutes; checking every half minute is enough. */
  @Interval(30_000)
  expireOrders(): Promise<void> {
    return this.run('orders', () => this.targets.expireOrders());
  }

  /** Sweeping is housekeeping, not a user-facing clock. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  sweepDeposits(): Promise<void> {
    return this.run('sweeps', () => this.targets.sweepDeposits());
  }

  /**
   * PRD §13.1 and §13.3. Daily rather than often: it reads every deposit
   * address from the chain, and §15 item 7 measures a clean run in days.
   * The report itself logs the drift — this only has to make sure the
   * question gets asked.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  reconcile(): Promise<void> {
    return this.run('reconciliation', () => this.targets.reconcile());
  }

  private async run(name: string, work: () => Promise<void>): Promise<void> {
    if (!this.config.enabled) return;
    if (this.running.has(name)) return;

    this.running.add(name);
    try {
      await work();
    } catch (err) {
      // Never rethrow: an unhandled rejection in a timer takes the process
      // down, and the next tick is the recovery path.
      this.log.error(
        `Scheduled job "${name}" failed: ${(err as Error).message}`,
      );
    } finally {
      this.running.delete(name);
    }
  }
}
