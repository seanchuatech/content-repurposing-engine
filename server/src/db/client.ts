import path from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

// For local dev, database is stored in the root directory
export const dbPath =
  process.env.DATABASE_URL ||
  `file:${path.resolve(process.cwd(), '../content-engine.db')}`;

export const sqliteClient = createClient({ url: dbPath });
export const db = drizzle(sqliteClient, { schema });
