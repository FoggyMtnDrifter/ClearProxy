<script lang="ts">
  /**
   * EmptyState component
   * Display when no data is available with optional action
   */
  import { createEventDispatcher } from 'svelte'
  import Button from './Button.svelte'

  /** Title for the empty state */
  export let title: string = 'No data available'

  /** Description text */
  export let description: string | undefined = undefined

  /** Icon to display (Lucide icon component) */
  export let icon: any = undefined

  /** Icon size in pixels */
  export let iconSize: number = 48

  /** Icon color */
  export let iconColor: string = 'text-gray-400 dark:text-gray-500'

  /** Action button text */
  export let actionText: string | undefined = undefined

  /** Additional CSS classes */
  export let className: string = ''

  const dispatch = createEventDispatcher<{ action: null }>()
</script>

<div class="text-center py-12 {className}">
  {#if icon}
    <div class="flex justify-center mb-4">
      <svelte:component this={icon} class="size-{iconSize} {iconColor}" />
    </div>
  {/if}

  <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
    {title}
  </h3>

  {#if description}
    <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
      {description}
    </p>
  {/if}

  {#if actionText}
    <div class="mt-6">
      <Button on:click={() => dispatch('action')} variant="primary">
        {actionText}
      </Button>
    </div>
  {/if}

  <slot />
</div>
