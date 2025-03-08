/**
 * Audit log utility module.
 * Provides functions for creating audit log entries.
 * @module db/audit
 */
import { createAuditLog as createAuditLogService } from '$lib/services/auditLogService'
import type { CreateAuditLogParams } from '$lib/models/auditLog'
import { apiLogger } from '$lib/utils/logger'

/**
 * Creates an audit log entry
 *
 * @param {CreateAuditLogParams} logData - The audit log data
 * @returns {Promise<void>} Promise that resolves when the log is created
 */
export async function createAuditLog(logData: CreateAuditLogParams): Promise<void> {
  apiLogger.debug(
    {
      actionType: logData.actionType,
      entityType: logData.entityType,
      entityId: logData.entityId
    },
    'Creating audit log entry from db/audit module'
  )

  await createAuditLogService(logData)
}
