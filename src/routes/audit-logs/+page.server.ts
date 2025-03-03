/**
 * Server-side handling for the audit logs page.
 * Loads and formats audit log entries for display.
 * @module routes/audit-logs/+page.server
 */
import { db } from '$lib/db'
import { auditLogs, users } from '$lib/db/schema'
import type { PageServerLoad } from './$types'
import { desc, eq } from 'drizzle-orm'

/**
 * Page load function for the audit logs page
 * Retrieves recent audit logs with associated user information
 *
 * @type {PageServerLoad}
 * @returns {Promise<{logs: object[]}>} Formatted audit log entries
 */
export const load = (async () => {
  // Query audit logs with user information via join
  const logs = await db
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
    .limit(100)

  // Format logs with normalized user objects
  return {
    logs: logs.map((log) => ({
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
}) satisfies PageServerLoad
