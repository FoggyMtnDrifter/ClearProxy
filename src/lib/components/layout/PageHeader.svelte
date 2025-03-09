<script lang="ts">
  /**
   * PageHeader component
   * Consistent header for pages with optional actions slot
   */

  export let title: string

  export let className: string = ''
</script>

<header class="bg-white shadow-sm dark:bg-gray-800 dark:shadow-gray-900/10 {className}">
  <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center">
      <h1 class="text-lg/6 font-semibold text-gray-900 dark:text-white">
        {title}
      </h1>
      {#if $$slots.actions}
        <div class="flex items-center space-x-3">
          <slot name="actions" />
        </div>
      {/if}
    </div>
  </div>
</header>
