<script lang="ts" context="module">
  /**
   * Base type for feed items, containing common properties for all activity events
   */
  export type BaseFeedItem = {
    id: string
    timestamp: string
    type: 'create' | 'update' | 'delete'
    user: {
      name: string
      email: string
      avatar?: string
    }
    entityType: string
    details?: string
    deletedItem?: Record<string, any>
    domain?: string
  }

  /**
   * Feed item type used in the component
   * Currently identical to BaseFeedItem but can be extended in the future
   */
  export type FeedItem = BaseFeedItem
</script>

<script lang="ts">
  /**
   * Feed component that displays a timeline of user activities
   * Shows chronological events with user information and action details
   */
  import { Trash2, PencilLine, Plus, History } from 'lucide-svelte'
  import { EmptyState } from '$lib/components'

  /**
   * Array of feed items to display in the timeline
   * @type {FeedItem[]}
   * @default []
   */
  export let items: FeedItem[] = []

  /**
   * Determines the appropriate color for an action type
   *
   * @param {FeedItem['type']} type - The action type
   * @returns {string} CSS class for the color
   */
  function getActionColor(type: FeedItem['type']) {
    switch (type) {
      case 'create':
        return 'text-green-500'
      case 'update':
        return 'text-blue-500'
      case 'delete':
        return 'text-red-500'
    }
  }

  /**
   * Gets the appropriate icon component based on action type
   *
   * @param {FeedItem['type']} type - The action type
   * @returns {typeof import('svelte').SvelteComponent} The icon component to use
   */
  function getActionIcon(type: FeedItem['type']) {
    switch (type) {
      case 'create':
        return Plus
      case 'update':
        return PencilLine
      case 'delete':
        return Trash2
      default:
        return Plus
    }
  }

  /**
   * Generates a human-readable description of the action
   *
   * @param {FeedItem['type']} type - The action type
   * @param {string} entityType - The type of entity modified
   * @returns {string} Description of the action
   */
  function getActionText(type: FeedItem['type'], entityType: string) {
    switch (type) {
      case 'create':
        return `created a new ${entityType.toLowerCase()}`
      case 'update':
        return `updated ${entityType.toLowerCase()}`
      case 'delete':
        return `deleted ${entityType.toLowerCase()}`
    }
  }

  /**
   * Formats a value for display in the UI
   * Handles different data types appropriately
   *
   * @param {any} value - The value to format
   * @returns {string} Formatted string representation
   */
  function formatValue(value: any): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }
</script>

<svg width="0" height="0" style="position: absolute;">
  <defs>
    <filter id="icon-stroke">
      <feFlood flood-color="white" result="flood" />
      <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="dilate" />
      <feComposite in="flood" in2="dilate" operator="in" result="stroke" />
      <feMerge>
        <feMergeNode in="stroke" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
</svg>

<div class="flow-root">
  {#if items.length > 0}
    <ul role="list" class="-mb-8">
      {#each items as item, index}
        <li>
          <div class="relative pb-8">
            {#if index !== items.length - 1}
              <span
                class="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                aria-hidden="true"
              ></span>
            {/if}
            <div class="relative flex items-start space-x-3">
              <div class="relative">
                {#if item.user.avatar}
                  <img
                    class="flex size-10 items-center justify-center rounded-full bg-gray-400 ring-8 ring-white dark:ring-gray-800"
                    src={item.user.avatar}
                    alt={item.user.name}
                  />
                {:else}
                  <div
                    class="flex size-10 items-center justify-center rounded-full bg-gray-400 ring-8 ring-white dark:ring-gray-800"
                  >
                    <span class="text-sm font-medium text-white">{item.user.name.charAt(0)}</span>
                  </div>
                {/if}
                <span class="absolute -bottom-1 -right-1">
                  <div class={getActionColor(item.type)} style="filter: url(#icon-stroke)">
                    <svelte:component this={getActionIcon(item.type)} class="size-4" />
                  </div>
                </span>
              </div>
              <div class="min-w-0 flex-1">
                <div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    <span class="font-medium text-gray-900 dark:text-gray-100"
                      >{item.user.name}</span
                    >
                    {getActionText(item.type, item.entityType)}
                    {#if item.domain}
                      <span class="text-gray-500 dark:text-gray-400">
                        {' - '}{item.domain}
                      </span>
                    {/if}
                  </div>
                  <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{item.timestamp}</p>
                </div>
                {#if item.details || item.deletedItem}
                  <div class="mt-2 space-y-2 text-sm">
                    {#if item.details}
                      <pre
                        class="whitespace-pre-wrap rounded bg-gray-50 dark:bg-gray-900 p-3 font-mono text-xs text-gray-900 dark:text-gray-200">{item.details}</pre>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <EmptyState
      title="No activity yet"
      description="Activity will show up here as you make changes"
      icon={History}
    />
  {/if}
</div>
