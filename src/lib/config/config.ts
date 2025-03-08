/**
 * Application configuration module.
 * Centralizes all configuration settings and environment variables.
 * @module config
 */
import * as path from 'path'

/**
 * Database configuration
 */
export const db = {
  /** Root directory for database files */
  projectRoot: process.env.DATABASE_PATH || '.',

  /** Path to database migrations */
  migrationsPath:
    process.env.MIGRATIONS_PATH ||
    path.join(process.env.DATABASE_PATH || '.', 'src/lib/db/migrations'),

  /** Path to the SQLite database file */
  dbPath: path.join(process.env.DATABASE_PATH || '.', 'clearproxy.db')
}

/**
 * Caddy server configuration
 */
export const caddy = {
  /** Base URL for the Caddy API */
  apiUrl: process.env.CADDY_API_URL || 'http://localhost:2019',

  /** Maximum number of retries for Caddy API operations */
  maxRetries: 3,

  /** Initial delay between retries in milliseconds */
  initialRetryDelay: 1000,

  /** Maximum delay between retries in milliseconds */
  maxRetryDelay: 5000
}

/**
 * Authentication configuration
 */
export const auth = {
  /** Secret key for cookie sessions */
  sessionSecret: process.env.SESSION_SECRET || 'clearproxy_secret_change_me_in_production',

  /** Cookie name for sessions */
  cookieName: 'clearproxy_session',

  /** Session timeout in milliseconds (default 24 hours) */
  sessionTimeout: 24 * 60 * 60 * 1000,

  /** Default admin email address */
  defaultAdminEmail: process.env.DEFAULT_ADMIN_EMAIL || 'admin@clearproxy.app'
}

/**
 * Application settings
 */
export const app = {
  /** Application environment */
  env: process.env.NODE_ENV || 'development',

  /** Application port */
  port: parseInt(process.env.PORT || '3000', 10),

  /** Application base URL */
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',

  /** Whether to enable debug logging */
  debug: process.env.DEBUG === 'true'
}

/**
 * Default export for convenience
 */
export default {
  db,
  caddy,
  auth,
  app
}
