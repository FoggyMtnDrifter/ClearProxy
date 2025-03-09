/**
 * Server-side handling for the user profile edit page.
 * Manages user profile updates and password changes.
 * @module routes/dashboard/profile/+page.server
 */
import { userRepository } from '$lib/repositories/userRepository'
import { hashPassword, verifyPassword } from '$lib/auth/password'
import { fail, redirect } from '@sveltejs/kit'
import { authLogger } from '$lib/utils/logger'
import type { Actions, PageServerLoad } from './$types'

/**
 * Page load function for the profile edit page
 * Ensures user is logged in and provides user data
 *
 * @type {PageServerLoad}
 */
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, '/auth/login')
  }

  const userData = await userRepository.getById(locals.user.id)

  return {
    user: {
      id: locals.user.id,
      email: locals.user.email,
      name: locals.user.name,
      isAdmin: userData?.isAdmin || false
    }
  }
}

/**
 * Form actions for the profile edit page
 * Handles profile updates and password changes
 *
 * @type {Actions}
 */
export const actions = {
  /**
   * Update profile information (name and email)
   *
   * @param {object} params - Action parameters
   * @param {Request} params.request - The request object containing form data
   * @param {import('@sveltejs/kit').Locals} params.locals - The request locals object
   * @returns {Promise<any>} Success message or error data
   */
  updateProfile: async ({ request, locals }) => {
    if (!locals.user) {
      throw redirect(303, '/auth/login')
    }

    const data = await request.formData()
    const name = data.get('name')
    const email = data.get('email')

    if (!name || !email) {
      return fail(400, {
        updateProfile: true,
        error: 'Name and email are required',
        name: name?.toString(),
        email: email?.toString()
      })
    }

    if (email.toString() !== locals.user.email) {
      const existingUser = await userRepository.getByEmail(email.toString())
      if (existingUser && existingUser.id !== locals.user.id) {
        return fail(400, {
          updateProfile: true,
          error: 'Email is already in use by another account',
          name: name?.toString(),
          email: email?.toString()
        })
      }
    }

    try {
      await userRepository.update(locals.user.id, {
        name: name.toString(),
        email: email.toString()
      })

      authLogger.info({ userId: locals.user.id, email, name }, 'User profile updated successfully')

      return {
        updateProfile: true,
        success: 'Profile updated successfully'
      }
    } catch (error) {
      authLogger.error(
        {
          error,
          userId: locals.user.id,
          errorMessage: error instanceof Error ? error.message : 'unknown'
        },
        'Failed to update user profile'
      )

      return fail(500, {
        updateProfile: true,
        error: 'Failed to update profile. Please try again.',
        name: name?.toString(),
        email: email?.toString()
      })
    }
  },

  /**
   * Change user password
   *
   * @param {object} params - Action parameters
   * @param {Request} params.request - The request object containing form data
   * @param {import('@sveltejs/kit').Locals} params.locals - The request locals object
   * @returns {Promise<any>} Success message or error data
   */
  changePassword: async ({ request, locals }) => {
    if (!locals.user) {
      throw redirect(303, '/auth/login')
    }

    const data = await request.formData()
    const currentPassword = data.get('currentPassword')
    const newPassword = data.get('newPassword')
    const confirmPassword = data.get('confirmPassword')

    if (!currentPassword || !newPassword || !confirmPassword) {
      return fail(400, {
        changePassword: true,
        error: 'All password fields are required'
      })
    }

    if (newPassword.toString() !== confirmPassword.toString()) {
      return fail(400, {
        changePassword: true,
        error: 'New passwords do not match'
      })
    }

    const user = await userRepository.getById(locals.user.id)
    if (!user) {
      throw redirect(303, '/auth/login')
    }

    const isValidPassword = await verifyPassword(currentPassword.toString(), user.passwordHash)
    if (!isValidPassword) {
      return fail(400, {
        changePassword: true,
        error: 'Current password is incorrect'
      })
    }

    try {
      const passwordHash = await hashPassword(newPassword.toString())
      await userRepository.update(user.id, { passwordHash })

      authLogger.info({ userId: user.id }, 'User password changed successfully')

      return {
        changePassword: true,
        success: 'Password updated successfully'
      }
    } catch (error) {
      authLogger.error(
        {
          error,
          userId: user.id,
          errorMessage: error instanceof Error ? error.message : 'unknown'
        },
        'Failed to change user password'
      )

      return fail(500, {
        changePassword: true,
        error: 'Failed to change password. Please try again.'
      })
    }
  }
} satisfies Actions
