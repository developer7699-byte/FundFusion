import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { Pool, types } from 'pg';
import * as schema from './schema';

/**
 * PRD §5.1: money crosses the application boundary as strings and a JavaScript
 * `number` never holds money. node-postgres parses NUMERIC into a float by
 * default, which silently loses precision past 15 significant digits — well
 * inside the range a NUMERIC(38,18) USDT balance occupies. Parsing it as a
 * string is what keeps the decimal library authoritative.
 */
types.setTypeParser(types.builtins.NUMERIC, (value: string) => value);
types.setTypeParser(types.builtins.INT8, (value: string) => value);

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(DbService.name);
  readonly pool: Pool;
  readonly db: NodePgDatabase<typeof schema>;

  constructor() {
    this.pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ?? 'postgresql://localhost:5432/fundfusion_dev',
    });
    this.db = drizzle(this.pool, { schema, casing: 'snake_case' });
  }

  async onModuleInit() {
    try {
      await this.pool.query('SELECT 1');
      this.log.log('PostgreSQL connected.');
    } catch (err) {
      this.log.error(`PostgreSQL unavailable: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
