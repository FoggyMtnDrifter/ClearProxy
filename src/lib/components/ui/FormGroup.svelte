<script lang="ts">
  /**
   * FormGroup component
   * Provides consistent layout for grouped form inputs
   */

  export let layout: 'stack' | 'grid' | 'row' = 'stack'

  export let cols: 1 | 2 | 3 | 4 | 6 | 12 = 2

  export let gap: 2 | 3 | 4 | 5 | 6 = 4

  export let className: string = ''

  /**
   * Calculate grid classes based on columns
   */
  function getGridCols(cols: number): string {
    return `grid-cols-${cols} sm:grid-cols-${cols}`
  }
</script>

{#if layout === 'stack'}
  <div class="space-y-{gap} {className}">
    <slot />
  </div>
{:else if layout === 'grid'}
  <div class="grid grid-cols-1 gap-{gap} {getGridCols(cols)} {className}">
    <slot />
  </div>
{:else if layout === 'row'}
  <div class="flex flex-wrap gap-{gap} items-center {className}">
    <slot />
  </div>
{/if}
