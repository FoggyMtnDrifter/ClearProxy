import { db } from '$lib/db'
import { users } from '$lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { hashPassword } from '$lib/auth/password'
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
  if ((userCount?.count ?? 0) > 0) {
    throw redirect(303, '/auth/login')
  }

  return {}
}

export const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData()
    const email = data.get('email')
    const password = data.get('password')
    const name = data.get('name')

    authLogger.debug({ email, name }, 'Registration attempt received')

    if (!email || !password || !name) {
      authLogger.warn({ email, name }, 'Registration attempt missing required fields')
      return fail(400, { error: 'All fields are required' })
    }

    const userCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .get()
    if ((userCount?.count ?? 0) > 0) {
      authLogger.warn({ email }, 'Registration attempt when registration is disabled')
      return fail(403, { error: 'Registration is currently disabled' })
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toString()))
      .get()
    if (existingUser) {
      authLogger.warn({ email }, 'Registration attempt with existing email')
      return fail(400, { error: 'Email already registered' })
    }

    try {
      const passwordHash = await hashPassword(password.toString())

      const [user] = await db
        .insert(users)
        .values({
          email: email.toString(),
          passwordHash,
          name: name.toString(),
          isAdmin: true
        })
        .returning()

      authLogger.info(
        { userId: user.id, email, name, isAdmin: true },
        'First user (admin) registered successfully'
      )
      createSession({ cookies }, user.id)

      return redirect(303, '/dashboard')
    } catch (error) {
      if (error instanceof Response && error.status === 303 && error.headers.has('location')) {
        throw error
      }

      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        'location' in error &&
        error.status === 303
      ) {
        throw error
      }

      authLogger.error(
        {
          error,
          email,
          name,
          errorName: error instanceof Error ? error.name : 'unknown',
          errorMessage: error instanceof Error ? error.message : 'unknown'
        },
        'Failed to register user'
      )
      throw error
    }
  }
} satisfies Actions
