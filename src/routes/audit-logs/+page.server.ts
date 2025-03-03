import { db } from '$lib/db'
import { auditLogs, users } from '$lib/db/schema'
import type { PageServerLoad } from './$types'
import { desc, eq } from 'drizzle-orm'

export const load = (async () => {
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
