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
 * Includes a retry mechanism to handle startup race conditions.
 */
export const migrateDB = async (retries = 5, delay = 2000) => {
  console.log('⏳ Running database migrations...');
  for (let i = 0; i < retries; i++) {
    try {
      await migrate(db, { 
        migrationsFolder: path.join(__dirname, 'migrations') 
      });
      console.log('✅ Database migrations completed successfully');
      return;
    } catch (error) {
      if (i === retries - 1) {
        console.error('❌ Database migration failed after max retries:', error);
        throw error;
      }
      console.log(`⚠️ Migration failed, retrying in ${delay / 1000}s... (${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
