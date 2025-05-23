/**
 * Controller for dashboard API routes.
 * Handles HTTP requests for dashboard data.
 * @module controllers/dashboardController
 */
import { proxyHostRepository } from '$lib/repositories/proxyHostRepository'
import * as auditLogService from '$lib/services/auditLogService'
import * as proxyHostService from '$lib/services/proxyHostService'
import { apiLogger } from '$lib/utils/logger'

/**
 * Loads dashboard data including statistics and recent activity
 *
 * @returns {Promise<Object>} Dashboard data
 */
export async function loadDashboardData() {
  try {
    const hosts = await proxyHostRepository.getAll()

    const caddyStatus = await proxyHostService.getCaddyServerStatus()

    const stats = {
      totalHosts: hosts.length,
      activeHosts: hosts.filter((h) => h.enabled).length,
      caddyRunning: caddyStatus.running
    }

    const recentLogs = await auditLogService.getRecentAuditLogs(5)

    apiLogger.debug(
      {
        stats,
        recentLogCount: recentLogs.length
      },
      'Retrieved dashboard data'
    )

    return {
      stats,
      recentLogs
    }
  } catch (error) {
    apiLogger.error({ error }, 'Failed to load dashboard data')
    return {
      stats: {
        totalHosts: 0,
        activeHosts: 0,
        caddyRunning: false
      },
      recentLogs: []
    }
  }
}
