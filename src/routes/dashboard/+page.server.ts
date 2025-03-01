import { db } from '$lib/db';
import { proxyHosts, auditLogs } from '$lib/db/schema';
import type { PageServerLoad } from './$types';
import { desc } from 'drizzle-orm';

export const load = (async () => {
  const hosts = await db.select().from(proxyHosts);

  const stats = {
    totalHosts: hosts.length,
    activeHosts: hosts.filter(h => h.enabled).length
  };

  const recentLogs = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(5);

  return {
    stats,
    recentLogs
  };
}) satisfies PageServerLoad; 