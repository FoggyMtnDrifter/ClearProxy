/**
 * Database initialization and connection management module.
 * Provides centralized database connection handling using better-sqlite3 and drizzle-orm.
 * Handles database initialization, migrations, and graceful shutdown.
 * 
 * @module database
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as path from 'path';
import { dbLogger } from '../logger';
import * as schema from './schema';
import { existsSync } from 'fs';
import { proxyHosts } from './schema';

/** Path to the project root directory, configurable via DATABASE_PATH environment variable */
const projectRoot = process.env.DATABASE_PATH || '.';

/** Path to database migrations directory, configurable via MIGRATIONS_PATH environment variable */
const migrationsPath = process.env.MIGRATIONS_PATH || path.join(projectRoot, 'src/lib/db/migrations');

/** Path to the SQLite database file */
const dbPath = path.join(projectRoot, 'clearproxy.db');

/**
 * Initializes the database connection and runs migrations.
 * This function is called on application startup to ensure the database
 * is properly set up and all migrations are applied.
 * 
 * @async
 * @returns {Promise<{
 *   db: import('drizzle-orm/better-sqlite3').BetterSQLite3Database<typeof schema>,
 *   sqlite: Database.Database,
 *   migrationError: Error | null
 * }>} Database connection objects and any migration errors
 * @throws {Error} If database initialization fails
 */
async function initializeDatabase() {
  dbLogger.info('Initializing database connection');
  
  try {
    // Check if database exists
    const dbExists = existsSync(dbPath);
    if (!dbExists) {
      dbLogger.info('Database file does not exist, it will be created');
    }

    // Initialize the database connection
    const sqlite = new Database(dbPath);
    const db = drizzle(sqlite, { schema });
    dbLogger.info('Database connection initialized successfully');

    // Run migrations
    try {
      dbLogger.info('Running database migrations');
      await migrate(db, { migrationsFolder: migrationsPath });
      dbLogger.info('Database migrations completed successfully');
      return { db, sqlite, migrationError: null };
    } catch (migrationError) {
      dbLogger.error({ error: migrationError }, 'Failed to run database migrations');
      return { db, sqlite, migrationError };
    }
  } catch (error) {
    dbLogger.error({ error }, 'Failed to initialize database connection');
    throw error;
  }
}

// Initialize database and export connection
const { db, sqlite, migrationError } = await initializeDatabase();

// Register cleanup handlers for graceful shutdown
process.on('exit', () => {
  dbLogger.info('Closing database connection on process exit');
  sqlite.close();
});

process.on('SIGINT', () => {
  dbLogger.info('Closing database connection on SIGINT');
  sqlite.close();
  process.exit();
});

/** The initialized Drizzle ORM database instance */
export { db };

/** The underlying better-sqlite3 database instance */
export { sqlite };

/** Any error that occurred during migration, null if successful */
export { migrationError };

// Add a custom middleware function to fix null object passwords
// We'll use this after any query that might retrieve proxy hosts
export function fixNullObjectPasswords<T extends Record<string, any>>(rows: T[]): T[] {
  return rows.map(row => {
    // If the row has a basicAuthPassword property that's a null object, fix it
    if (row && 
        typeof row === 'object' && 
        'basicAuthPassword' in row && 
        row.basicAuthPassword !== null && 
        typeof row.basicAuthPassword === 'object') {
      return { ...row, basicAuthPassword: null };
    }
    return row;
  });
} 