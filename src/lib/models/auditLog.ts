/**
 * Type definitions for audit log data.
 * @module models/auditLog
 */
import type { User } from './user'

/**
 * Represents an audit log entry
 */
export interface AuditLog {
  id: number
  actionType: 'create' | 'update' | 'delete' | 'toggle'
  entityType: string
  entityId: number | null
  changes: string | Record<string, unknown>
  createdAt: Date | null
  userId: number | null
}

/**
 * Represents an audit log with user information
 */
export interface AuditLogWithUser extends AuditLog {
  userName: string | null
  userEmail: string | null
  user?: User
}

/**
 * Simplified user information for audit logs
 */
export interface AuditLogUser {
  id: number
  name: string
  email: string
}

/**
 * Represents an audit log with formatted user information
 */
export interface FormattedAuditLog extends AuditLog {
  userName: string | null
  userEmail: string | null
  user: AuditLogUser
}

/**
 * Parameters for creating an audit log
 */
export interface CreateAuditLogParams {
  actionType: 'create' | 'update' | 'delete' | 'toggle'
  entityType: string
  entityId?: number
  userId?: number
  changes: Record<string, unknown>
}
