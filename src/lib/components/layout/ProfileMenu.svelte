<script lang="ts">
  /**
   * ProfileMenu component
   * Displays user profile menu with toggle and dropdown
   */
  import { fade } from 'svelte/transition'
  import { User, LogOut } from 'lucide-svelte'
  import UserAvatar from '../ui/UserAvatar.svelte'

  /** The current user object from $page.data.user */
  export let user: { name?: string; email?: string } | undefined | null = undefined

  /** Whether the menu is currently open */
  export let isOpen: boolean = false

  /**
   * Click outside directive for closing the dropdown
   */
  function clickOutside(
    node: HTMLElement,
    { enabled, callback }: { enabled: boolean; callback: () => void }
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

    update({ enabled })
    return {
      update,
      destroy() {
        window.removeEventListener('click', handleOutsideClick)
      }
    }
  }

  /** Toggles the profile menu visibility */
  function toggleMenu() {
    isOpen = !isOpen
  }

  /** Closes the profile menu */
  function closeMenu() {
    isOpen = false
  }
</script>

<div class="relative" use:clickOutside={{ enabled: isOpen, callback: closeMenu }}>
  <button
    type="button"
    class="relative flex max-w-xs items-center rounded-full bg-gray-700 text-sm hover:bg-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors focus:outline-none cursor-pointer"
    id="user-menu-button"
    aria-expanded={isOpen}
    aria-haspopup="true"
    on:click={toggleMenu}
  >
    <span class="sr-only">Open user menu</span>
    <UserAvatar email={user?.email} name={user?.name} size={32} />
  </button>

  {#if isOpen}
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
          {user?.name || 'User'}
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
          {user?.email || ''}
        </div>
      </div>

      <div class="py-1">
        <a
          href="/dashboard/profile"
          class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50 group cursor-pointer"
          role="menuitem"
          tabindex="-1"
          on:click={closeMenu}
        >
          <User
            class="mr-3 size-4 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300"
          />
          Your Profile
        </a>
        <form action="/auth/logout" method="POST" class="block w-full">
          <button
            type="submit"
            class="flex w-full items-center px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700/50 group cursor-pointer"
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
