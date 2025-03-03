import { clearSession } from '$lib/auth/session'
import { redirect } from '@sveltejs/kit'
import { authLogger } from '$lib/logger'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async (event) => {
  const userId = event.locals.user?.id
  authLogger.info({ userId }, 'User logged out')
  clearSession(event)
  throw redirect(303, '/')
}
