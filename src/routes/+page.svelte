<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="relative bg-white overflow-hidden">
  <div class="max-w-7xl mx-auto">
    <div class="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
      <main class="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
        <div class="sm:text-center lg:text-left">
          <h1 class="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span class="block xl:inline">Manage your</span>
            <span class="block text-indigo-600 xl:inline">Caddy Server</span>
          </h1>
          <p class="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
            A modern, easy-to-use interface for managing your Caddy reverse proxy through ClearProxy. Set up SSL certificates, proxy hosts, and more with just a few clicks.
          </p>
          <div class="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
            {#if $page.data.user}
              <div class="rounded-md shadow">
                <a
                  href="/dashboard"
                  class="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                >
                  Go to Dashboard
                </a>
              </div>
            {:else}
              <div class="rounded-md shadow">
                <a
                  href="/auth/register"
                  class="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                >
                  Get Started
                </a>
              </div>
              <div class="mt-3 sm:mt-0 sm:ml-3">
                <a
                  href="/auth/login"
                  class="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg md:px-10"
                >
                  Sign In
                </a>
              </div>
            {/if}
          </div>
        </div>
      </main>
    </div>
  </div>
</div>
