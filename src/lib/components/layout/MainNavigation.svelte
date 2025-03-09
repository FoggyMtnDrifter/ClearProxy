<script lang="ts">
  /**
   * MainNavigation component
   * Displays the main navigation links
   */
  import { page } from '$app/stores'

  /**
   * Navigation items for the application
   * @type {Array<{name: string, href: string}>}
   */
  export let items = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Proxy Hosts', href: '/proxy-hosts' },
    { name: 'Audit Logs', href: '/audit-logs' }
  ]

  $: currentPath = $page.url.pathname
</script>

<div class="flex items-baseline space-x-4">
  {#each items as item}
    <a
      href={item.href}
      class="rounded-md px-3 py-2 text-sm font-medium cursor-pointer {currentPath === item.href
        ? 'bg-brand-600/15 text-brand-500 dark:bg-brand-500/20 dark:text-brand-300'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white dark:hover:bg-gray-800'}"
      aria-current={currentPath === item.href ? 'page' : undefined}
    >
      {item.name}
    </a>
  {/each}
</div>
