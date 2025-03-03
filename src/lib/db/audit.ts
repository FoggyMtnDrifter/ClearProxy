/**
 * Audit logging module for tracking system changes.
 * Provides functionality to record and track changes made to system entities.
 *
 * @module audit
 */

import { db } from './index'
import { auditLogs } from './schema'

/**
 * Parameters for creating an audit log entry.
 *
 * @interface CreateAuditLogParams
 * @property {('create'|'update'|'delete'|'toggle')} actionType - The type of action performed
 * @property {string} entityType - The type of entity being modified (e.g., 'proxy_host', 'user')
 * @property {number} [entityId] - The ID of the entity being modified (optional)
 * @property {Record<string, unknown>} changes - Object containing the changes made
 * @property {number} [userId] - The ID of the user who performed the action (optional for system actions)
 */
export interface CreateAuditLogParams {
  actionType: 'create' | 'update' | 'delete' | 'toggle'
  entityType: string
  entityId?: number
  changes: Record<string, unknown>
  userId?: number
}

/**
 * Creates an audit log entry in the database to track system changes.
 *
 * @async
 * @param {CreateAuditLogParams} params - The audit log parameters
 * @returns {Promise<object>} The created audit log entry
 *
 * @example
 * ```typescript
 * await createAuditLog({
 *   actionType: 'update',
 *   entityType: 'proxy_host',
 *   entityId: 123,
 *   changes: { domain: 'old.com -> new.com' },
 *   userId: 456
 * });
 * ```
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  const { actionType, entityType, entityId, changes, userId } = params

  return await db.insert(auditLogs).values({
    actionType,
    entityType,
    entityId,
    changes: JSON.stringify(changes),
    userId,
    createdAt: new Date()
  })
}
