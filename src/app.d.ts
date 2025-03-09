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
       * Function to invalidate all SvelteKit cache entries.
       * Useful for clearing cached data after mutations.
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
