import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is missing');
}

const connectionString = process.env.DATABASE_URL;

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

/**
 * Automatically applies migrations from the 'migrations' folder to the database.
 * This is essential for zero-human-intervention deployments to private RDS.
 */
export const migrateDB = async () => {
  console.log('⏳ Running database migrations...');
  try {
    await migrate(db, { 
      migrationsFolder: path.join(__dirname, 'migrations') 
    });
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    throw error;
  }
};
