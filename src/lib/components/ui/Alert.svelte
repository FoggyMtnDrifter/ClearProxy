<script lang="ts">
  /**
   * Alert component for displaying various types of messages.
   * Renders a visually distinct notification with optional details.
   * Supports error, warning, and info alert types.
   */
  import { CircleX, AlertTriangle, Info } from 'lucide-svelte'

  export let type: 'error' | 'warning' | 'info' = 'error'

  /**
   * The main alert title to display
   * @type {string}
   */
  export let title: string

  /**
   * Optional additional message about the alert
   * @type {string|undefined}
   * @default undefined
   */
  export let message: string | undefined = undefined

  $: alertConfig = {
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      iconColor: 'text-red-500 dark:text-red-400',
      titleColor: 'text-red-800 dark:text-red-300',
      textColor: 'text-red-700 dark:text-red-300/80',
      icon: CircleX
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-700/20',
      iconColor: 'text-yellow-500 dark:text-yellow-400',
      titleColor: 'text-yellow-800 dark:text-yellow-300',
      textColor: 'text-yellow-700 dark:text-yellow-300/80',
      icon: AlertTriangle
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-500 dark:text-blue-400',
      titleColor: 'text-blue-800 dark:text-blue-300',
      textColor: 'text-blue-700 dark:text-blue-300/80',
      icon: Info
    }
  }

  $: config = alertConfig[type]
</script>

<div class={`rounded-md ${config.bg} p-4`}>
  <div class="flex">
    <div class="shrink-0">
      <svelte:component this={config.icon} class={`size-5 ${config.iconColor}`} />
    </div>
    <div class="ml-3">
      <h3 class={`text-sm font-medium ${config.titleColor}`}>{title}</h3>
      {#if message}
        <div class={`mt-2 text-sm ${config.textColor}`}>
          <p>{message}</p>
        </div>
      {/if}
    </div>
  </div>
</div>
