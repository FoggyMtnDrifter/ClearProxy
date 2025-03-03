/**
 * Root layout server load function.
 * Handles user session management for all routes.
 *
 * This function:
 * - Runs on every server-side request
 * - Validates the user's session
 * - Makes user data available to all routes
 *
 * @module routes/layout.server
 */

import { getUserFromSession } from '$lib/auth/session'
import type { LayoutServerLoad } from './$types'

/**
 * Server load function that provides user session data to all routes.
 * If no valid session exists, user will be null.
 */
export const load = (async (event) => {
  const user = await getUserFromSession(event)
  return {
    user
  }
}) satisfies LayoutServerLoad
