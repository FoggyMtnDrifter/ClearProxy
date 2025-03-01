import type { PageLoad } from './$types';

export const load = (({ data, depends }) => {
  // Mark this load function as dependent on both proxy-hosts and caddy-status
  depends('app:proxy-hosts');
  depends('app:caddy-status');
  
  return data;
}) satisfies PageLoad; 