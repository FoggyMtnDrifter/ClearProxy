<!--
  @component
  A reusable stats component for displaying key metrics and statistics.
  Provides a responsive grid layout with consistent styling for statistical data.
  
  Features:
  - Responsive grid layout
  - Configurable number of columns
  - Consistent card styling
  - Shadow and hover effects
  - Truncation for long labels
  - Semantic HTML structure
  - Accessible markup
  - Mobile-first design
  - Dark mode support
  
  @typedef {Object} Stat
  @property {string} label - The label or title for the statistic
  @property {string | number} value - The value to display
  
  @prop {Stat[]} [stats=[]] - Array of statistics to display
  @prop {1 | 2 | 3 | 4} [columns=4] - Number of columns in the grid
  
  @example Basic Usage
  ```svelte
  <Stats
    stats={[
      { label: 'Total Users', value: 1234 },
      { label: 'Active Now', value: 56 },
      { label: 'Revenue', value: '$12,345' },
      { label: 'Conversion Rate', value: '12.3%' }
    ]}
  />
  ```
  
  @example Custom Columns
  ```svelte
  <Stats
    stats={[
      { label: 'Total Proxies', value: 42 },
      { label: 'Active Proxies', value: 38 }
    ]}
    columns={2}
  />
  ```
  
  @example Dynamic Stats
  ```svelte
  <Stats
    stats={metrics.map(metric => ({
      label: metric.name,
      value: formatMetricValue(metric.value)
    }))}
    columns={3}
  />
  ```
-->
<script lang="ts">
  interface Stat {
    label: string
    value: string | number
  }

  export let stats: Stat[] = []
  export let columns: 1 | 2 | 3 | 4 = 4

  // Map number of columns to Tailwind grid classes
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
