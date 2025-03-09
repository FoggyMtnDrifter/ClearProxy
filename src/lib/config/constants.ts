/**
 * Application-wide constants
 * Central place for all constant values used throughout the application
 * @module config/constants
 */

export const APP_NAME = 'ClearProxy'
export const APP_VERSION = '1.0.0'

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export const LOG_LEVELS = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
}

export const PASSWORD_SALT_ROUNDS = 10
export const TOKEN_EXPIRY = '1d' // 1 day

export const CADDY_API_BASE_URL = 'http://localhost:2019'
export const CADDY_CONF_PATH = '/config/caddy/Caddyfile'

export const DEFAULT_AUDIT_LOG_LIMIT = 100

/**
 * Application constants.
 * Centralizes constant values used throughout the application.
 * @module constants
 */

/**
 * Available protocols for proxy targets
 */
export const PROTOCOLS = {
  HTTP: 'http',
  HTTPS: 'https',
  FASTCGI: 'fastcgi'
}

/**
 * Action types for audit logs
 */
export const AUDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  TOGGLE: 'toggle'
}

/**
 * Entity types for audit logs
 */
export const ENTITY_TYPES = {
  PROXY_HOST: 'proxy_host',
  USER: 'user',
  SYSTEM: 'system'
}

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
}

/**
 * Pagination constants
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
}

/**
 * System user for audit logs
 */
export const SYSTEM_USER = {
  id: 0,
  name: 'System',
  email: 'system@clearproxy.app'
}

/**
 * Unknown user for audit logs
 */
export const UNKNOWN_USER = {
  id: 0,
  name: 'Unknown User',
  email: 'unknown@clearproxy.app'
}
