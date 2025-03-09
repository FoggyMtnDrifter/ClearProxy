<script lang="ts">
  /**
   * Enhanced Table component with responsive design and highlighting capabilities.
   * Based on Tailwind UI table patterns.
   */

  type Component = any

  /**
   * Column configuration for the table
   * @type {Array<Object>}
   * @property {string} header - The column header text
   * @property {string} key - The data key to display in this column
   * @property {string} [class] - Optional CSS classes to apply to the column
   * @property {Function} [render] - Optional custom render function for cell content
   * @property {boolean} [hideOnMobile] - Whether to hide this column on mobile devices
   * @property {boolean} [sortable] - Whether this column is sortable
   */
  export let columns: {
    header: string
    key: string
    class?: string
    render?: (item: any) => string
    hideOnMobile?: boolean
    sortable?: boolean
  }[]

  /**
   * Data array to display in the table
   * Each item represents a row in the table
   * @type {Array<any>}
   */
  export let data: any[]

  /**
   * Title for the table header
   */
  export let title: string | undefined = undefined

  /**
   * Description text for the table header
   */
  export let description: string | undefined = undefined

  /**
   * Whether to show the header section
   */
  export let showHeader: boolean = true

  /**
   * Header action button text
   */
  export let actionText: string | undefined = undefined

  /**
   * Header action button callback
   */
  export let onActionClick: (() => void) | undefined = undefined

  /**
   * Key in the data that indicates the current/active item
   */
  export let currentItemKey: string | undefined = undefined

  /**
   * Value that matches the currentItemKey to identify the current item
   */
  export let currentItemValue: any = undefined

  /**
   * Label to display when an item is the current one
   */
  export let currentItemLabel: string = 'Current'

  /**
   * Function to determine if a row is the current selected item
   */
  export let isCurrentItem: ((item: any) => boolean) | undefined = undefined

  /**
   * Row-level actions configuration
   * Each action will be rendered as a button in the last column
   * @type {Array<Object>}
   * @property {Function} srLabel - Function that returns screen reader text for the action
   * @property {Function} onClick - Click handler for the action
   * @property {Component} component - Component to render for the action button
   * @property {Object} props - Props to pass to the action component
   * @property {Function} [isDisabled] - Optional function to determine if the action should be disabled
   * @default []
   */
  export let rowActions: {
    srLabel: (item: any) => string
    onClick: (item: any) => void
    component: Component
    props: Record<string, any>
    isDisabled?: (item: any) => boolean
  }[] = []

  /**
   * Whether to use consistent padding for all columns
   * This helps with alignment between headers and cells
   */
  export let consistentColumnPadding: boolean = false

  /**
   * Whether the table should span the full width of its container
   */
  export let fullWidth: boolean = true

  /**
   * Whether to remove horizontal padding (useful when inside a Card)
   */
  export let removeHorizontalPadding: boolean = false

  /**
   * Current sort column key
   */
  export let sortColumn: string | null = null

  /**
   * Current sort direction
   */
  export let sortDirection: 'asc' | 'desc' = 'asc'

  /**
   * Handler for when sort column or direction changes
   */
  export let onSort: ((column: string, direction: 'asc' | 'desc') => void) | undefined = undefined

  /**
   * Check if an item is the current/active item
   */
  function checkIsCurrentItem(item: any): boolean {
    if (isCurrentItem) {
      return isCurrentItem(item)
    }
    if (currentItemKey && currentItemValue !== undefined) {
      return item[currentItemKey] === currentItemValue
    }
    return false
  }

  /**
   * Generate responsive mobile summary for hidden columns
   */
  function getMobileSummary(item: any): string[] {
    return columns
      .filter((col) => col.hideOnMobile)
      .map((col) => {
        if (col.render) {
          return col.render(item).replace(/<[^>]*>/g, '') // Strip HTML if any
        }
        return item[col.key]?.toString() || ''
      })
      .filter(Boolean)
  }

  /**
   * Handle sort column click
   */
  function handleSort(column: string) {
    if (!onSort) return

    const newDirection = column === sortColumn && sortDirection === 'asc' ? 'desc' : 'asc'
    onSort(column, newDirection)
  }

  import { ChevronUp, ChevronDown } from 'lucide-svelte'
</script>

<div
  class={`${fullWidth ? 'w-full' : ''} ${removeHorizontalPadding ? '' : 'px-4 sm:px-6 lg:px-8'}`}
>
  {#if showHeader && (title || description || actionText)}
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        {#if title}
          <h1 class="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
        {/if}
        {#if description}
          <p class="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {@html description}
          </p>
        {/if}
        <slot name="description" />
      </div>
      {#if actionText && onActionClick}
        <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            class="block rounded-md bg-indigo-600 dark:bg-indigo-500 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 dark:hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-500"
            on:click={onActionClick}
          >
            {actionText}
          </button>
        </div>
      {/if}
      <slot name="header-actions" />
    </div>
  {/if}

  <div
    class={`${fullWidth ? 'w-full' : ''} ${removeHorizontalPadding ? '' : '-mx-4'} mt-8 overflow-hidden ring-1 ring-gray-300 dark:ring-gray-700 sm:mx-0 sm:rounded-lg`}
  >
    <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
      <thead>
        <tr>
          {#each columns as column, colIndex}
            <th
              scope="col"
              class={`${
                consistentColumnPadding
                  ? 'px-3 py-3.5'
                  : colIndex === 0
                    ? 'py-3.5 pl-4 pr-3 sm:pl-6'
                    : 'px-3 py-3.5'
              } text-left text-sm font-semibold text-gray-900 dark:text-gray-100 ${
                column.hideOnMobile ? 'hidden lg:table-cell' : ''
              } ${column.class || ''} ${column.sortable ? 'cursor-pointer select-none' : ''}`}
              on:click={() => column.sortable && handleSort(column.key)}
            >
              <div class="flex items-center">
                {column.header}
                {#if column.sortable && sortColumn === column.key}
                  <span class="ml-1 inline-flex items-center">
                    {#if sortDirection === 'asc'}
                      <ChevronUp class="size-4" />
                    {:else}
                      <ChevronDown class="size-4" />
                    {/if}
                  </span>
                {/if}
              </div>
            </th>
          {/each}
          {#if rowActions.length > 0}
            <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
              <span class="sr-only">Actions</span>
            </th>
          {/if}
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
        {#each data as row, i}
          {@const isCurrent = checkIsCurrentItem(row)}
          {@const mobileSummary = getMobileSummary(row)}
          <tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
            {#each columns as column, j}
              <td
                class={`${
                  consistentColumnPadding
                    ? 'px-3 py-3.5'
                    : j === 0
                      ? 'relative py-4 pl-4 pr-3 sm:pl-6'
                      : 'px-3 py-3.5'
                } text-sm ${
                  j === 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
                } ${column.hideOnMobile ? 'hidden lg:table-cell' : ''} ${column.class || ''} ${
                  i > 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''
                }`}
              >
                {#if column.key === 'status' && $$slots.status}
                  <slot name="status" {row} />
                {:else if j === 0}
                  <div class="font-medium text-gray-900 dark:text-gray-100">
                    {#if column.render}
                      {@html column.render(row)}
                    {:else}
                      {row[column.key]}
                    {/if}
                    {#if j === 0 && isCurrent}
                      <span class="ml-1 text-indigo-600 dark:text-indigo-400"
                        >({currentItemLabel})</span
                      >
                    {/if}
                  </div>
                  {#if j === 0 && mobileSummary.length > 0}
                    <div
                      class="mt-1 flex flex-col text-gray-500 dark:text-gray-400 sm:block lg:hidden"
                    >
                      {#each mobileSummary as summary, k}
                        <span>{summary}</span>
                        {#if k < mobileSummary.length - 1}
                          <span class="hidden sm:inline">·</span>
                        {/if}
                      {/each}
                    </div>
                  {/if}
                {:else if column.render}
                  {@html column.render(row)}
                {:else}
                  {row[column.key]}
                {/if}
              </td>
            {/each}
            {#if rowActions.length > 0}
              <td
                class={`relative py-3.5 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 ${
                  i > 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''
                }`}
              >
                <div class="flex justify-end">
                  {#each rowActions as action}
                    {@const isDisabled = action.isDisabled ? action.isDisabled(row) : isCurrent}
                    {#if action.component}
                      <svelte:component
                        this={action.component}
                        {...action.props}
                        on:click={() => action.onClick(row)}
                        aria-label={action.srLabel(row)}
                        disabled={isDisabled}
                      >
                        {#if action.props.children}
                          <svelte:component
                            this={action.props.children}
                            {...action.props.childrenProps}
                          />
                        {/if}
                      </svelte:component>
                    {:else}
                      <button
                        type="button"
                        class="inline-flex items-center rounded-md bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white dark:disabled:hover:bg-gray-800"
                        on:click={() => action.onClick(row)}
                        disabled={isDisabled}
                      >
                        {action.props.text || 'Select'}
                        <span class="sr-only">, {action.srLabel(row)}</span>
                      </button>
                    {/if}
                  {/each}
                </div>
                {#if isCurrent && i > 0}
                  <div
                    class="absolute -top-px left-0 right-6 h-px bg-gray-200 dark:bg-gray-700"
                  ></div>
                {/if}
              </td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
