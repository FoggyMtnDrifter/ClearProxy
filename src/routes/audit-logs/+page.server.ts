/**
 * Server-side handling for the audit logs page.
 * Loads and formats audit log entries for display.
 * @module routes/audit-logs/+page.server
 */
import type { PageServerLoad } from './$types'
import * as auditLogController from '$lib/controllers/auditLogController'

/**
 * Page load function for the audit logs page
 * Retrieves recent audit logs with associated user information
 *
 * @type {PageServerLoad}
 * @returns {Promise<{logs: object[]}>} Formatted audit log entries
 */
export const load = (async () => {
  return await auditLogController.loadAuditLogs()
}) satisfies PageServerLoad
