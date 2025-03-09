/**
 * Service for audit log management.
 * Handles business logic for audit logs.
 * @module services/auditLogService
 */
import { auditLogRepository } from '$lib/repositories/auditLogRepository'
import { apiLogger } from '$lib/utils/logger'
import type { FormattedAuditLog, CreateAuditLogParams } from '$lib/models/auditLog'

let recentAuditLogsCache: {
  logs: FormattedAuditLog[]
  expires: number
} | null = null

const CACHE_TTL = 10 * 1000

let allAuditLogsCache: {
  logs: FormattedAuditLog[]
  expires: number
  limit: number
} | null = null

const ALL_LOGS_CACHE_TTL = 5 * 1000

/**
 * Gets all audit logs with formatted user information
 *
 * @param {number} limit - Maximum number of logs to retrieve
 * @param {boolean} useCache - Whether to use cached results if available
 * @param {boolean} forceRefresh - Whether to force a refresh of the cache
 * @returns {Promise<FormattedAuditLog[]>} Formatted audit logs
 */
export async function getAllAuditLogs(
  limit: number = 100,
  useCache: boolean = true,
  forceRefresh: boolean = false
): Promise<FormattedAuditLog[]> {
  if (forceRefresh) {
    allAuditLogsCache = null
  }

  if (
    useCache &&
    !forceRefresh &&
    allAuditLogsCache &&
    allAuditLogsCache.expires > Date.now() &&
    allAuditLogsCache.limit >= limit
  ) {
    apiLogger.debug('Using cached all audit logs')
    return allAuditLogsCache.logs.slice(0, limit)
  }

  const logs = await auditLogRepository.getAllWithUserInfo(limit)
  const formattedLogs = auditLogRepository.formatAuditLogs(logs)

  apiLogger.debug(
    {
      logCount: logs.length
    },
    'Retrieved audit logs from database'
  )

  allAuditLogsCache = {
    logs: formattedLogs,
    expires: Date.now() + ALL_LOGS_CACHE_TTL,
    limit
  }

  return formattedLogs
}

/**
 * Gets recent audit logs with formatted user information
 * Uses a short-lived cache to improve performance for dashboard views
 *
 * @param {number} limit - Maximum number of logs to retrieve
 * @param {boolean} useCache - Whether to use cached results if available
 * @param {boolean} forceRefresh - Whether to force a refresh of the cache
 * @returns {Promise<FormattedAuditLog[]>} Formatted recent audit logs
 */
export async function getRecentAuditLogs(
  limit: number = 5,
  useCache: boolean = true,
  forceRefresh: boolean = false
): Promise<FormattedAuditLog[]> {
  if (forceRefresh) {
    recentAuditLogsCache = null
  }

  if (
    useCache &&
    !forceRefresh &&
    recentAuditLogsCache &&
    recentAuditLogsCache.expires > Date.now() &&
    recentAuditLogsCache.logs.length >= limit
  ) {
    apiLogger.debug('Using cached recent audit logs')
    return recentAuditLogsCache.logs.slice(0, limit)
  }

  const logs = await auditLogRepository.getAllWithUserInfo(limit)
  const formattedLogs = auditLogRepository.formatAuditLogs(logs)

  recentAuditLogsCache = {
    logs: formattedLogs,
    expires: Date.now() + CACHE_TTL
  }

  return formattedLogs
}

const auditLogQueue: CreateAuditLogParams[] = []
let auditLogFlushTimeout: ReturnType<typeof setTimeout> | null = null
const MAX_QUEUE_SIZE = 10
const FLUSH_INTERVAL = 5000

/**
 * Flush the audit log queue to the database
 *
 * @private
 */
async function flushAuditLogQueue(): Promise<void> {
  if (auditLogFlushTimeout) {
    clearTimeout(auditLogFlushTimeout)
    auditLogFlushTimeout = null
  }

  if (auditLogQueue.length === 0) return

  const logsToFlush = [...auditLogQueue]
  auditLogQueue.length = 0 // Clear the queue

  try {
    await Promise.all(
      logsToFlush.map(async (logData) => {
        await auditLogRepository.create({
          actionType: logData.actionType,
          entityType: logData.entityType,
          entityId: logData.entityId ?? null,
          userId: logData.userId ?? null,
          changes: logData.changes,
          createdAt: null
        })
      })
    )

    apiLogger.debug({ count: logsToFlush.length }, 'Batch processed audit log entries')

    recentAuditLogsCache = null
    allAuditLogsCache = null
  } catch (error) {
    apiLogger.error({ error, count: logsToFlush.length }, 'Failed to batch process audit logs')
  }
}

/**
 * Creates a new audit log entry
 * Uses batching for non-critical logs to improve performance
 *
 * @param {CreateAuditLogParams} logData - The audit log data
 * @param {boolean} immediate - Whether to write immediately or batch the log
 * @returns {Promise<void>} Promise that resolves when the log is created
 */
export async function createAuditLog(
  logData: CreateAuditLogParams,
  immediate: boolean = false
): Promise<void> {
  apiLogger.debug(
    {
      actionType: logData.actionType,
      entityType: logData.entityType,
      entityId: logData.entityId,
      immediate
    },
    'Creating audit log entry'
  )

  if (immediate) {
    await auditLogRepository.create({
      actionType: logData.actionType,
      entityType: logData.entityType,
      entityId: logData.entityId ?? null,
      userId: logData.userId ?? null,
      changes: logData.changes,
      createdAt: null
    })

    recentAuditLogsCache = null
    allAuditLogsCache = null
    return
  }

  auditLogQueue.push(logData)

  if (auditLogQueue.length >= MAX_QUEUE_SIZE) {
    await flushAuditLogQueue()
    return
  }

  if (!auditLogFlushTimeout) {
    auditLogFlushTimeout = setTimeout(() => {
      flushAuditLogQueue().catch((err) => {
        apiLogger.error({ error: err }, 'Failed to flush audit log queue')
      })
    }, FLUSH_INTERVAL)
  }
}

/**
 * Manually clears all audit log caches
 */
export function clearAuditLogCaches(): void {
  recentAuditLogsCache = null
  allAuditLogsCache = null
  apiLogger.debug('Manually cleared all audit log caches')
}
