/**
 * Tests read their database URL from `api/.env`, the same file the
 * application uses. Before this existed the suite silently fell back to a
 * hardcoded localhost URL, so it could pass against whatever PostgreSQL
 * happened to be installed on the machine rather than the one the project
 * runs on.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '.env') });
