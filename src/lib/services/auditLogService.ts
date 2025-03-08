/**
 * Service for audit log management.
 * Handles business logic for audit logs.
 * @module services/auditLogService
 */
import { auditLogRepository } from '$lib/repositories/auditLogRepository'
import { apiLogger } from '$lib/utils/logger'
import type { FormattedAuditLog, CreateAuditLogParams } from '$lib/models/auditLog'

/**
 * Gets all audit logs with formatted user information
 *
 * @param {number} limit - Maximum number of logs to retrieve
 * @returns {Promise<FormattedAuditLog[]>} Formatted audit logs
 */
export async function getAllAuditLogs(limit: number = 100): Promise<FormattedAuditLog[]> {
  const logs = await auditLogRepository.getAllWithUserInfo(limit)

  apiLogger.debug(
    {
      logCount: logs.length
    },
    'Retrieved audit logs from database'
  )

  return auditLogRepository.formatAuditLogs(logs)
}

/**
 * Gets recent audit logs with formatted user information
 *
 * @param {number} limit - Maximum number of logs to retrieve
 * @returns {Promise<FormattedAuditLog[]>} Formatted recent audit logs
 */
export async function getRecentAuditLogs(limit: number = 5): Promise<FormattedAuditLog[]> {
  const logs = await auditLogRepository.getAllWithUserInfo(limit)
  return auditLogRepository.formatAuditLogs(logs)
}

/**
 * Creates a new audit log entry
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
    'Creating audit log entry'
  )

  await auditLogRepository.create({
    actionType: logData.actionType,
    entityType: logData.entityType,
    entityId: logData.entityId ?? null,
    userId: logData.userId ?? null,
    changes: logData.changes,
    createdAt: null // Will be set in the repository
  })
}
