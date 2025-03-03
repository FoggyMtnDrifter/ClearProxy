<script lang="ts">
  interface Stat {
    label: string
    value: string | number
  }

  export let stats: Stat[] = []
  export let columns: 1 | 2 | 3 | 4 = 4

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
