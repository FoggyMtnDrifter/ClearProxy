/**
 * Session Management Module
 *
 * Provides secure user session management using HTTP-only cookies.
 * Implements a stateless session mechanism with built-in security features.
 *
 * Features:
 * - Secure HTTP-only cookies
 * - 24-hour session expiration
 * - Stateless session design (no server-side storage)
 * - Automatic cleanup of expired sessions
 * - Database validation of session users
 * - Comprehensive error handling and logging
 * - TypeScript type safety
 *
 * Security Measures:
 * - HTTP-only cookies prevent XSS attacks
 * - Same-site policy prevents CSRF attacks
 * - Secure flag in production ensures HTTPS
 * - Session expiration limits exposure
 * - User validation on every request
 *
 * @module auth/session
 */

import { db } from '$lib/db'
import { users } from '$lib/db/schema'
import { eq } from 'drizzle-orm'
import type { Cookies } from '@sveltejs/kit'
import { authLogger } from '../logger'

/**
 * Minimum interface required for session operations.
 * Extracted from SvelteKit's RequestEvent for type safety and simplicity.
 *
 * @interface SessionEvent
 * @property {Cookies} cookies - SvelteKit's cookie handling interface
 */
interface SessionEvent {
  cookies: Cookies
}

/**
 * Retrieves and validates the user from the current session.
 * Implements the core session validation logic with security checks.
 *
 * Process:
 * 1. Check for session cookie existence
 * 2. Parse user ID and timestamp
 * 3. Validate session age (24-hour expiry)
 * 4. Retrieve and validate user from database
 * 5. Clean up invalid/expired sessions
 *
 * @param {SessionEvent} event - Event containing cookies for session access
 * @returns {Promise<{id: number, email: string, name: string} | null>} User object if session is valid, null otherwise
 *
 * @example
 * ```typescript
 * const user = await getUserFromSession(event);
 * if (user) {
 *   console.log('Authenticated user:', user.name);
 * } else {
 *   console.log('No valid session found');
 * }
 * ```
 */
export async function getUserFromSession(event: SessionEvent) {
  const session = event.cookies.get('session')
  if (!session) {
    authLogger.debug('No session cookie found')
    return null
  }

  try {
    const [userId, timestamp] = session.split(':')
    // Check if session is expired (24 hours)
    if (Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000) {
      authLogger.debug({ userId }, 'Session expired')
      event.cookies.delete('session', { path: '/' })
      return null
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(userId)))
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
 * Creates a new session for a user.
 * Sets a secure HTTP-only cookie with session data.
 *
 * Cookie Configuration:
 * - Format: `${userId}:${timestamp}`
 * - HTTP-only: Prevents JavaScript access
 * - Same-site: Prevents CSRF attacks
 * - Max age: 24 hours
 * - Secure: HTTPS only in production
 *
 * @param {SessionEvent} event - Event containing cookies for session creation
 * @param {number} userId - ID of the user to create session for
 *
 * @example
 * ```typescript
 * // After successful login
 * createSession(event, user.id);
 * ```
 */
export function createSession(event: SessionEvent, userId: number) {
  const session = `${userId}:${Date.now()}`

  event.cookies.set('session', session, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 // 24 hours
  })
  authLogger.debug({ userId }, 'Created new session')
}

/**
 * Clears the current session.
 * Safely removes the session cookie and logs the operation.
 *
 * Use Cases:
 * - User logout
 * - Session invalidation
 * - Security breach response
 *
 * @param {SessionEvent} event - Event containing cookies for session removal
 *
 * @example
 * ```typescript
 * // Handle user logout
 * clearSession(event);
 * redirect(303, '/auth/login');
 * ```
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
