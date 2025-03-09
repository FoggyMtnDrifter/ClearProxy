<script lang="ts">
  /**
   * Root layout component for the application.
   * Provides navigation, theme controls, and consistent layout across all pages.
   * Different layouts are shown for authenticated vs unauthenticated states.
   */
  import '../app.css'
  import { page } from '$app/stores'
  import { isMobileMenuOpen } from '$lib/stores/navigation'
  import {
    ScrollArea,
    Logo,
    ThemeToggle,
    ProfileMenu,
    MainNavigation,
    MobileMenu,
    PageHeader
  } from '$lib/components'
  import { Menu, X } from 'lucide-svelte'

  /** Whether the current page is an authentication page (login/register) */
  $: isAuthPage = $page.url.pathname.startsWith('/auth/')

  /** The current path from the URL */
  $: currentPath = $page.url.pathname

  /**
   * Main navigation items for the application
   * @type {Array<{name: string, href: string}>}
   */
  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Proxy Hosts', href: '/proxy-hosts' },
    { name: 'Audit Logs', href: '/audit-logs' }
  ]

  /** The title of the current page based on the navigation definition */
  $: currentPageTitle = navigation.find((item) => item.href === currentPath)?.name ?? 'Dashboard'

  /**
   * Toggles the visibility of the mobile navigation menu
   */
  function toggleMobileMenu() {
    $isMobileMenuOpen = !$isMobileMenuOpen
  }

  // Track profile dropdown open state
  let isProfileMenuOpen = false
</script>

{#if !isAuthPage}
  <div class="h-screen flex flex-col dark:bg-gray-900">
    <nav class="bg-gray-800 dark:bg-gray-950">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <div class="flex items-center">
            <div class="shrink-0">
              <a href="/dashboard" class="flex items-center">
                <Logo className="h-8 w-auto" />
              </a>
            </div>
            <div class="hidden md:block">
              <div class="ml-10 flex items-baseline space-x-4">
                <MainNavigation items={navigation} />
              </div>
            </div>
          </div>
          <div class="hidden md:block">
            <div class="ml-4 flex items-center space-x-3 md:ml-6">
              <ThemeToggle />

              <!-- Profile dropdown -->
              <div class="relative ml-3">
                <ProfileMenu user={$page.data.user} bind:isOpen={isProfileMenuOpen} />
              </div>
            </div>
          </div>
          <div class="-mr-2 flex md:hidden">
            <button
              type="button"
              class="relative inline-flex items-center justify-center rounded-md bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800 cursor-pointer"
              aria-controls="mobile-menu"
              aria-expanded={$isMobileMenuOpen}
              on:click={toggleMobileMenu}
            >
              <span class="absolute -inset-0.5"></span>
              <span class="sr-only">Open main menu</span>
              {#if $isMobileMenuOpen}
                <X class="size-6" />
              {:else}
                <Menu class="size-6" />
              {/if}
            </button>
          </div>
        </div>
      </div>

      <MobileMenu isOpen={$isMobileMenuOpen} navItems={navigation} user={$page.data.user} />
    </nav>

    <!-- Use the ScrollArea component to wrap the main content -->
    <ScrollArea
      height="flex-1"
      width="100%"
      scrollbarVisible={true}
      autoHide={true}
      alwaysShowScrollbar={false}
      hideDelay={1000}
      contentClass="h-full"
    >
      <main>
        <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <slot />
        </div>
      </main>
    </ScrollArea>
  </div>
{:else}
  <slot />
{/if}
