/**
 * Audit logging module for tracking changes to entities in the system.
 * Provides functionality to record user actions and system changes.
 * @module db/audit
 */
import { db } from './index'
import { auditLogs } from './schema'

/**
 * Parameters for creating an audit log entry.
 *
 * @interface CreateAuditLogParams
 * @property {('create'|'update'|'delete'|'toggle')} actionType - The type of action performed
 * @property {string} entityType - The type of entity that was modified (e.g., 'proxy', 'user')
 * @property {number} [entityId] - Optional ID of the entity that was modified
 * @property {Record<string, unknown>} changes - Object containing the changes made to the entity
 * @property {number} [userId] - Optional ID of the user who performed the action
 */
export interface CreateAuditLogParams {
  actionType: 'create' | 'update' | 'delete' | 'toggle'
  entityType: string
  entityId?: number
  changes: Record<string, unknown>
  userId?: number
}

/**
 * Creates a new audit log entry in the database.
 * Records actions performed on entities for accountability and debugging.
 *
 * @param {CreateAuditLogParams} params - Parameters for the audit log entry
 * @returns {Promise<any>} Result of the database insert operation
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
