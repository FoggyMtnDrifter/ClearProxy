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
  projectRoot: process.env.DATABASE_PATH || '.',

  migrationsPath:
    process.env.MIGRATIONS_PATH ||
    path.join(process.env.DATABASE_PATH || '.', 'src/lib/db/migrations'),

  dbPath: path.join(process.env.DATABASE_PATH || '.', 'clearproxy.db')
}

/**
 * Caddy server configuration
 */
export const caddy = {
  apiUrl: process.env.CADDY_API_URL || 'http://localhost:2019',

  maxRetries: 3,

  initialRetryDelay: 1000,

  maxRetryDelay: 5000
}

/**
 * Authentication configuration
 */
export const auth = {
  sessionSecret: process.env.SESSION_SECRET || 'clearproxy_secret_change_me_in_production',

  cookieName: 'clearproxy_session',

  sessionTimeout: 24 * 60 * 60 * 1000,

  defaultAdminEmail: process.env.DEFAULT_ADMIN_EMAIL || 'admin@clearproxy.app'
}

/**
 * Application settings
 */
export const app = {
  env: process.env.NODE_ENV || 'development',

  port: parseInt(process.env.PORT || '3000', 10),

  baseUrl: process.env.BASE_URL || 'http://localhost:3000',

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
