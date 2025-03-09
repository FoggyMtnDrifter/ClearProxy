<script lang="ts">
  /**
   * EmptyState component
   * Display when no data is available with optional action
   */
  import { createEventDispatcher } from 'svelte'
  import Button from './Button.svelte'

  export let title: string = 'No data available'

  export let description: string | undefined = undefined

  export let icon: any = undefined

  export let iconSize: number = 48

  export let iconColor: string = 'text-gray-400 dark:text-gray-500'

  export let actionText: string | undefined = undefined

  export let disabled: boolean = false

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
      <Button on:click={() => dispatch('action')} variant="primary" {disabled}>
        {actionText}
      </Button>
    </div>
  {/if}

  <slot />
</div>
