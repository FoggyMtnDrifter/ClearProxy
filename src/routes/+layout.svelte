<script lang="ts">
  /**
   * Root layout component for the application.
   * Provides navigation, theme controls, and consistent layout across all pages.
   * Different layouts are shown for authenticated vs unauthenticated states.
   */
  import '../app.css'
  import { page } from '$app/stores'
  import { isMobileMenuOpen } from '$lib/stores/navigation'
  import { fade } from 'svelte/transition'
  import { ScrollArea } from '$lib/components'
  import Button from '$lib/components/Button.svelte'
  import ThemeToggle from '$lib/components/ThemeToggle.svelte'
  import Logo from '$lib/components/Logo.svelte'
  import md5 from 'md5'
  import { Menu, X, User, LogOut } from 'lucide-svelte'

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

  // Toggle profile dropdown visibility
  function toggleProfileMenu() {
    isProfileMenuOpen = !isProfileMenuOpen
  }

  // Close profile dropdown when clicking outside
  function closeProfileMenu() {
    isProfileMenuOpen = false
  }

  /**
   * Click outside directive for closing dropdowns
   */
  function clickOutside(
    node: HTMLElement,
    { enabled: initialEnabled, callback }: { enabled: boolean; callback: () => void }
  ) {
    const handleOutsideClick = ({ target }: MouseEvent) => {
      if (!node.contains(target as Node) && !node.isSameNode(target as Node)) {
        callback()
      }
    }

    function update({ enabled }: { enabled: boolean }) {
      if (enabled) {
        window.addEventListener('click', handleOutsideClick)
      } else {
        window.removeEventListener('click', handleOutsideClick)
      }
    }

    update({ enabled: initialEnabled })
    return {
      update,
      destroy() {
        window.removeEventListener('click', handleOutsideClick)
      }
    }
  }

  /**
   * Generates a Gravatar URL for a user's email address
   * @param {string} email - The user's email address
   * @returns {string} URL to the user's Gravatar image
   */
  function getGravatarUrl(email: string) {
    if (!email) return ''
    const hash = md5(email.toLowerCase().trim())
    return `https://www.gravatar.com/avatar/${hash}?d=mp&s=40`
  }
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

              <!-- Profile dropdown -->
              <div
                class="relative ml-3"
                use:clickOutside={{ enabled: isProfileMenuOpen, callback: closeProfileMenu }}
              >
                <div>
                  <button
                    type="button"
                    class="relative flex max-w-xs items-center rounded-full bg-gray-700 text-sm hover:bg-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors focus:outline-none"
                    id="user-menu-button"
                    aria-expanded={isProfileMenuOpen}
                    aria-haspopup="true"
                    on:click={toggleProfileMenu}
                  >
                    <span class="sr-only">Open user menu</span>
                    {#if $page.data.user?.email}
                      <img
                        class="h-8 w-8 rounded-full ring-2 ring-gray-700 dark:ring-gray-800"
                        src={getGravatarUrl($page.data.user.email)}
                        alt="{$page.data.user.name || 'User'}'s Avatar"
                      />
                    {:else}
                      <div
                        class="h-8 w-8 rounded-full flex items-center justify-center bg-brand-600 text-white ring-2 ring-gray-700 dark:ring-gray-800"
                      >
                        {#if $page.data.user?.name}
                          {$page.data.user.name.charAt(0).toUpperCase()}
                        {:else}
                          U
                        {/if}
                      </div>
                    {/if}
                  </button>
                </div>

                {#if isProfileMenuOpen}
                  <div
                    class="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white py-2 shadow-xl border border-gray-100 focus:outline-none dark:bg-gray-800 dark:border-gray-700/30 dark:shadow-gray-950/40"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                    tabindex="-1"
                    transition:fade={{ duration: 150 }}
                  >
                    <div class="px-4 py-2 border-b border-gray-100/60 dark:border-gray-700/60">
                      <div class="text-sm font-medium text-gray-900 dark:text-white">
                        {$page.data.user?.name || 'User'}
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {$page.data.user?.email || ''}
                      </div>
                    </div>

                    <div class="py-1">
                      <a
                        href="/dashboard/profile"
                        class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50 group"
                        role="menuitem"
                        tabindex="-1"
                      >
                        <User
                          class="mr-3 size-4 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300"
                        />
                        Your Profile
                      </a>
                      <form action="/auth/logout" method="POST" class="block w-full">
                        <button
                          type="submit"
                          class="flex w-full items-center px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700/50 group"
                          role="menuitem"
                          tabindex="-1"
                        >
                          <LogOut
                            class="mr-3 size-4 text-red-500 group-hover:text-red-600 dark:text-red-400 dark:group-hover:text-red-300"
                          />
                          Sign out
                        </button>
                      </form>
                    </div>
                  </div>
                {/if}
              </div>
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
              {#if $isMobileMenuOpen}
                <X class="size-6" />
              {:else}
                <Menu class="size-6" />
              {/if}
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
          <div class="flex items-center px-5">
            <div class="flex-shrink-0">
              {#if $page.data.user?.email}
                <img
                  class="h-10 w-10 rounded-full ring-2 ring-gray-600"
                  src={getGravatarUrl($page.data.user.email).replace('s=40', 's=50')}
                  alt="{$page.data.user.name || 'User'}'s Avatar"
                />
              {:else}
                <div
                  class="h-10 w-10 rounded-full flex items-center justify-center bg-brand-600 text-white ring-2 ring-gray-600"
                >
                  {#if $page.data.user?.name}
                    {$page.data.user.name.charAt(0).toUpperCase()}
                  {:else}
                    U
                  {/if}
                </div>
              {/if}
            </div>
            <div class="ml-3">
              <div class="text-base font-medium text-white">{$page.data.user?.name || 'User'}</div>
              <div class="text-sm font-medium text-gray-300">{$page.data.user?.email || ''}</div>
            </div>
            <div class="ml-auto">
              <ThemeToggle />
            </div>
          </div>
          <div class="mt-3 space-y-1 px-2">
            <a
              href="/dashboard/profile"
              class="flex items-center rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white dark:hover:bg-gray-800"
            >
              <User class="mr-3 size-5 text-gray-400" />
              Your Profile
            </a>
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                class="flex w-full items-center text-left rounded-md px-3 py-2 text-base font-medium text-red-400 hover:bg-gray-700 hover:text-red-300 dark:hover:bg-gray-800"
              >
                <LogOut class="mr-3 size-5 text-red-400" />
                Sign out
              </button>
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
