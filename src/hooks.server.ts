/**
 * Server hooks for the SvelteKit application.
 * Handles authentication, authorization, and routing logic for the application.
 * @module hooks.server
 */
import { redirect, type Handle } from '@sveltejs/kit'
import { getUserFromSession } from '$lib/auth/session'
import { authLogger } from '$lib/logger'

/** Routes that can be accessed without authentication */
const publicRoutes = ['/auth/login', '/auth/register']

/**
 * Handle function for SvelteKit server hooks.
 * Manages authentication state, route protection, and redirects based on user login status.
 *
 * @type {Handle}
 */
export const handle: Handle = async ({ event, resolve }) => {
  // Get user from session and add to locals
  const dbUser = await getUserFromSession(event)
  event.locals.user = dbUser
    ? {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name
      }
    : undefined

  /**
   * Helper method to invalidate all cache entries
   * Added to locals for easy access in routes
   */
  event.locals.invalidateAll = () => {
    return event.fetch(event.url, {
      headers: {
        'x-sveltekit-invalidate': '*'
      }
    })
  }

  const path = event.url.pathname

  // Root path redirect based on authentication status
  if (path === '/') {
    authLogger.debug('Redirecting from root path')
    throw redirect(303, event.locals.user ? '/dashboard' : '/auth/login')
  }

  // Protected route handling - redirect to login if not authenticated
  if (!publicRoutes.includes(path) && !path.startsWith('/auth/')) {
    if (!event.locals.user) {
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
