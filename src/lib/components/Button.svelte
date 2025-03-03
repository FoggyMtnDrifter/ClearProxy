<script lang="ts">
  import { clsx } from 'clsx'
  import LoadingSpinner from './LoadingSpinner.svelte'

  export let variant: 'primary' | 'secondary' | 'soft' = 'primary'
  export let size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md'
  export let type: 'button' | 'submit' | 'reset' = 'button'
  export let disabled = false
  export let loading = false
  export let loadingText = ''
  export let class_name = ''

  const sizeClasses = {
    xs: 'rounded px-2 py-1 text-xs',
    sm: 'rounded px-2 py-1 text-sm',
    md: 'rounded-md px-2.5 py-1.5 text-sm',
    lg: 'rounded-md px-3 py-2 text-sm',
    xl: 'rounded-md px-3.5 py-2.5 text-sm'
  }

  const variantClasses = {
    primary:
      'bg-brand-600 text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:bg-brand-500 dark:hover:bg-brand-400 dark:focus-visible:outline-brand-500',
    secondary:
      'bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700 dark:hover:bg-gray-700',
    soft: 'bg-brand-50 text-brand-600 shadow-sm hover:bg-brand-100 dark:bg-brand-900 dark:text-brand-300 dark:hover:bg-brand-800'
  }

  $: classes = clsx(
    'font-semibold',
    sizeClasses[size],
    variantClasses[variant],
    disabled && 'opacity-50 cursor-not-allowed',
    class_name
  )
</script>

<button
  {type}
  {disabled}
  class={classes}
  on:click
  on:mouseover
  on:mouseenter
  on:mouseleave
  on:focus
  on:blur
  {...$$restProps}
>
  {#if loading}
    <div class="flex items-center gap-2">
      <LoadingSpinner size="sm" label={loadingText || 'Loading...'} />
      {#if loadingText}
        <span>{loadingText}</span>
      {/if}
    </div>
  {:else}
    <slot />
  {/if}
</button>
