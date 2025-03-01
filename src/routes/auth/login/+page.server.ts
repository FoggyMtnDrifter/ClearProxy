/**
 * Login Page Server Actions
 * 
 * Handles user authentication through form submission.
 * Implements secure password verification and session management.
 * 
 * Security measures:
 * - Password verification using secure hashing
 * - Generic error messages to prevent user enumeration
 * - Session-based authentication
 * - Structured logging with sensitive data redaction
 * 
 * @module auth/login
 */

import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '$lib/auth/password';
import { createSession } from '$lib/auth/session';
import { fail, redirect } from '@sveltejs/kit';
import { authLogger } from '$lib/logger';
import type { Actions } from './$types';

/**
 * Form actions for the login page.
 * Handles POST requests for user authentication.
 * 
 * Flow:
 * 1. Validates required fields (email, password)
 * 2. Checks user existence
 * 3. Verifies password
 * 4. Creates session on success
 * 5. Redirects to dashboard
 * 
 * @returns Failure with error message or redirects to dashboard
 */
export const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email');
    const password = data.get('password');

    authLogger.debug({ email }, 'Login attempt received');

    if (!email || !password) {
      authLogger.warn({ email }, 'Login attempt missing required fields');
      return fail(400, { error: 'Email and password are required' });
    }

    const user = await db.select().from(users).where(eq(users.email, email.toString())).get();

    if (!user) {
      authLogger.warn({ email }, 'Login attempt with non-existent user');
      return fail(400, { error: 'Invalid email or password' });
    }

    const isValidPassword = await verifyPassword(password.toString(), user.passwordHash);
    if (!isValidPassword) {
      authLogger.warn({ email }, 'Login attempt with invalid password');
      return fail(400, { error: 'Invalid email or password' });
    }

    authLogger.info({ userId: user.id, email }, 'User logged in successfully');
    createSession({ cookies }, user.id);

    return redirect(303, '/dashboard');
  }
} satisfies Actions; 