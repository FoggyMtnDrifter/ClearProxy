<!--
  @component
  A reusable table component that supports sorting, custom cell rendering, and row actions.
-->
<script lang="ts">
  import type { ComponentType, SvelteComponent } from 'svelte';

  export let columns: {
    header: string;
    key: string;
    class?: string;
    render?: (item: any) => string;
  }[];
  
  export let data: any[];
  
  type RowAction = {
    label?: string;
    icon?: string;
    component?: ComponentType;
    props?: Record<string, any>;
    onClick: (item: any) => void;
    srLabel: (item: any) => string;
    class?: string;
  };
  
  export let rowActions: RowAction[] = [];
</script>

<div class="overflow-x-auto">
  <table class="min-w-full divide-y divide-gray-300">
    <thead>
      <tr>
        {#each columns as column}
          <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
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
    <tbody class="divide-y divide-gray-200">
      {#each data as item}
        <tr>
          {#each columns as column}
            <td class={`whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-0 ${column.class || ''}`}>
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
                  <button
                    type="button"
                    on:click={() => action.onClick(item)}
                    class={action.class || ''}
                    aria-label={action.srLabel(item)}
                  >
                    {#if action.component}
                      <svelte:component this={action.component} {...action.props} />
                    {:else if action.icon}
                      {@html action.icon}
                    {:else}
                      {action.label}
                    {/if}
                  </button>
                {/each}
              </div>
            </td>
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>
</div> 