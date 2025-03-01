/**
 * Database Schema Definition
 * 
 * This module defines the database structure using Drizzle ORM.
 * It includes tables for:
 * - Users: Authentication and user management
 * - Proxy Hosts: Reverse proxy configuration
 * - Access Logs: Request logging and monitoring
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Users table - Stores user authentication information
 */
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

/**
 * Proxy Hosts table - Stores reverse proxy configuration
 * 
 * Each record represents a proxy host configuration with:
 * - Basic host information (domain, target)
 * - SSL/TLS settings
 * - Basic authentication settings
 * - Advanced configuration options
 */
export const proxyHosts = sqliteTable('proxy_hosts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  domain: text('domain').notNull(),
  targetHost: text('target_host').notNull(),
  targetPort: integer('target_port').notNull(),
  sslEnabled: integer('ssl_enabled', { mode: 'boolean' }).notNull().default(true),
  forceSSL: integer('force_ssl', { mode: 'boolean' }).notNull().default(true),
  http2Support: integer('http2_support', { mode: 'boolean' }).notNull().default(true),
  http3Support: integer('http3_support', { mode: 'boolean' }).notNull().default(true),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  advancedConfig: text('advanced_config'),
  basicAuthEnabled: integer('basic_auth_enabled', { mode: 'boolean' }).notNull().default(false),
  basicAuthUsername: text('basic_auth_username'),
  basicAuthPassword: text('basic_auth_password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

/**
 * Access Logs table - Stores request logs for monitoring
 * 
 * Each record represents a single HTTP request with:
 * - Request details (method, path, status)
 * - Client information (IP, user agent)
 * - Performance metrics (response time)
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
  responseTime: integer('response_time'), // in milliseconds
}); 