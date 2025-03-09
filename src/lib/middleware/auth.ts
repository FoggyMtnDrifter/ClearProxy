/**
 * Authentication middleware.
 * Provides authentication and authorization checks for routes.
 * @module middleware/auth
 */
import { redirect } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'
import { UnauthorizedError } from '$lib/utils/errors'
import { apiLogger } from '$lib/utils/logger'
import type { User } from '$lib/models/user'

/**
 * Middleware that requires the user to be authenticated
 *
 * @param {RequestEvent} event - The request event
 * @returns {Object|undefined} Redirects if not logged in, otherwise returns undefined
 */
export function requireAuth(event: RequestEvent) {
  const { locals, route, url } = event

  const sessionId = event.cookies.get('session')
  const routeId = route.id ?? url.pathname

  if (!sessionId) {
    apiLogger.info({ path: routeId }, 'No session found for protected route')
    throw redirect(302, '/auth/login')
  }

  if (!locals.user) {
    apiLogger.info({ path: routeId }, 'Unauthenticated user attempting to access protected route')
    throw redirect(302, '/auth/login')
  }
}

/**
 * Middleware that requires the user to have admin role
 *
 * @param {RequestEvent} event - The request event
 * @throws {UnauthorizedError} If the user is not an admin
 */
export function requireAdmin(event: RequestEvent) {
  const { locals, route, url } = event

  requireAuth(event)

  const user = locals.user as User
  const routeId = route.id ?? url.pathname

  if (!user.isAdmin) {
    apiLogger.warn(
      {
        userId: user.id,
        isAdmin: user.isAdmin,
        path: routeId
      },
      'Non-admin user attempting to access admin route'
    )

    throw new UnauthorizedError('Admin access required')
  }
}

/**
 * Creates a handler that ensures a user can only access their own resources
 *
 * @param {string} paramName - The route parameter containing the resource owner ID
 * @returns {Function} Middleware function for owner validation
 */
export function requireOwnership(paramName: string = 'userId') {
  return (event: RequestEvent) => {
    const { locals, params, route, url } = event

    requireAuth(event)

    const user = locals.user as User
    const resourceOwnerId = parseInt(params[paramName] || '0', 10)

    if (isNaN(resourceOwnerId) || resourceOwnerId <= 0) {
      apiLogger.warn(
        {
          userId: user.id,
          paramName,
          paramValue: params[paramName]
        },
        'Invalid resource owner ID'
      )
      throw new UnauthorizedError('Invalid resource ID')
    }

    if (user.id === resourceOwnerId) {
      return
    }

    if (user.isAdmin) {
      return
    }

    apiLogger.warn(
      {
        userId: user.id,
        resourceOwnerId,
        paramName
      },
      'User attempting to access resource they do not own'
    )

    throw new UnauthorizedError('Access denied')
  }
}
