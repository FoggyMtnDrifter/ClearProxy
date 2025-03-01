/**
 * Logout Endpoint
 * 
 * Handles user logout by clearing the session.
 * Implements secure session termination and cleanup.
 * 
 * Features:
 * - Session cookie removal
 * - Audit logging
 * - Redirect to home page
 * 
 * @module auth/logout
 */

import { clearSession } from '$lib/auth/session';
import { redirect } from '@sveltejs/kit';
import { authLogger } from '$lib/logger';
import type { RequestHandler } from './$types';

/**
 * POST handler for logout requests.
 * Clears the user's session and redirects to home page.
 * 
 * @throws {Redirect} 303 redirect to home page
 */
export const POST: RequestHandler = async (event) => {
  const userId = event.locals.user?.id;
  authLogger.info({ userId }, 'User logged out');
  clearSession(event);
  throw redirect(303, '/');
}; 