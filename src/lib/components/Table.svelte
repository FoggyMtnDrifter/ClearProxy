<!--
  @component
  A reusable table component with support for custom columns and row actions.
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
  export let rowActions: {
    srLabel: (item: any) => string;
    onClick: (item: any) => void;
    component: ComponentType<SvelteComponent>;
    props: {
      children?: any;
      childrenProps?: Record<string, any>;
      [key: string]: any;
    };
  }[] = [];
</script>

<div class="flow-root">
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