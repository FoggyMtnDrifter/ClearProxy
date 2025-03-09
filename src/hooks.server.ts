/**
 * Server hooks for the SvelteKit application.
 * Handles authentication, authorization, and routing logic for the application.
 * @module hooks.server
 */
import { redirect, type Handle, type Redirect } from '@sveltejs/kit'
import { getUserFromSession } from '$lib/auth/session'
import { authLogger } from '$lib/utils/logger'
import { performance } from 'node:perf_hooks'

const publicRoutes = ['/auth/login', '/auth/register']

/**
 * Handle function for SvelteKit server hooks.
 * Manages authentication state, route protection, and redirects based on user login status.
 *
 * @type {Handle}
 */
export const handle: Handle = async ({ event, resolve }) => {
  const start = performance.now()
  const path = event.url.pathname

  if (path === '/favicon.ico') {
    return await resolve(event)
  }

  const sessionId = event.cookies.get('session')
  let dbUser = undefined

  try {
    if (sessionId) {
      dbUser = await getUserFromSession(event)
      authLogger.debug('Retrieved user from session', { userId: dbUser?.id, path })
    }

    event.locals.user = dbUser
      ? {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name
        }
      : undefined

    /**
     * Helper method to invalidate SvelteKit's built-in client-side page caching
     * This is for SvelteKit's internal cache, not our backend caching (which has been removed)
     * Added to locals for easy access in routes
     */
    event.locals.invalidateAll = () => {
      return event.fetch(event.url, {
        headers: {
          'x-sveltekit-invalidate': '*'
        }
      })
    }

    try {
      if (path === '/') {
        authLogger.debug('Redirecting from root path')
        return new Response(null, {
          status: 303,
          headers: { location: event.locals.user ? '/dashboard' : '/auth/login' }
        })
      }

      if (!publicRoutes.includes(path) && !path.startsWith('/auth/')) {
        if (!event.locals.user) {
          const referrer = event.request.headers.get('referer') || ''
          if (!referrer.includes('/auth/login') && !referrer.includes('/auth/register')) {
            authLogger.warn('Unauthenticated access attempt to protected route', { path })
          }
          return new Response(null, {
            status: 303,
            headers: { location: '/auth/login' }
          })
        }
      }

      if (event.locals.user && (path === '/auth/login' || path === '/auth/register')) {
        authLogger.debug('Authenticated user attempting to access auth pages', {
          userId: event.locals.user.id
        })
        return new Response(null, {
          status: 303,
          headers: { location: '/dashboard' }
        })
      }

      const response = await resolve(event)

      const duration = performance.now() - start
      if (duration > 500) {
        authLogger.warn('Slow route detected', { path, duration: `${duration.toFixed(2)}ms` })
      }

      return response
    } catch (error) {
      if (error instanceof redirect) {
        const redirectObj = error as Redirect
        authLogger.debug('Handling redirect', { path, to: redirectObj.location })
        return new Response(null, {
          status: 303,
          headers: { location: redirectObj.location }
        })
      }

      authLogger.error({ error, path }, 'Error in route resolution')
      throw error
    }
  } catch (error) {
    authLogger.error({ error, path }, 'Unhandled error in server hooks')

    return new Response('Internal Server Error', { status: 500 })
  }
}
