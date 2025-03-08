/**
 * Repository for audit log database operations.
 * Handles operations for audit logs.
 * @module repositories/auditLogRepository
 */
import { db } from '$lib/db'
import { auditLogs, users } from '$lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import type { AuditLog, AuditLogWithUser, FormattedAuditLog } from '$lib/models/auditLog'
import type { IAuditLogRepository } from '$lib/interfaces/IAuditLogRepository'

/**
 * Implementation of the IAuditLogRepository interface.
 */
class AuditLogRepository implements IAuditLogRepository {
  /**
   * Gets all audit logs from the database
   *
   * @param {number} limit - Maximum number of logs to retrieve
   * @returns {Promise<AuditLog[]>} Audit logs
   */
  async getAll(limit: number = 100): Promise<AuditLog[]> {
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit)
    return logs as AuditLog[]
  }

  /**
   * Gets audit logs by host ID
   *
   * @param {string} hostId - The host ID to filter by
   * @param {number} limit - Maximum number of logs to retrieve
   * @returns {Promise<AuditLog[]>} Filtered audit logs
   */
  async getByHostId(hostId: string, limit: number = 100): Promise<AuditLog[]> {
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, parseInt(hostId, 10)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
    return logs as AuditLog[]
  }

  /**
   * Creates a new audit log entry
   *
   * @param {Omit<AuditLog, 'id' | 'timestamp'>} auditLog - The audit log data
   * @returns {Promise<AuditLog>} The created audit log
   */
  async create(auditLog: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    // Convert changes to JSON string if it's an object
    const preparedData = {
      ...auditLog,
      changes:
        typeof auditLog.changes === 'object' ? JSON.stringify(auditLog.changes) : auditLog.changes,
      createdAt: new Date()
    }

    const [createdLog] = await db.insert(auditLogs).values(preparedData).returning()
    return createdLog as AuditLog
  }

  /**
   * Gets all audit logs with user information
   *
   * @param {number} limit - Maximum number of logs to retrieve
   * @returns {Promise<AuditLogWithUser[]>} Audit logs with user information
   */
  async getAllWithUserInfo(limit: number = 100): Promise<AuditLogWithUser[]> {
    return (await db
      .select({
        id: auditLogs.id,
        actionType: auditLogs.actionType,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        changes: auditLogs.changes,
        createdAt: auditLogs.createdAt,
        userId: auditLogs.userId,
        userName: users.name,
        userEmail: users.email
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)) as AuditLogWithUser[]
  }

  /**
   * Formats audit logs with normalized user information
   *
   * @param {AuditLogWithUser[]} logs - Raw audit logs with user data
   * @returns {FormattedAuditLog[]} Formatted audit logs with user objects
   */
  formatAuditLogs(logs: AuditLogWithUser[]): FormattedAuditLog[] {
    return logs.map((log) => ({
      ...log,
      user: log.userId
        ? {
            id: log.userId,
            name: log.userName || 'Unknown User',
            email: log.userEmail || 'unknown@clearproxy.app'
          }
        : {
            id: 0,
            name: 'System',
            email: 'system@clearproxy.app'
          }
    }))
  }
}

// Export a singleton instance
export const auditLogRepository = new AuditLogRepository()
