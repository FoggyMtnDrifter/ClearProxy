<script lang="ts">
  /**
   * Card component
   * A consistent card container for content with optional header
   */

  export let title: string | undefined = undefined

  export let description: string | undefined = undefined

  export let className: string = ''

  export let padding: string = 'px-4 py-5 sm:px-6'

  export let shadow: boolean = true
</script>

<div
  class="overflow-hidden bg-white dark:bg-gray-800 {shadow
    ? 'shadow dark:shadow-gray-900/10'
    : ''} sm:rounded-lg {className}"
>
  {#if title}
    <div class="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700/40">
      <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      {#if description}
        <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      {/if}
    </div>
  {/if}
  <div class={padding}>
    <slot />
  </div>
</div>
