import { db } from '$lib/db'
import { users } from '$lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { verifyPassword } from '$lib/auth/password'
import { createSession } from '$lib/auth/session'
import { fail, redirect } from '@sveltejs/kit'
import { authLogger } from '$lib/logger'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(303, '/dashboard')
  }

  const userCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .get()
  const registrationAllowed = (userCount?.count ?? 0) === 0

  return {
    registrationAllowed
  }
}

export const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData()
    const email = data.get('email')
    const password = data.get('password')

    authLogger.debug({ email }, 'Login attempt received')

    if (!email || !password) {
      authLogger.warn({ email }, 'Login attempt missing required fields')
      return fail(400, { error: 'Email and password are required' })
    }

    const user = await db.select().from(users).where(eq(users.email, email.toString())).get()

    if (!user) {
      authLogger.warn({ email }, 'Login attempt with non-existent user')
      return fail(400, { error: 'Invalid email or password' })
    }

    const isValidPassword = await verifyPassword(password.toString(), user.passwordHash)
    if (!isValidPassword) {
      authLogger.warn({ email }, 'Login attempt with invalid password')
      return fail(400, { error: 'Invalid email or password' })
    }

    authLogger.info({ userId: user.id, email }, 'User logged in successfully')
    createSession({ cookies }, user.id)

    return redirect(303, '/dashboard')
  }
} satisfies Actions
