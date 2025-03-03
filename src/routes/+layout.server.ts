/**
 * Server-side layout loader for SvelteKit.
 * Loads user data for all routes in the application.
 * @module routes/+layout.server
 */
import { getUserFromSession } from '$lib/auth/session'
import type { LayoutServerLoad } from './$types'

/**
 * Layout load function that runs on the server for all routes
 * Loads the current user from the session to make it available in all pages
 *
 * @type {LayoutServerLoad}
 */
export const load = (async (event) => {
  const user = await getUserFromSession(event)
  return {
    user
  }
}) satisfies LayoutServerLoad
