/**
 * Database Schema Definition
 *
 * This module defines the database schema using Drizzle ORM, providing a type-safe
 * interface for database operations. The schema is designed for a SQLite database
 * and includes comprehensive auditing and monitoring capabilities.
 *
 * Tables:
 * - Users: Authentication and access control
 * - Proxy Hosts: Reverse proxy configurations
 * - Audit Logs: System activity tracking
 * - Access Logs: Request monitoring
 *
 * Features:
 * - Type-safe schema definitions
 * - Automatic timestamps
 * - Foreign key relationships
 * - Boolean flag support
 * - JSON storage for complex data
 * - Comprehensive indexing
 *
 * @module database/schema
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

/**
 * Users table - Stores user authentication and profile information
 *
 * Features:
 * - Secure password hashing
 * - Role-based access control
 * - Automatic timestamp management
 * - Unique email constraint
 *
 * @property {number} id - Auto-incrementing primary key
 * @property {string} email - Unique user email address
 * @property {string} passwordHash - Securely hashed password
 * @property {string} name - User's display name
 * @property {boolean} isAdmin - Administrative privileges flag
 * @property {Date} createdAt - Account creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
})

/**
 * Proxy Hosts table - Stores reverse proxy configurations
 *
 * Features:
 * - Comprehensive SSL/TLS configuration
 * - HTTP/2 and HTTP/3 support
 * - Basic authentication integration
 * - Advanced custom configuration support
 * - Automatic timestamp management
 *
 * @property {number} id - Auto-incrementing primary key
 * @property {string} domain - The domain to proxy (e.g., example.com)
 * @property {string} targetHost - Destination host to proxy to
 * @property {number} targetPort - Destination port number
 * @property {string} targetProtocol - Protocol to use (http/https)
 * @property {boolean} sslEnabled - Whether SSL/TLS is enabled
 * @property {boolean} forceSSL - Whether to redirect HTTP to HTTPS
 * @property {boolean} http2Support - Whether HTTP/2 is enabled
 * @property {boolean} http3Support - Whether HTTP/3 is enabled
 * @property {boolean} enabled - Whether this proxy host is active
 * @property {boolean} ignoreInvalidCert - Whether to ignore invalid certificates
 * @property {string} advancedConfig - JSON string of advanced Caddy config
 * @property {boolean} basicAuthEnabled - Whether basic auth is enabled
 * @property {string} basicAuthUsername - Basic auth username if enabled
 * @property {string} basicAuthPassword - Hashed basic auth password if enabled
 * @property {Date} createdAt - Configuration creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */
export const proxyHosts = sqliteTable('proxy_hosts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  domain: text('domain').notNull(),
  targetHost: text('target_host').notNull(),
  targetPort: integer('target_port').notNull(),
  targetProtocol: text('target_protocol').notNull().default('http'),
  sslEnabled: integer('ssl_enabled', { mode: 'boolean' }).notNull().default(true),
  forceSSL: integer('force_ssl', { mode: 'boolean' }).notNull().default(true),
  http2Support: integer('http2_support', { mode: 'boolean' }).notNull().default(true),
  http3Support: integer('http3_support', { mode: 'boolean' }).notNull().default(true),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  ignoreInvalidCert: integer('ignore_invalid_cert', { mode: 'boolean' }).notNull().default(false),
  advancedConfig: text('advanced_config'),
  basicAuthEnabled: integer('basic_auth_enabled', { mode: 'boolean' }).notNull().default(false),
  basicAuthUsername: text('basic_auth_username'),
  basicAuthPassword: text('basic_auth_password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
})

/**
 * Audit Logs table - Tracks system activity and changes
 *
 * Features:
 * - Comprehensive action tracking
 * - Entity-based organization
 * - Change history storage
 * - User attribution
 * - Automatic timestamps
 *
 * @property {number} id - Auto-incrementing primary key
 * @property {string} actionType - Type of action (create/update/delete/toggle)
 * @property {string} entityType - Type of entity modified
 * @property {number} entityId - ID of the modified entity
 * @property {string} changes - JSON string of changes made
 * @property {number} userId - ID of user who made the change
 * @property {Date} createdAt - When the action occurred
 */
export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actionType: text('action_type').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id'),
  changes: text('changes').notNull(), // JSON string of changes
  userId: integer('user_id'), // Nullable for system actions
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
})

/**
 * Access Logs table - Records HTTP request details
 *
 * Features:
 * - Request metadata capture
 * - Performance monitoring
 * - Client information tracking
 * - Proxy host attribution
 *
 * @property {number} id - Auto-incrementing primary key
 * @property {number} proxyHostId - ID of the proxy host that handled the request
 * @property {Date} timestamp - When the request occurred
 * @property {string} ipAddress - Client IP address
 * @property {string} method - HTTP method used
 * @property {string} path - Requested path
 * @property {number} statusCode - HTTP response status
 * @property {string} userAgent - Client user agent string
 * @property {number} responseTime - Request processing time in ms
 */
export const accessLogs = sqliteTable('access_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  proxyHostId: integer('proxy_host_id').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address').notNull(),
  method: text('method').notNull(),
  path: text('path').notNull(),
  statusCode: integer('status_code').notNull(),
  userAgent: text('user_agent'),
  responseTime: integer('response_time') // in milliseconds
})
