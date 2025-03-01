<!--
  @component
  A reusable table component with support for custom columns and row actions.
  Provides a flexible and accessible way to display tabular data with customizable rendering and actions.
  
  Features:
  - Custom column definitions with optional rendering functions
  - Row actions with icon buttons or direct components
  - Responsive design
  - Accessible table structure
  - Support for HTML content in cells
  - Custom styling per column
  - Right-aligned action buttons
  - Screen reader friendly labels
  - Dark mode support
  
  @typedef {Object} Column
  @property {string} header - The column header text
  @property {string} key - The key to access data from row items
  @property {string} [class] - Optional CSS classes for the column
  @property {(item: any) => string} [render] - Optional function to customize cell rendering
  
  @typedef {Object} RowAction
  @property {(item: any) => string} srLabel - Function to generate screen reader label
  @property {(item: any) => void} onClick - Click handler for the action
  @property {any} component - Svelte component to render the action button
  @property {Object} props - Props to pass to the action component
  @property {any} [props.children] - Optional child component for nested components
  @property {Object} [props.childrenProps] - Props for child component
  
  @prop {Column[]} columns - Array of column definitions
  @prop {any[]} data - Array of data items to display
  @prop {RowAction[]} [rowActions=[]] - Array of row actions
  
  @example
  ```svelte
  <Table
    columns={[
      { header: 'Name', key: 'name' },
      { 
        header: 'Status', 
        key: 'status',
        class: 'text-right',
        render: (item) => `<span class="text-${item.status === 'active' ? 'green' : 'red'}-500">
          ${item.status}
        </span>`
      }
    ]}
    data={users}
    rowActions={[
      {
        srLabel: (item) => `Edit ${item.name}`,
        onClick: (item) => handleEdit(item),
        component: Button,
        props: {
          variant: 'icon',
          children: Icon,
          childrenProps: { type: 'edit' }
        }
      },
      // Or use a direct component:
      {
        srLabel: (item) => `Delete ${item.name}`,
        onClick: (item) => handleDelete(item),
        component: Icon,
        props: {
          type: 'delete',
          className: 'text-red-500 cursor-pointer'
        }
      }
    ]}
  />
  ```
-->
<script lang="ts">
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Component = any;

  export let columns: {
    header: string;
    key: string;
    class?: string;
    render?: (item: any) => string;
  }[];
  
  export let data: any[];
  export let rowActions: {
    srLabel: (item: any) => string;
    onClick: (item: any) => void;
    component: Component;
    props: Record<string, any>;
  }[] = [];
</script>

<div class="flow-root">
  <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
    <thead>
      <tr>
        {#each columns as column}
          <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-0">
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
      {#each data as item}
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
          {#each columns as column}
            <td class={`whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 dark:text-gray-100 sm:pl-0 ${column.class || ''}`}>
              {#if column.render}
                {@html column.render(item)}
              {:else}
                {item[column.key]}
              {/if}
            </td>
          {/each}
          {#if rowActions.length > 0}
            <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
              <div class="flex justify-end gap-2">
                {#each rowActions as action}
                  <svelte:component
                    this={action.component}
                    {...action.props}
                    on:click={() => action.onClick(item)}
                    aria-label={action.srLabel(item)}
                  >
                    {#if action.props.children}
                      <svelte:component this={action.props.children} {...action.props.childrenProps} />
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