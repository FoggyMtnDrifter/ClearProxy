<script lang="ts">
  /**
   * MobileMenu component
   * Mobile navigation including app links and user profile
   */
  import { page } from '$app/stores'
  import { User, LogOut } from 'lucide-svelte'
  import ThemeToggle from '../ui/ThemeToggle.svelte'
  import UserAvatar from '../ui/UserAvatar.svelte'

  /** Whether the menu is currently visible */
  export let isOpen: boolean = false

  /**
   * Navigation items for the application
   * @type {Array<{name: string, href: string}>}
   */
  export let navItems = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Proxy Hosts', href: '/proxy-hosts' },
    { name: 'Audit Logs', href: '/audit-logs' }
  ]

  /** The current user object from $page.data.user */
  export let user: { name?: string; email?: string } | undefined | null = undefined

  /** The current path from the URL */
  $: currentPath = $page.url.pathname
</script>

<div class="md:hidden {isOpen ? '' : 'hidden'}" id="mobile-menu">
  <div class="space-y-1 px-2 pb-3 pt-2 sm:px-3">
    {#each navItems as item}
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
        <UserAvatar
          email={user?.email}
          name={user?.name}
          size={40}
          ringClass="ring-2 ring-gray-600"
        />
      </div>
      <div class="ml-3">
        <div class="text-base font-medium text-white">{user?.name || 'User'}</div>
        <div class="text-sm font-medium text-gray-300">{user?.email || ''}</div>
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
