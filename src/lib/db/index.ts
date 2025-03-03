import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as path from 'path'
import { dbLogger } from '../logger'
import * as schema from './schema'
import { existsSync } from 'fs'
import { proxyHosts as _proxyHosts } from './schema'
const projectRoot = process.env.DATABASE_PATH || '.'
const migrationsPath =
  process.env.MIGRATIONS_PATH || path.join(projectRoot, 'src/lib/db/migrations')
const dbPath = path.join(projectRoot, 'clearproxy.db')
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
process.on('exit', () => {
  dbLogger.info('Closing database connection on process exit')
  sqlite.close()
})
process.on('SIGINT', () => {
  dbLogger.info('Closing database connection on SIGINT')
  sqlite.close()
  process.exit()
})
export { db }
export { sqlite }
export { migrationError }
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
