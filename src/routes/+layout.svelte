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
  import { isMobileMenuOpen } from '$lib/stores/navigation';
  import Icon from '$lib/components/Icons.svelte';
  
  $: isAuthPage = $page.url.pathname.startsWith('/auth/');
  $: currentPath = $page.url.pathname;

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Proxy Hosts', href: '/proxy-hosts' },
    { name: 'Audit Logs', href: '/audit-logs' }
  ];

  // Get the current page title based on the path
  $: currentPageTitle = navigation.find(item => item.href === currentPath)?.name ?? 'Dashboard';

  function toggleMobileMenu() {
    $isMobileMenuOpen = !$isMobileMenuOpen;
  }
</script>

{#if !isAuthPage}
  <div class="min-h-full">
    <nav class="bg-gray-800">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <div class="flex items-center">
            <div class="shrink-0">
              <a href="/" class="text-xl font-bold text-white">ClearProxy</a>
            </div>
            <div class="hidden md:block">
              <div class="ml-10 flex items-baseline space-x-4">
                {#each navigation as item}
                  <a
                    href={item.href}
                    class="rounded-md px-3 py-2 text-sm font-medium {currentPath === item.href ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}"
                    aria-current={currentPath === item.href ? 'page' : undefined}
                  >
                    {item.name}
                  </a>
                {/each}
              </div>
            </div>
          </div>
          <div class="hidden md:block">
            <div class="ml-4 flex items-center md:ml-6">
              <form action="/auth/logout" method="POST">
                <button
                  type="submit"
                  class="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <div class="-mr-2 flex md:hidden">
            <!-- Mobile menu button -->
            <button
              type="button"
              class="relative inline-flex items-center justify-center rounded-md bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
              aria-controls="mobile-menu"
              aria-expanded={$isMobileMenuOpen}
              on:click={toggleMobileMenu}
            >
              <span class="absolute -inset-0.5"></span>
              <span class="sr-only">Open main menu</span>
              <!-- Menu open: "hidden", Menu closed: "block" -->
              <Icon type="menu" className="block size-6 {$isMobileMenuOpen ? 'hidden' : ''}" stroke={true} />
              <!-- Menu open: "block", Menu closed: "hidden" -->
              <Icon type="close" className="size-6 {$isMobileMenuOpen ? '' : 'hidden'}" stroke={true} />
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile menu -->
      <div class="md:hidden {$isMobileMenuOpen ? '' : 'hidden'}" id="mobile-menu">
        <div class="space-y-1 px-2 pb-3 pt-2 sm:px-3">
          {#each navigation as item}
            <a
              href={item.href}
              class="block rounded-md px-3 py-2 text-base font-medium {currentPath === item.href ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}"
              aria-current={currentPath === item.href ? 'page' : undefined}
            >
              {item.name}
            </a>
          {/each}
        </div>
        <div class="border-t border-gray-700 pb-3 pt-4">
          <div class="space-y-1 px-2">
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                class="block w-full text-left rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-gray-700 hover:text-white"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>

    <header class="bg-white shadow-sm">
      <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <h1 class="text-lg/6 font-semibold text-gray-900">
          <slot name="header">{currentPageTitle}</slot>
        </h1>
      </div>
    </header>

    <main>
      <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <slot />
      </div>
    </main>
  </div>
{:else}
  <slot />
{/if} 