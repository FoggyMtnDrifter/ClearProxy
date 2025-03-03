/**
 * Database schema definition for the application.
 * Defines tables and their relationships using Drizzle ORM.
 * @module db/schema
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

/**
 * Users table schema.
 * Stores user information including authentication credentials and admin status.
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
 * Proxy hosts table schema.
 * Stores configuration for proxied domains, including target information and authentication settings.
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
 * Audit logs table schema.
 * Stores records of user actions and system changes for accountability and debugging.
 */
export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actionType: text('action_type').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id'),
  changes: text('changes').notNull(),
  userId: integer('user_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
})

/**
 * Access logs table schema.
 * Stores HTTP request logs for proxied domains, including response status and timing information.
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
  responseTime: integer('response_time')
})
