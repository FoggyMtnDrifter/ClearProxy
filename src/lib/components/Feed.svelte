<!--
  @component
  A reusable feed component that displays a timeline of activities or events.
  Provides a visually appealing and accessible way to display system activities and user actions.
  
  Features:
  - Timeline visualization with connected events
  - User avatars with fallback initials
  - Color-coded action icons with visual effects
  - Detailed event information display
  - Support for deleted item details
  - Responsive design
  - Accessible markup with ARIA attributes
  - Dark mode support
  
  @typedef {Object} User
  @property {string} name - The user's display name
  @property {string} email - The user's email address
  @property {string} [avatar] - Optional URL to the user's avatar image
  
  @typedef {Object} BaseFeedItem
  @property {string} id - Unique identifier for the feed item
  @property {string} timestamp - Timestamp of when the action occurred
  @property {'create' | 'update' | 'delete'} type - Type of action performed
  @property {User} user - User who performed the action
  @property {string} entityType - Type of entity that was modified
  @property {string} [details] - Optional additional details about the action
  @property {Record<string, any>} [deletedItem] - Optional details of deleted item
  
  @prop {BaseFeedItem[]} items - Array of feed items to display
  
  @example
  ```svelte
  <Feed
    items={[
      {
        id: '1',
        timestamp: '2024-03-01T12:00:00Z',
        type: 'create',
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          avatar: '/avatars/john.jpg'
        },
        entityType: 'ProxyHost',
        details: 'Created new proxy host for example.com'
      }
    ]}
  />
  ```
-->
<script lang="ts" context="module">
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
  }

  export type FeedItem = BaseFeedItem
</script>

<script lang="ts">
  import Icon from './Icons.svelte'
  export let items: FeedItem[] = []

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

  function formatValue(value: any): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }
</script>

<!-- SVG Filter definition -->
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
            <!-- User avatar with action icon -->
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
                  <Icon type={item.type} />
                </div>
              </span>
            </div>
            <div class="min-w-0 flex-1">
              <div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  <span class="font-medium text-gray-900 dark:text-gray-100">{item.user.name}</span>
                  {getActionText(item.type, item.entityType)}
                </div>
                <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{item.timestamp}</p>
              </div>
              {#if item.details || item.deletedItem}
                <div class="mt-2 space-y-2 text-sm">
                  {#if item.details}
                    <pre
                      class="whitespace-pre-wrap rounded bg-gray-50 dark:bg-gray-900 p-3 font-mono text-xs text-gray-900 dark:text-gray-200">{item.details}</pre>
                  {/if}
                  {#if item.type === 'delete' && item.deletedItem}
                    <div
                      class="rounded border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950 p-3"
                    >
                      <h4 class="mb-2 font-medium text-red-900 dark:text-red-300">
                        Deleted Item Details:
                      </h4>
                      <pre
                        class="whitespace-pre-wrap font-mono text-xs text-red-800 dark:text-red-300">{formatValue(
                          item.deletedItem
                        )}</pre>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        </div>
      </li>
    {/each}
  </ul>
</div>
