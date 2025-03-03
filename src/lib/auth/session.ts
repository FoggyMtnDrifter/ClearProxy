import { db } from '$lib/db'
import { users } from '$lib/db/schema'
import { eq } from 'drizzle-orm'
import type { Cookies } from '@sveltejs/kit'
import { authLogger } from '../logger'

interface SessionEvent {
  cookies: Cookies
}

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
