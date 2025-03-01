import { db } from '$lib/db';
import { proxyHosts } from '$lib/db/schema';
import type { PageServerLoad } from './$types';

export const load = (async () => {
  const hosts = await db.select().from(proxyHosts);

  const stats = {
    totalHosts: hosts.length,
    activeHosts: hosts.filter(h => h.enabled).length
  };

  return {
    stats,
    recentHosts: hosts.slice(0, 5)
  };
}) satisfies PageServerLoad; 