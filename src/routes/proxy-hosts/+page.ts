/**
 * Client-side page loader for the proxy hosts management interface.
 * Handles reactivity and data loading for the proxy hosts page.
 * @module routes/proxy-hosts/+page
 */
import type { PageLoad } from './$types'

/**
 * Page load function for the proxy hosts page
 * Sets up dependency tags for reactive invalidation
 *
 * @type {PageLoad}
 */
export const load = (({ data, depends }) => {
  // Register dependencies for page invalidation
  depends('app:proxy-hosts')
  depends('app:caddy-status')

  return data
}) satisfies PageLoad
