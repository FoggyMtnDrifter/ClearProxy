<script lang="ts">
  /**
   * SearchInput component
   * A standard search input field with optional debouncing
   */
  import { createEventDispatcher } from 'svelte'

  export let placeholder: string = 'Search...'

  export let value: string = ''

  export let debounceMs: number = 300

  export let className: string = ''

  export let size: 'sm' | 'md' | 'lg' = 'md'

  export let icon: typeof import('lucide-svelte').Search | null = null

  const dispatch = createEventDispatcher<{ search: string; input: string }>()
  let timeout: ReturnType<typeof setTimeout>

  const sizeClasses = {
    sm: 'py-1.5 px-3 text-xs',
    md: 'py-2 px-4 text-sm',
    lg: 'py-2.5 px-4 text-base'
  }

  /**
   * Handles input events with debouncing
   */
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement
    const newValue = target.value

    dispatch('input', newValue)

    clearTimeout(timeout)
    timeout = setTimeout(() => {
      dispatch('search', newValue)
    }, debounceMs)
  }

  /**
   * Clean up timeout on component destruction
   */
  function onDestroy() {
    clearTimeout(timeout)
  }
</script>

<svelte:window on:beforeunload={onDestroy} />

<div class="relative {className}">
  {#if icon}
    <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
      <svelte:component this={icon} class="size-4 text-gray-400 dark:text-gray-500" />
    </div>
  {/if}

  <input
    type="text"
    bind:value
    on:input={handleInput}
    {placeholder}
    class="block w-full rounded-md border-0 {sizeClasses[size]} {icon
      ? 'pl-10'
      : ''} text-gray-900 dark:text-gray-100 dark:bg-gray-700 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-brand-600 dark:focus:ring-brand-500 sm:leading-6"
  />
</div>
