<script lang="ts">
  /**
   * Stats component for displaying a grid of statistics.
   * Renders a responsive grid of stat cards with labels and values.
   */
  import { StatusBadge } from '$lib/components'
  import type { ComponentType } from 'svelte'

  /**
   * Interface for a single statistic item
   * @interface Stat
   * @property {string} label - The label/title for the statistic
   * @property {string|number} value - The value to display for the statistic
   * @property {string} [type] - Optional type for status indicators (success, warning, error, etc.)
   * @property {Object} [icon] - Optional icon configuration
   * @property {ComponentType} [icon.component] - The icon component to display
   * @property {string} [icon.color] - CSS color class for the icon
   */
  interface Stat {
    label: string
    value: string | number
    type?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'indigo' | 'purple' | 'pink'
    icon?: {
      component: ComponentType
      color?: string
    }
  }

  /**
   * Array of statistics to display
   * @type {Stat[]}
   * @default []
   */
  export let stats: Stat[] = []

  /**
   * Number of columns to display in the grid
   * Responsive breakpoints are applied based on this value
   * @type {1|2|3|4}
   * @default 4
   */
  export let columns: 1 | 2 | 3 | 4 = 4

  /**
   * Mapping of column count to Tailwind CSS grid classes
   * @type {Record<number, string>}
   */
  const gridCols = {
    1: 'grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4'
  }
</script>

<dl class="grid grid-cols-1 gap-5 {gridCols[columns]}">
  {#each stats as stat}
    <div
      class="overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 py-5 shadow ring-1 ring-black/5 dark:ring-white/10 sm:p-6"
    >
      <dt class="truncate text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</dt>
      <dd class="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
        {#if stat.type}
          <StatusBadge
            text={stat.value.toString()}
            type={stat.type}
            className="text-base px-3 py-1.5"
          />
        {:else if stat.icon}
          <div class="flex items-center">
            <svelte:component
              this={stat.icon.component}
              class="size-6 mr-2 {stat.icon.color || ''}"
            />
            <span>{stat.value}</span>
          </div>
        {:else}
          {stat.value}
        {/if}
      </dd>
    </div>
  {/each}
</dl>
