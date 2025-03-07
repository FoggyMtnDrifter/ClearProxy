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
  /** Access to cookie management */
  cookies: Cookies
}

/**
 * Retrieves the currently authenticated user from the session cookie
 *
 * @param {SessionEvent} event - Object containing cookie access
 * @returns {Promise<any|null>} User object if authenticated, null otherwise
 */
export async function getUserFromSession(event: SessionEvent) {
  const session = event.cookies.get('session')
  if (!session) {
    authLogger.debug('No session cookie found')
    return null
  }

  try {
    const [userId, timestamp] = session.split(':')
    if (Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000) {
      authLogger.debug({ userId }, 'Session expired')
      event.cookies.delete('session', { path: '/' })
      return null
    }

    const user = await userRepository.getById(parseInt(userId))
    if (!user) {
      authLogger.warn({ userId }, 'Session user not found in database')
      return null
    }

    authLogger.debug({ userId: user.id }, 'Session user retrieved successfully')
    return user
  } catch (error) {
    authLogger.error({ error, session }, 'Failed to parse or validate session')
    return null
  }
}

/**
 * Creates a new session for a user
 * Sets a cookie with the user ID and current timestamp
 *
 * @param {SessionEvent} event - Object containing cookie access
 * @param {number} userId - ID of the user to create session for
 */
export function createSession(event: SessionEvent, userId: number) {
  const session = `${userId}:${Date.now()}`

  event.cookies.set('session', session, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24
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
  const session = event.cookies.get('session')
  if (session) {
    try {
      const [userId] = session.split(':')
      authLogger.debug({ userId }, 'Clearing session')
    } catch (error) {
      authLogger.error({ error, session }, 'Failed to parse session during cleanup')
    }
  }
  event.cookies.delete('session', { path: '/' })
}
