/**
 * Database connection and utility module.
 * Manages SQLite database connection, migrations, and utility functions.
 * @module db/index
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as path from 'path'
import { dbLogger } from '../logger'
import * as schema from './schema'
import { existsSync } from 'fs'
import { proxyHosts as _proxyHosts } from './schema'

/** Root directory for database files */
const projectRoot = process.env.DATABASE_PATH || '.'
/** Path to database migrations */
const migrationsPath =
  process.env.MIGRATIONS_PATH || path.join(projectRoot, 'src/lib/db/migrations')
/** Path to the SQLite database file */
const dbPath = path.join(projectRoot, 'clearproxy.db')

/**
 * Initializes the database connection and runs migrations.
 * Creates the database file if it doesn't exist.
 *
 * @returns {Promise<{db: ReturnType<typeof drizzle>, sqlite: Database.Database, migrationError: Error | null}>}
 * Database connection objects and any migration errors
 */
async function initializeDatabase() {
  dbLogger.info('Initializing database connection')
  try {
    const dbExists = existsSync(dbPath)
    if (!dbExists) {
      dbLogger.info('Database file does not exist, it will be created')
    }

    const sqlite = new Database(dbPath)
    const db = drizzle(sqlite, { schema })
    dbLogger.info('Database connection initialized successfully')

    try {
      dbLogger.info('Running database migrations')
      await migrate(db, { migrationsFolder: migrationsPath })
      dbLogger.info('Database migrations completed successfully')
      return { db, sqlite, migrationError: null }
    } catch (migrationError) {
      dbLogger.error({ error: migrationError }, 'Failed to run database migrations')
      return { db, sqlite, migrationError }
    }
  } catch (error) {
    dbLogger.error({ error }, 'Failed to initialize database connection')
    throw error
  }
}

const { db, sqlite, migrationError } = await initializeDatabase()

// Register cleanup handlers for database connection
process.on('exit', () => {
  dbLogger.info('Closing database connection on process exit')
  sqlite.close()
})

process.on('SIGINT', () => {
  dbLogger.info('Closing database connection on SIGINT')
  sqlite.close()
  process.exit()
})

/** Drizzle ORM database instance */
export { db }
/** SQLite database connection */
export { sqlite }
/** Any errors that occurred during migration */
export { migrationError }

/**
 * Fixes null object passwords in database rows.
 * SQLite can sometimes return objects instead of null values for password fields.
 *
 * @template T - Object type with string keys
 * @param {T[]} rows - Array of database rows to fix
 * @returns {T[]} - Fixed array with correct null values for passwords
 */
export function fixNullObjectPasswords<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((row) => {
    if (
      row &&
      typeof row === 'object' &&
      'basicAuthPassword' in row &&
      row.basicAuthPassword !== null &&
      typeof row.basicAuthPassword === 'object'
    ) {
      return { ...row, basicAuthPassword: null }
    }
    return row
  })
}
