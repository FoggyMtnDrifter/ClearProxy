<script lang="ts">
  /**
   * Toggle switch component with optional label and description.
   * Provides an accessible switch control for boolean settings.
   */
  import { createEventDispatcher } from 'svelte'

  /**
   * Whether the toggle is in the on/checked state
   * @type {boolean}
   * @default false
   */
  export let checked = false

  /**
   * Label text displayed next to the toggle
   * @type {string | undefined}
   * @default undefined
   */
  export let label: string | undefined = undefined

  /**
   * Optional description text displayed below the label
   * @type {string | undefined}
   * @default undefined
   */
  export let description: string | undefined = undefined

  /**
   * Name attribute for the toggle, used for form submission and accessibility
   * @type {string | undefined}
   * @default undefined
   */
  export let name: string | undefined = undefined

  /**
   * Whether the toggle is disabled/non-interactive
   * @type {boolean}
   * @default false
   */
  export let disabled = false

  /**
   * Event dispatcher for the toggle component
   * Dispatches 'change' event with the new checked state
   */
  const dispatch = createEventDispatcher<{
    change: boolean
  }>()

  /**
   * Toggles the checked state and dispatches change event
   * Does nothing if the toggle is disabled
   */
  function toggle() {
    if (!disabled) {
      checked = !checked
      dispatch('change', checked)
    }
  }

  /**
   * Computed ID for the toggle based on the name prop
   * Used for associating labels with the toggle for accessibility
   */
  $: id = name ? `toggle-${name}` : undefined
</script>

<div class="flex items-center justify-between">
  {#if label || description}
    <span class="flex grow flex-col">
      {#if label}
        <span
          class="text-sm/6 font-medium text-gray-900 dark:text-gray-100"
          id={id ? `${id}-label` : undefined}
        >
          {label}
        </span>
      {/if}
      {#if description}
        <span
          class="text-sm text-gray-500 dark:text-gray-400"
          id={id ? `${id}-description` : undefined}
        >
          {description}
        </span>
      {/if}
    </span>
  {/if}
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-labelledby={id ? `${id}-label` : undefined}
    aria-describedby={id ? `${id}-description` : undefined}
    class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 dark:focus:ring-brand-500 dark:focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50 {checked
      ? 'bg-brand-600 dark:bg-brand-500'
      : 'bg-gray-200 dark:bg-gray-700'}"
    on:click={toggle}
    {disabled}
  >
    <span
      class="pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {checked
        ? 'translate-x-5'
        : 'translate-x-0'}"
    >
      <span
        class="absolute inset-0 flex h-full w-full items-center justify-center transition-opacity {checked
          ? 'opacity-0 duration-100 ease-out'
          : 'opacity-100 duration-200 ease-in'}"
        aria-hidden="true"
      >
        <svg class="size-3 text-gray-400" fill="none" viewBox="0 0 12 12">
          <path
            d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <span
        class="absolute inset-0 flex h-full w-full items-center justify-center transition-opacity {checked
          ? 'opacity-100 duration-200 ease-in'
          : 'opacity-0 duration-100 ease-out'}"
        aria-hidden="true"
      >
        <svg
          class="size-3 text-brand-600 dark:text-brand-500"
          fill="currentColor"
          viewBox="0 0 12 12"
        >
          <path
            d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z"
          />
        </svg>
      </span>
    </span>
  </button>
  {#if name}
    <input type="hidden" {name} value={checked ? 'true' : 'false'} />
  {/if}
</div>
