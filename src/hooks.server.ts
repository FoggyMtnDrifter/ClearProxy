/**
 * Server-side hooks for SvelteKit application.
 * Handles authentication, session management, and route protection.
 * @module hooks.server
 */

import { redirect, type Handle } from '@sveltejs/kit'
import { getUserFromSession } from '$lib/auth/session'
import { authLogger } from '$lib/logger'

/** Routes that can be accessed without authentication */
const publicRoutes = ['/auth/login', '/auth/register']

/**
 * Main server-side hook for handling requests.
 * Implements authentication middleware, session management, and route protection.
 *
 * @type {Handle}
 * @param {Object} params - Hook parameters
 * @param {import('@sveltejs/kit').RequestEvent} params.event - The request event
 * @param {Function} params.resolve - Function to resolve the request
 * @returns {Promise<Response>} The response object
 */
export const handle: Handle = async ({ event, resolve }) => {
  // Get user from session
  const dbUser = await getUserFromSession(event)

  // Map database user to the expected locals.user type
  event.locals.user = dbUser
    ? {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name
      }
    : undefined

  // Add invalidateAll function to locals for cache invalidation
  event.locals.invalidateAll = () => {
    return event.fetch(event.url, {
      headers: {
        'x-sveltekit-invalidate': '*'
      }
    })
  }

  const path = event.url.pathname

  // Handle root path redirection based on authentication status
  if (path === '/') {
    authLogger.debug('Redirecting from root path')
    throw redirect(303, event.locals.user ? '/dashboard' : '/auth/login')
  }

  // Protect non-public routes with authentication
  if (!publicRoutes.includes(path) && !path.startsWith('/auth/')) {
    if (!event.locals.user) {
      // Only log warning if not a redirect from login/register
      const referrer = event.request.headers.get('referer') || ''
      if (!referrer.includes('/auth/login') && !referrer.includes('/auth/register')) {
        authLogger.warn('Unauthenticated access attempt to protected route', { path })
      }
      throw redirect(303, '/auth/login')
    }
  }

  // Prevent authenticated users from accessing auth pages
  if (event.locals.user && (path === '/auth/login' || path === '/auth/register')) {
    authLogger.debug('Authenticated user attempting to access auth pages', {
      userId: event.locals.user.id
    })
    throw redirect(303, '/dashboard')
  }

  const response = await resolve(event)
  return response
}
