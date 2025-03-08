<script lang="ts">
  /**
   * Table component for displaying tabular data with optional row actions.
   * Supports custom column rendering and row-level actions.
   */

  /** Generic component type for action buttons */
  type Component = any

  /**
   * Column configuration for the table
   * @type {Array<Object>}
   * @property {string} header - The column header text
   * @property {string} key - The data key to display in this column
   * @property {string} [class] - Optional CSS classes to apply to the column
   * @property {Function} [render] - Optional custom render function for cell content
   */
  export let columns: {
    header: string
    key: string
    class?: string
    render?: (item: any) => string
  }[]

  /**
   * Data array to display in the table
   * Each item represents a row in the table
   * @type {Array<any>}
   */
  export let data: any[]

  /**
   * Row-level actions configuration
   * Each action will be rendered as a button in the last column
   * @type {Array<Object>}
   * @property {Function} srLabel - Function that returns screen reader text for the action
   * @property {Function} onClick - Click handler for the action
   * @property {Component} component - Component to render for the action button
   * @property {Object} props - Props to pass to the action component
   * @default []
   */
  export let rowActions: {
    srLabel: (item: any) => string
    onClick: (item: any) => void
    component: Component
    props: Record<string, any>
  }[] = []
</script>

<div class="flow-root">
  <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
    <thead>
      <tr>
        {#each columns as column}
          <th
            scope="col"
            class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-0"
          >
            {column.header}
          </th>
        {/each}
        {#if rowActions.length > 0}
          <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-0">
            <span class="sr-only">Actions</span>
          </th>
        {/if}
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
      {#each data as row}
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
          {#each columns as column}
            <td
              class={`whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 dark:text-gray-100 sm:pl-0 ${column.class || ''}`}
            >
              {#if column.key === 'status' && $$slots.status}
                <slot name="status" {row} />
              {:else if column.render}
                {@html column.render(row)}
              {:else}
                {row[column.key]}
              {/if}
            </td>
          {/each}
          {#if rowActions.length > 0}
            <td
              class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0"
            >
              <div class="flex justify-end gap-2">
                {#each rowActions as action}
                  <svelte:component
                    this={action.component}
                    {...action.props}
                    on:click={() => action.onClick(row)}
                    aria-label={action.srLabel(row)}
                  >
                    {#if action.props.children}
                      <svelte:component
                        this={action.props.children}
                        {...action.props.childrenProps}
                      />
                    {/if}
                  </svelte:component>
                {/each}
              </div>
            </td>
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
