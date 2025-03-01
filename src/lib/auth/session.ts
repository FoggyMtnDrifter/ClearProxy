/**
 * Session Management Module
 * 
 * Handles user session lifecycle using secure HTTP-only cookies.
 * Sessions are valid for 24 hours and include:
 * - User ID
 * - Timestamp for expiration checking
 * - Secure cookie settings for production
 * 
 * @module auth/session
 */

import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { authLogger } from '../logger';

/**
 * Minimum interface required for session operations.
 * Extracted from SvelteKit's RequestEvent for simplicity.
 */
interface SessionEvent {
  cookies: Cookies;
}

/**
 * Retrieves and validates the user from the current session.
 * 
 * This function:
 * - Checks for session cookie existence
 * - Validates session timestamp (24 hour expiry)
 * - Retrieves associated user from database
 * - Handles cleanup of invalid/expired sessions
 * 
 * @param event - Event containing cookies for session access
 * @returns Promise resolving to the user object if session is valid, null otherwise
 */
export async function getUserFromSession(event: SessionEvent) {
  const session = event.cookies.get('session');
  if (!session) {
    authLogger.debug('No session cookie found');
    return null;
  }

  try {
    const [userId, timestamp] = session.split(':');
    // Check if session is expired (24 hours)
    if (Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000) {
      authLogger.debug({ userId }, 'Session expired');
      event.cookies.delete('session', { path: '/' });
      return null;
    }

    const [user] = await db.select().from(users).where(eq(users.id, parseInt(userId)));
    if (!user) {
      authLogger.warn({ userId }, 'Session user not found in database');
      return null;
    }

    authLogger.debug({ userId: user.id }, 'Session user retrieved successfully');
    return user;
  } catch (error) {
    authLogger.error({ error, session }, 'Failed to parse or validate session');
    return null;
  }
}

/**
 * Creates a new session for a user.
 * 
 * Sets a secure HTTP-only cookie with:
 * - User ID and timestamp
 * - 24 hour expiration
 * - Strict same-site policy
 * - Secure flag in production
 * 
 * @param event - Event containing cookies for session creation
 * @param userId - ID of the user to create session for
 */
export function createSession(event: SessionEvent, userId: number) {
  const session = `${userId}:${Date.now()}`;
  event.cookies.set('session', session, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 // 24 hours
  });
  authLogger.debug({ userId }, 'Created new session');
}

/**
 * Clears the current session.
 * 
 * Removes the session cookie and logs the operation.
 * 
 * @param event - Event containing cookies for session removal
 */
export function clearSession(event: SessionEvent) {
  const session = event.cookies.get('session');
  if (session) {
    try {
      const [userId] = session.split(':');
      authLogger.debug({ userId }, 'Clearing session');
    } catch (error) {
      authLogger.error({ error, session }, 'Failed to parse session during cleanup');
    }
  }
  event.cookies.delete('session', { path: '/' });
} 