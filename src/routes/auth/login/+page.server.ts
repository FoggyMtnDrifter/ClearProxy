/**
 * Server-side handling for the login page.
 * Manages user authentication and session creation.
 * @module routes/auth/login/+page.server
 */
import { userRepository } from '$lib/repositories/userRepository'
import { verifyPassword } from '$lib/auth/password'
import { createSession } from '$lib/auth/session'
import { fail, redirect } from '@sveltejs/kit'
import { authLogger } from '$lib/utils/logger'
import type { Actions, PageServerLoad } from './$types'

/**
 * Page load function for the login page
 * Checks if a user is already logged in and redirects to dashboard if so
 * Also determines if registration is allowed (only when no users exist)
 *
 * @type {PageServerLoad}
 */
export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(303, '/dashboard')
  }

  const userCount = await userRepository.count()
  const registrationAllowed = userCount === 0

  return {
    registrationAllowed
  }
}

/**
 * Form actions for the login page
 * Handles user authentication and session creation
 *
 * @type {Actions}
 */
export const actions = {
  /**
   * Default action that handles form submission for login
   * Validates credentials and creates a session if valid
   *
   * @param {object} params - Action parameters
   * @param {Request} params.request - The request object containing form data
   * @param {import('@sveltejs/kit').Cookies} params.cookies - Cookie access for session management
   * @returns {Promise<any>} Redirect on success or error data on failure
   */
  default: async ({ request, cookies }) => {
    const data = await request.formData()
    const email = data.get('email')
    const password = data.get('password')

    authLogger.debug({ email }, 'Login attempt received')

    if (!email || !password) {
      authLogger.warn({ email }, 'Login attempt missing required fields')
      return fail(400, { error: 'Email and password are required' })
    }

    const user = await userRepository.getByEmail(email.toString())

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
