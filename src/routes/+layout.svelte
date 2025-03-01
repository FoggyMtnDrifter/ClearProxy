<!--
  @component
  Root layout component that provides the application shell.
  
  Features:
  - Responsive navigation bar
  - Authentication-aware menu items
  - User session management
  - Mobile-friendly design
  
  Layout structure:
  - Navigation bar with logo and menu
  - Conditional rendering based on auth state
  - Main content area with slot
-->
<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
</script>

<div class="min-h-screen bg-gray-100">
  <nav class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex">
          <div class="flex-shrink-0 flex items-center">
            <a href="/" class="text-xl font-bold text-indigo-600">Caddy Manager</a>
          </div>
          {#if $page.data.user}
            <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
              <a
                href="/dashboard"
                class={`${
                  $page.url.pathname === '/dashboard'
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Dashboard
              </a>
              <a
                href="/proxy-hosts"
                class={`${
                  $page.url.pathname === '/proxy-hosts'
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Proxy Hosts
              </a>
            </div>
          {/if}
        </div>
        <div class="hidden sm:ml-6 sm:flex sm:items-center">
          {#if $page.data.user}
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                class="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign out
              </button>
            </form>
          {:else}
            <a
              href="/auth/login"
              class="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              Sign in
            </a>
            <a
              href="/auth/register"
              class="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Sign up
            </a>
          {/if}
        </div>
      </div>
    </div>
  </nav>

  <main>
    <slot />
  </main>
</div> 