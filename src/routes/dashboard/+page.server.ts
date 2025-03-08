/**
 * Server-side handling for the dashboard page.
 * Loads statistics and recent activity for display in the dashboard.
 * @module routes/dashboard/+page.server
 */
import type { PageServerLoad } from './$types'
import * as dashboardController from '$lib/controllers/dashboardController'

/**
 * Page load function for the dashboard
 * Retrieves system statistics and recent audit logs
 *
 * @type {PageServerLoad}
 * @returns {Promise<{stats: object, recentLogs: object[]}>} Dashboard data
 */
export const load = (async () => {
  return await dashboardController.loadDashboardData()
}) satisfies PageServerLoad
