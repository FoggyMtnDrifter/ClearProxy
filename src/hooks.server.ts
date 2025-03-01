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

  // Add invalidateAll function to locals
  event.locals.invalidateAll = () => {
    return event.fetch(event.url, {
      headers: {
        'x-sveltekit-invalidate': '*'
      }
    });
  };

  const path = event.url.pathname;

  // Handle root path redirection
  if (path === '/') {
    authLogger.debug('Redirecting from root path');
    throw redirect(303, event.locals.user ? '/dashboard' : '/auth/login');
  }

  // Check if route requires authentication
  if (!publicRoutes.includes(path) && !path.startsWith('/auth/')) {
    if (!event.locals.user) {
      // Only log warning if not a redirect from login/register
      const referrer = event.request.headers.get('referer') || '';
      if (!referrer.includes('/auth/login') && !referrer.includes('/auth/register')) {
        authLogger.warn('Unauthenticated access attempt to protected route', { path });
      }
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