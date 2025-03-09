<script lang="ts">
  /**
   * StatusBadge component
   * Displays a status indicator with appropriate colors
   */

  export let text: string

  export let type:
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'neutral'
    | 'indigo'
    | 'purple'
    | 'pink' = 'neutral'

  export let className: string = ''

  const colors = {
    success: 'bg-green-50 text-green-700 ring-green-600/20',
    warning: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
    error: 'bg-red-50 text-red-700 ring-red-600/10',
    info: 'bg-blue-50 text-blue-700 ring-blue-700/10',
    neutral: 'bg-gray-50 text-gray-600 ring-gray-500/10',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-700/10',
    purple: 'bg-purple-50 text-purple-700 ring-purple-700/10',
    pink: 'bg-pink-50 text-pink-700 ring-pink-700/10'
  }
</script>

<span
  class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset {colors[
    type
  ]} {className}"
>
  <slot>{text}</slot>
</span>
