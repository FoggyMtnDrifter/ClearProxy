import { db } from '$lib/db';
import { proxyHosts, auditLogs, users } from '$lib/db/schema';
import type { PageServerLoad } from './$types';
import { desc } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

export const load = (async () => {
  const hosts = await db.select().from(proxyHosts);

  const stats = {
    totalHosts: hosts.length,
    activeHosts: hosts.filter(h => h.enabled).length
  };

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
    .limit(5);

  return {
    stats,
    recentLogs: recentLogs.map(log => ({
      ...log,
      user: log.userId ? {
        id: log.userId,
        name: log.userName || 'Unknown User',
        email: log.userEmail || 'unknown@clearproxy.app'
      } : {
        id: 0,
        name: 'System',
        email: 'system@clearproxy.app'
      }
    }))
  };
}) satisfies PageServerLoad; 