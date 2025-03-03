<script lang="ts">
  /**
   * Stats component for displaying a grid of statistics.
   * Renders a responsive grid of stat cards with labels and values.
   */

  /**
   * Interface for a single statistic item
   * @interface Stat
   * @property {string} label - The label/title for the statistic
   * @property {string|number} value - The value to display for the statistic
   */
  interface Stat {
    label: string
    value: string | number
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
        {stat.value}
      </dd>
    </div>
  {/each}
</dl>
