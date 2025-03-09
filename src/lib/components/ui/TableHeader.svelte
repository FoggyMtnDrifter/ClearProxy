<script lang="ts">
  /**
   * TableHeader component
   * Consistent header for tables with title, description, search and actions
   */
  import { createEventDispatcher } from 'svelte'
  import Button from './Button.svelte'
  import SearchInput from './SearchInput.svelte'
  import { Search } from 'lucide-svelte'

  export let title: string

  export let description: string | undefined = undefined

  export let showSearch: boolean = true

  export let searchPlaceholder: string = 'Search...'

  export let searchQuery: string = ''

  export let actionText: string | undefined = undefined

  export let actionDisabled: boolean = false

  const dispatch = createEventDispatcher<{ search: string; action: null }>()

  /**
   * Handle search input change
   */
  function handleSearch(event: CustomEvent<string>) {
    dispatch('search', event.detail)
  }
</script>

<div class="px-4 py-5 sm:px-6">
  <div class="flex justify-between items-center">
    <div>
      <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      {#if description}
        <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      {/if}
    </div>
    <div class="flex gap-4 items-center">
      {#if showSearch}
        <SearchInput
          bind:value={searchQuery}
          placeholder={searchPlaceholder}
          on:search={handleSearch}
          icon={Search}
        />
      {/if}

      {#if actionText}
        <Button
          variant="primary"
          size="xl"
          class_name="py-2 px-4"
          on:click={() => dispatch('action')}
          disabled={actionDisabled}
        >
          {actionText}
        </Button>
      {/if}

      <slot name="actions" />
    </div>
  </div>
</div>
