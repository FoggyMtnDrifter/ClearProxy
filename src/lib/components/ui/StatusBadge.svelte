<script lang="ts">
  /**
   * StatusBadge component
   * Displays a status indicator with appropriate colors
   */

  /** The status text to display */
  export let text: string

  /** The status type which determines colors */
  export let type: 'success' | 'warning' | 'error' | 'info' | 'neutral' = 'neutral'

  /** Whether the badge should be a pill shape */
  export let pill: boolean = true

  /** Size of the badge */
  export let size: 'xs' | 'sm' | 'md' = 'xs'

  /** Additional CSS classes */
  export let className: string = ''

  // Color mappings for different status types
  const colors = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  }

  // Size mappings
  const sizes = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-0.5 text-sm',
    md: 'px-3 py-1 text-sm'
  }
</script>

<span
  class="inline-flex font-medium {pill ? 'rounded-full' : 'rounded'} {sizes[size]} {colors[
    type
  ]} {className}"
>
  <slot>{text}</slot>
</span>
