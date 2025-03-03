/**
 * Server-side handling for the dashboard page.
 * Loads statistics and recent activity for display in the dashboard.
 * @module routes/dashboard/+page.server
 */
import { db } from '$lib/db'
import { proxyHosts, auditLogs, users } from '$lib/db/schema'
import type { PageServerLoad } from './$types'
import { desc } from 'drizzle-orm'
import { eq } from 'drizzle-orm'

/**
 * Page load function for the dashboard
 * Retrieves system statistics and recent audit logs
 *
 * @type {PageServerLoad}
 * @returns {Promise<{stats: object, recentLogs: object[]}>} Dashboard data
 */
export const load = (async () => {
  // Get all proxy hosts for stats calculation
  const hosts = await db.select().from(proxyHosts)

  // Calculate system statistics
  const stats = {
    totalHosts: hosts.length,
    activeHosts: hosts.filter((h) => h.enabled).length
  }

  // Get recent audit logs with user information
  const recentLogs = await db
    .select({
      id: auditLogs.id,
      actionType: auditLogs.actionType,
      entityType: auditLogs.entityType,
      createdAt: auditLogs.createdAt,
      userId: auditLogs.userId,
      userName: users.name,
      userEmail: users.email
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(5)

  // Return combined data with normalized user objects
  return {
    stats,
    recentLogs: recentLogs.map((log) => ({
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
