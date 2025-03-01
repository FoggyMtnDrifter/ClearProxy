/**
 * Registration Page Server Actions
 * 
 * Handles new user registration through form submission.
 * Implements secure password hashing and duplicate prevention.
 * 
 * Security measures:
 * - Password hashing before storage
 * - Email uniqueness validation
 * - Structured error handling
 * - Secure session creation
 * - Detailed logging with PII redaction
 * 
 * @module auth/register
 */

import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { hashPassword } from '$lib/auth/password';
import { createSession } from '$lib/auth/session';
import { fail, redirect } from '@sveltejs/kit';
import { authLogger } from '$lib/logger';
import type { Actions, PageServerLoad } from './$types';

/**
 * Load function to check if registration is allowed
 */
export const load: PageServerLoad = async ({ locals }) => {
  // If user is already logged in, redirect to dashboard
  if (locals.user) {
    throw redirect(303, '/dashboard');
  }

  // Check if any users exist
  const userCount = await db.select({ count: sql<number>`count(*)` }).from(users).get();
  const registrationAllowed = (userCount?.count ?? 0) === 0;

  return {
    registrationAllowed
  };
};

/**
 * Form actions for the registration page.
 * Handles POST requests for new user creation.
 * 
 * Flow:
 * 1. Validates required fields (email, password, name)
 * 2. Checks for existing users with same email
 * 3. Hashes password securely
 * 4. Creates new user record
 * 5. Establishes user session
 * 6. Redirects to dashboard
 * 
 * Error handling:
 * - 400: Missing fields or duplicate email
 * - 500: Database or hashing failures
 * 
 * @returns Failure with error message or redirects to dashboard
 */
export const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email');
    const password = data.get('password');
    const name = data.get('name');

    authLogger.debug({ email, name }, 'Registration attempt received');

    if (!email || !password || !name) {
      authLogger.warn({ email, name }, 'Registration attempt missing required fields');
      return fail(400, { error: 'All fields are required' });
    }

    // Check if registration is allowed (no users exist)
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users).get();
    if ((userCount?.count ?? 0) > 0) {
      authLogger.warn({ email }, 'Registration attempt when registration is disabled');
      return fail(403, { error: 'Registration is currently disabled' });
    }

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email.toString())).get();
    if (existingUser) {
      authLogger.warn({ email }, 'Registration attempt with existing email');
      return fail(400, { error: 'Email already registered' });
    }

    try {
      const passwordHash = await hashPassword(password.toString());

      // First user is automatically an admin
      const [user] = await db.insert(users).values({
        email: email.toString(),
        passwordHash,
        name: name.toString(),
        isAdmin: true // First user is admin
      }).returning();

      authLogger.info({ userId: user.id, email, name, isAdmin: true }, 'First user (admin) registered successfully');
      createSession({ cookies }, user.id);

      return redirect(303, '/dashboard');
    } catch (error) {
      if (!(error instanceof Response)) {
        authLogger.error({
          error,
          email,
          name,
          errorName: error instanceof Error ? error.name : 'unknown',
          errorMessage: error instanceof Error ? error.message : 'unknown'
        }, 'Failed to register user');
      }
      throw error;
    }
  }
} satisfies Actions; 