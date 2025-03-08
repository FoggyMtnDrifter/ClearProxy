<script lang="ts">
  /**
   * Button component with various styles, sizes, and states.
   * Supports loading states, different variants, and sizes.
   */
  import { clsx } from 'clsx'
  import LoadingSpinner from './LoadingSpinner.svelte'

  /**
   * Visual styling variant of the button
   * @type {'primary' | 'secondary' | 'soft'}
   * @default 'primary'
   */
  export let variant: 'primary' | 'secondary' | 'soft' = 'primary'

  /**
   * Size of the button
   * @type {'xs' | 'sm' | 'md' | 'lg' | 'xl'}
   * @default 'md'
   */
  export let size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md'

  /**
   * HTML button type attribute
   * @type {'button' | 'submit' | 'reset'}
   * @default 'button'
   */
  export let type: 'button' | 'submit' | 'reset' = 'button'

  /**
   * Whether the button is disabled
   * @type {boolean}
   * @default false
   */
  export let disabled = false

  /**
   * Whether the button is in loading state
   * @type {boolean}
   * @default false
   */
  export let loading = false

  /**
   * Text to display when button is in loading state
   * @type {string}
   * @default ''
   */
  export let loadingText = ''

  /**
   * Additional CSS classes to apply to the button
   * @type {string}
   * @default ''
   */
  export let class_name = ''

  /** CSS classes for different button sizes */
  const sizeClasses = {
    xs: 'rounded px-2 py-1 text-xs',
    sm: 'rounded px-2 py-1 text-sm',
    md: 'rounded-md px-2.5 py-1.5 text-sm',
    lg: 'rounded-md px-3 py-2 text-sm',
    xl: 'rounded-md px-3.5 py-2.5 text-sm'
  }

  /** CSS classes for different button variants */
  const variantClasses = {
    primary:
      'bg-brand-600 text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:bg-brand-500 dark:hover:bg-brand-400 dark:focus-visible:outline-brand-500',
    secondary:
      'bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700 dark:hover:bg-gray-700',
    soft: 'bg-brand-50 text-brand-600 shadow-sm hover:bg-brand-100 dark:bg-brand-900 dark:text-brand-300 dark:hover:bg-brand-800'
  }

  /** Combined CSS classes for the button based on props */
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
