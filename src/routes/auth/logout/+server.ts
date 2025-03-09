/**
 * Server-side handling for user logout.
 * Provides an API endpoint for clearing user sessions.
 * @module routes/auth/logout/+server
 */
import { clearSession } from '$lib/auth/session'
import { redirect } from '@sveltejs/kit'
import { authLogger } from '$lib/utils/logger'
import type { RequestHandler } from './$types'

/**
 * POST handler for user logout
 * Clears the user session and redirects to the home page
 *
 * @type {RequestHandler}
 */
export const POST: RequestHandler = async (event) => {
  const userId = event.locals.user?.id
  authLogger.info({ userId }, 'User logged out')
  clearSession(event)
  throw redirect(303, '/')
}
