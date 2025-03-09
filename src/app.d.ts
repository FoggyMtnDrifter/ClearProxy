/**
 * Global type declarations for the SvelteKit application.
 * Extends the App namespace with custom types for the application.
 */
declare global {
  namespace App {
    /**
     * Local variables available in SvelteKit's server-side hooks and endpoints.
     * Contains user session information and utility functions.
     */
    interface Locals {
      /**
       * Currently authenticated user information.
       * Undefined if no user is authenticated.
       */
      user?: {
        id: number
        email: string
        name: string
      }
      /**
       * Function to invalidate SvelteKit's built-in client-side page caching.
       * This is used to refresh UI after data changes, not related to our backend.
       */
      invalidateAll?: () => void
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
    // interface Session {}
    // interface Stuff {}
  }
}

export {}
