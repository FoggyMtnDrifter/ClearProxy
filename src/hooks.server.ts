import { redirect, type Handle } from '@sveltejs/kit';
import { getUserFromSession } from '$lib/auth/session';
import { authLogger } from '$lib/logger';

// List of routes that don't require authentication
const publicRoutes = ['/auth/login', '/auth/register'];

export const handle: Handle = async ({ event, resolve }) => {
  // Get user from session
  const dbUser = await getUserFromSession(event);
  
  // Map database user to the expected locals.user type
  event.locals.user = dbUser ? {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name
  } : undefined;

  const path = event.url.pathname;

  // Handle root path redirection
  if (path === '/') {
    authLogger.debug('Redirecting from root path');
    throw redirect(303, event.locals.user ? '/dashboard' : '/auth/login');
  }

  // Check if route requires authentication
  if (!publicRoutes.includes(path) && !path.startsWith('/auth/')) {
    if (!event.locals.user) {
      authLogger.warn('Unauthenticated access attempt to protected route', { path });
      throw redirect(303, '/auth/login');
    }
  }

  // Prevent authenticated users from accessing login/register pages
  if (event.locals.user && (path === '/auth/login' || path === '/auth/register')) {
    authLogger.debug('Authenticated user attempting to access auth pages', { userId: event.locals.user.id });
    throw redirect(303, '/dashboard');
  }

  const response = await resolve(event);
  return response;
}; 