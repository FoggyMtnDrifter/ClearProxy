<script lang="ts">
  /**
   * @component RootPage
   * @description Root/index page of the application
   *
   * This page includes both server-side redirection via hooks.server.ts
   * and a client-side fallback redirect to ensure users are properly redirected
   * from the root page to the dashboard or login page based on authentication status.
   */
  import { browser } from '$app/environment'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'

  // Client-side redirect as a fallback in case server redirect doesn't trigger
  if (browser) {
    // Check if user is authenticated by examining the page data
    const isAuthenticated = !!$page.data.user
    // Redirect to the appropriate page
    goto(isAuthenticated ? '/dashboard' : '/auth/login')
  }
</script>

<div class="flex items-center justify-center h-screen">
  <p>Redirecting...</p>
</div>
