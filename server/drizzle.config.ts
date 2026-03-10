import path from 'node:path';
import { defineConfig } from 'drizzle-kit';

const dbPath =
  process.env.DATABASE_URL ||
  `file:${path.resolve(process.cwd(), '../content-engine.db')}`;

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: dbPath,
  },
});
