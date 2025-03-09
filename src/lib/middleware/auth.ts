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

const recentAuthChecks = new Map<string, { userId: number; timestamp: number }>()
const AUTH_CACHE_TTL = 3000 // 3 seconds cache TTL (reduced from 5s)
const AUTH_CACHE_MAX_SIZE = 500 // Reduced max cache size

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

  const cacheKey = `${sessionId}:${routeId}`
  const cachedAuth = recentAuthChecks.get(cacheKey)

  if (cachedAuth && Date.now() - cachedAuth.timestamp < AUTH_CACHE_TTL) {
    return
  }

  if (!locals.user) {
    apiLogger.info({ path: routeId }, 'Unauthenticated user attempting to access protected route')
    throw redirect(302, '/auth/login')
  }

  updateAuthCache(cacheKey, (locals.user as User).id)
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

  const cacheKey = `admin:${user.id}:${routeId}`
  const cachedAuth = recentAuthChecks.get(cacheKey)

  if (cachedAuth && Date.now() - cachedAuth.timestamp < AUTH_CACHE_TTL) {
    return
  }

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

  updateAuthCache(cacheKey, user.id)
}

/**
 * Updates the auth cache, maintaining maximum size
 *
 * @private
 * @param {string} cacheKey - The cache key
 * @param {number} userId - The authenticated user ID
 */
function updateAuthCache(cacheKey: string, userId: number): void {
  if (recentAuthChecks.size >= AUTH_CACHE_MAX_SIZE) {
    const keysToDelete = [...recentAuthChecks.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, Math.floor(AUTH_CACHE_MAX_SIZE * 0.1))
      .map(([key]) => key)

    keysToDelete.forEach((key) => recentAuthChecks.delete(key))
  }

  recentAuthChecks.set(cacheKey, {
    userId,
    timestamp: Date.now()
  })
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
      const routeId = route.id ?? url.pathname
      const cacheKey = `admin-access:${user.id}:${resourceOwnerId}:${routeId}`

      updateAuthCache(cacheKey, user.id)
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
