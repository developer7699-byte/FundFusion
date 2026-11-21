import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import {
  CHAIN_SERVICES,
  ChainModule,
  type ChainServices,
} from '../chain/chain.module';
import { P2pModule } from '../p2p/p2p.module';
import { TimeoutService } from '../p2p/timeout.service';
import { JobsService, type JobTargets } from './jobs.service';

/**
 * Nothing in §6.9 or §8.2 happens unless something calls it. This is that
 * something — and it is deliberately the only place that knows how often.
 */
@Module({
  imports: [ScheduleModule.forRoot(), ChainModule.register(), P2pModule],
  providers: [
    {
      provide: JobsService,
      useFactory: (chain: ChainServices | null, timeouts: TimeoutService) => {
        const targets: JobTargets = {
          // The order clocks need no chain, and they are the ones that
          // return escrowed funds — they run wherever the API runs.
          expireOrders: async () => {
            await timeouts.sweep();
          },
          scanDeposits: async () => {
            if (chain?.watcher) await chain.watcher.scanOnce();
          },
          sweepDeposits: async () => {
            if (chain?.sweeps) await chain.sweeps.sweepOnce();
          },
        };
        return new JobsService(targets, {
          // Off unless asked for, so a migration or a script never starts
          // watching a chain by accident.
          enabled: process.env.JOBS_ENABLED === 'true',
        });
      },
      inject: [CHAIN_SERVICES, TimeoutService],
    },
  ],
  exports: [JobsService],
})
export class JobsModule {}
