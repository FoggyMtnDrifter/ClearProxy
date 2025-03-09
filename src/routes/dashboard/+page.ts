/**
 * Client-side page loader for the dashboard.
 * Handles reactivity and data dependencies for the dashboard page.
 * @module routes/dashboard/+page
 */
import type { PageLoad } from './$types'
import { invalidate } from '$app/navigation'

/**
 * Page load function for the dashboard page
 * Sets up dependency tags for reactive invalidation
 *
 * @type {PageLoad}
 */
export const load = (({ data, depends }) => {
  depends('app:caddy-status')

  return {
    ...data,
    refresh: () => {
      invalidate('app:caddy-status')
    }
  }
}) satisfies PageLoad
