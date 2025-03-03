<script lang="ts">
  /**
   * Root layout component for the application.
   * Provides navigation, theme controls, and consistent layout across all pages.
   * Different layouts are shown for authenticated vs unauthenticated states.
   */
  import '../app.css'
  import { page } from '$app/stores'
  import { isMobileMenuOpen } from '$lib/stores/navigation'
  import Icon from '$lib/components/Icons.svelte'
  import Button from '$lib/components/Button.svelte'
  import ThemeToggle from '$lib/components/ThemeToggle.svelte'
  import Logo from '$lib/components/Logo.svelte'

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
</script>

{#if !isAuthPage}
  <div class="min-h-full dark:bg-gray-900">
    <nav class="bg-gray-800 dark:bg-gray-950">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <div class="flex items-center">
            <div class="shrink-0">
              <a href="/" class="flex items-center">
                <Logo className="h-8 w-auto" />
              </a>
            </div>
            <div class="hidden md:block">
              <div class="ml-10 flex items-baseline space-x-4">
                {#each navigation as item}
                  <a
                    href={item.href}
                    class="rounded-md px-3 py-2 text-sm font-medium {currentPath === item.href
                      ? 'bg-brand-600/15 text-brand-500 dark:bg-brand-500/20 dark:text-brand-300'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white dark:hover:bg-gray-800'}"
                    aria-current={currentPath === item.href ? 'page' : undefined}
                  >
                    {item.name}
                  </a>
                {/each}
              </div>
            </div>
          </div>
          <div class="hidden md:block">
            <div class="ml-4 flex items-center space-x-3 md:ml-6">
              <ThemeToggle />
              <form action="/auth/logout" method="POST">
                <Button
                  type="submit"
                  variant="soft"
                  size="md"
                  class_name="rounded-lg py-2 px-3 bg-gray-700/50 text-gray-200 hover:bg-gray-600 hover:text-white dark:bg-gray-800/60 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
                >
                  Sign out
                </Button>
              </form>
            </div>
          </div>
          <div class="-mr-2 flex md:hidden">
            <button
              type="button"
              class="relative inline-flex items-center justify-center rounded-md bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800"
              aria-controls="mobile-menu"
              aria-expanded={$isMobileMenuOpen}
              on:click={toggleMobileMenu}
            >
              <span class="absolute -inset-0.5"></span>
              <span class="sr-only">Open main menu</span>
              <Icon
                type="menu"
                className="block size-6 {$isMobileMenuOpen ? 'hidden' : ''}"
                stroke={true}
              />
              <Icon
                type="close"
                className="size-6 {$isMobileMenuOpen ? '' : 'hidden'}"
                stroke={true}
              />
            </button>
          </div>
        </div>
      </div>

      <div class="md:hidden {$isMobileMenuOpen ? '' : 'hidden'}" id="mobile-menu">
        <div class="space-y-1 px-2 pb-3 pt-2 sm:px-3">
          {#each navigation as item}
            <a
              href={item.href}
              class="block rounded-md px-3 py-2 text-base font-medium {currentPath === item.href
                ? 'bg-brand-600/15 text-brand-500 dark:bg-brand-500/20 dark:text-brand-300'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white dark:hover:bg-gray-800'}"
              aria-current={currentPath === item.href ? 'page' : undefined}
            >
              {item.name}
            </a>
          {/each}
        </div>
        <div class="border-t border-gray-700 pb-3 pt-4">
          <div class="space-y-1 px-2">
            <div class="mb-4">
              <ThemeToggle />
            </div>
            <form action="/auth/logout" method="POST">
              <Button
                type="submit"
                variant="soft"
                size="md"
                class_name="block w-full text-left rounded-lg py-2 px-3 bg-gray-700/50 text-gray-200 hover:bg-gray-600 hover:text-white dark:bg-gray-800/60 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
              >
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </div>
    </nav>

    <header class="bg-white shadow-sm dark:bg-gray-800 dark:shadow-gray-900/10">
      <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <h1 class="text-lg/6 font-semibold text-gray-900 dark:text-white">
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
