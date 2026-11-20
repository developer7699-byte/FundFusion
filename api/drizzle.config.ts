import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: './.env' });

/**
 * Both databases live in the same container (docker-compose.yml). The test
 * one is migrated with `MIGRATE_TARGET=test`, so the connection string is
 * written down once rather than copied into a script.
 */
const url =
  process.env.MIGRATE_TARGET === 'test'
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL;

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      url ??
      'postgresql://fundfusion:fundfusion_dev_only@localhost:5433/fundfusion_dev',
  },
  casing: 'snake_case',
});
