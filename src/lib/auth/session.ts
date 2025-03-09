/**
 * Session management module for user authentication.
 * Handles cookies-based session creation, validation, and termination.
 * @module auth/session
 */
import { userRepository } from '$lib/repositories/userRepository'
import type { Cookies } from '@sveltejs/kit'
import { authLogger } from '../utils/logger'

/**
 * Interface for objects that contain cookie functionality
 * Used to abstract the SvelteKit-specific event object
 */
interface SessionEvent {
  cookies: Cookies
}

const SESSION_COOKIE_NAME = 'session'
const SESSION_COOKIE_PATH = '/'
const SESSION_MAX_AGE = 60 * 60 * 24
const SESSION_HTTP_ONLY = true
const SESSION_SAME_SITE = 'lax'

const invalidSessionCache = new Set<string>()
const INVALID_CACHE_MAX_SIZE = 100

/**
 * Retrieves the currently authenticated user from the session cookie
 *
 * @param {SessionEvent} event - Object containing cookie access
 * @returns {Promise<any|null>} User object if authenticated, null otherwise
 */
export async function getUserFromSession(event: SessionEvent) {
  const session = event.cookies.get(SESSION_COOKIE_NAME)
  if (!session) {
    authLogger.debug('No session cookie found')
    return null
  }

  if (invalidSessionCache.has(session)) {
    authLogger.debug(
      { session: session.substring(0, 10) + '...' },
      'Using cached invalid session result'
    )
    return null
  }

  try {
    if (!session.includes(':')) {
      addToInvalidSessionCache(session)
      authLogger.warn({ session: session.substring(0, 10) + '...' }, 'Invalid session format')
      event.cookies.delete(SESSION_COOKIE_NAME, { path: SESSION_COOKIE_PATH })
      return null
    }

    const [userIdStr, timestamp] = session.split(':')

    const userId = parseInt(userIdStr)
    const sessionTime = parseInt(timestamp)

    if (isNaN(userId) || isNaN(sessionTime)) {
      addToInvalidSessionCache(session)
      authLogger.warn(
        {
          session: session.substring(0, 10) + '...',
          userIdIsNaN: isNaN(userId),
          timestampIsNaN: isNaN(sessionTime)
        },
        'Invalid session data'
      )
      event.cookies.delete(SESSION_COOKIE_NAME, { path: SESSION_COOKIE_PATH })
      return null
    }

    if (Date.now() - sessionTime > SESSION_MAX_AGE * 1000) {
      authLogger.debug({ userId }, 'Session expired')
      event.cookies.delete(SESSION_COOKIE_NAME, { path: SESSION_COOKIE_PATH })
      return null
    }

    const user = await userRepository.getById(userId)
    if (!user) {
      authLogger.warn({ userId }, 'Session user not found in database')
      event.cookies.delete(SESSION_COOKIE_NAME, { path: SESSION_COOKIE_PATH })
      return null
    }

    authLogger.debug({ userId: user.id }, 'Session user retrieved successfully')
    return user
  } catch (error) {
    authLogger.error(
      { error, session: session.substring(0, 10) + '...' },
      'Failed to parse or validate session'
    )
    addToInvalidSessionCache(session)
    return null
  }
}

/**
 * Add a session to the invalid session cache, maintaining size limit
 *
 * @private
 * @param {string} session - The invalid session string
 */
function addToInvalidSessionCache(session: string): void {
  // Prevent cache from growing too large
  if (invalidSessionCache.size >= INVALID_CACHE_MAX_SIZE) {
    // Clear a few items from the beginning
    const toDelete = [...invalidSessionCache].slice(0, 10)
    toDelete.forEach((s) => invalidSessionCache.delete(s))
  }

  invalidSessionCache.add(session)
}

/**
 * Creates a new session for a user
 * Sets a cookie with the user ID and current timestamp
 *
 * @param {SessionEvent} event - Object containing cookie access
 * @param {number} userId - ID of the user to create session for
 */
export function createSession(event: SessionEvent, userId: number) {
  if (!userId || isNaN(userId)) {
    authLogger.error({ userId }, 'Attempted to create session with invalid user ID')
    return
  }

  const session = `${userId}:${Date.now()}`

  event.cookies.set(SESSION_COOKIE_NAME, session, {
    path: SESSION_COOKIE_PATH,
    httpOnly: SESSION_HTTP_ONLY,
    sameSite: SESSION_SAME_SITE,
    maxAge: SESSION_MAX_AGE
  })

  authLogger.debug({ userId }, 'Created new session')
}

/**
 * Clears the current session
 * Deletes the session cookie
 *
 * @param {SessionEvent} event - Object containing cookie access
 */
export function clearSession(event: SessionEvent) {
  const session = event.cookies.get(SESSION_COOKIE_NAME)
  if (session) {
    try {
      const [userId] = session.split(':')
      authLogger.debug({ userId }, 'Clearing session')
    } catch (error) {
      authLogger.error(
        { error, session: session.substring(0, 10) + '...' },
        'Failed to parse session during cleanup'
      )
    }
  }
  event.cookies.delete(SESSION_COOKIE_NAME, { path: SESSION_COOKIE_PATH })
}
