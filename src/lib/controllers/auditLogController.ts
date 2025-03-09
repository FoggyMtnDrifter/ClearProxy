/**
 * Controller for audit log API routes.
 * Handles HTTP requests for audit log operations.
 * @module controllers/auditLogController
 */
import * as auditLogService from '$lib/services/auditLogService'
import { apiLogger } from '$lib/utils/logger'

/**
 * Loads audit logs for display
 *
 * @param {Object} event - The request event
 * @returns {Promise<Object>} Formatted audit logs
 */
export async function loadAuditLogs() {
  try {
    const logs = await auditLogService.getAllAuditLogs(100)

    apiLogger.debug(
      {
        logCount: logs.length
      },
      'Retrieved audit logs for display'
    )

    return { logs }
  } catch (error) {
    apiLogger.error({ error }, 'Failed to load audit logs')
    return { logs: [] }
  }
}

/**
 * Loads recent audit logs for dashboard
 *
 * @param {Object} event - The request event
 * @returns {Promise<Object>} Recent audit logs
 */
export async function loadRecentAuditLogs() {
  try {
    const recentLogs = await auditLogService.getRecentAuditLogs(5)

    return { recentLogs }
  } catch (error) {
    apiLogger.error({ error }, 'Failed to load recent audit logs')
    return { recentLogs: [] }
  }
}
