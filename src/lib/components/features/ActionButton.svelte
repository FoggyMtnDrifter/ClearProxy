<script lang="ts">
  /**
   * Action button component for use in tables, specifically designed to wrap Lucide icons.
   * Provides a consistent interface for action buttons in the Table component.
   */
  import { createEventDispatcher } from 'svelte'
  import type { SvelteComponent } from 'svelte'
  import { clsx } from 'clsx'

  // Event dispatcher
  const dispatch = createEventDispatcher()

  /**
   * The icon component to display (typically a Lucide icon)
   * @type {typeof SvelteComponent}
   */
  export let icon: typeof SvelteComponent

  /**
   * Additional CSS classes for the button
   * @type {string}
   * @default ''
   */
  export let buttonClass = ''

  /**
   * Additional CSS classes for the icon
   * @type {string}
   * @default 'size-5'
   */
  export let iconClass = 'size-5'

  /**
   * Additional props to pass to the icon component
   * @type {Record<string, any>}
   * @default {}
   */
  export let iconProps: Record<string, any> = {}

  /**
   * ARIA label for accessibility
   * @type {string}
   * @default ''
   */
  export let ariaLabel = ''

  /**
   * Whether the button is disabled
   * @type {boolean}
   * @default false
   */
  export let disabled = false

  // Determine cursor style based on disabled state and existing class
  $: hasPointerCursor = buttonClass.includes('cursor-pointer')
  $: hasNotAllowedCursor = buttonClass.includes('cursor-not-allowed')
  $: combinedButtonClass = clsx(
    buttonClass,
    !hasPointerCursor && !hasNotAllowedCursor && !disabled && 'cursor-pointer',
    disabled && !hasNotAllowedCursor && 'cursor-not-allowed opacity-70'
  )

  /**
   * Handle click event and forward it
   */
  function handleClick(e: MouseEvent) {
    if (!disabled) {
      dispatch('click', e)
    }
  }

  /**
   * Handle keydown event for keyboard accessibility
   */
  function handleKeydown(e: KeyboardEvent) {
    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      dispatch('click', new MouseEvent('click'))
    }
  }
</script>

<button
  type="button"
  class={combinedButtonClass}
  on:click={handleClick}
  on:keydown={handleKeydown}
  aria-label={ariaLabel}
  aria-disabled={disabled}
  tabindex={disabled ? -1 : 0}
>
  <svelte:component this={icon} class={iconClass} {...iconProps} />
</button>
