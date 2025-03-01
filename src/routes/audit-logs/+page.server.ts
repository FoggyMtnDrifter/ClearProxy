import { db } from '$lib/db';
import { auditLogs } from '$lib/db/schema';
import type { PageServerLoad } from './$types';
import { desc } from 'drizzle-orm';

export const load = (async () => {
  const logs = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(100); // Limit to last 100 logs for performance

  return {
    logs
  };
}) satisfies PageServerLoad; 