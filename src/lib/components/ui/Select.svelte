<script lang="ts">
  /**
   * Custom select/dropdown component with support for keyboard navigation.
   * Provides a styled alternative to the native select element with better customization.
   */
  import { createEventDispatcher } from 'svelte'
  import { fade } from 'svelte/transition'
  import { clickOutside } from '$lib/actions/clickOutside'

  /**
   * Label text for the select field
   * @type {string}
   */
  export let label: string

  /**
   * Current selected value
   * @type {string}
   */
  export let value: string

  /**
   * Array of options to display in the dropdown
   * Each option must have a value and label property
   * @type {Array<{value: string, label: string}>}
   */
  export let options: Array<{ value: string; label: string }>

  /**
   * Name attribute for form submission
   * @type {string}
   * @default ''
   */
  export let name = ''

  /**
   * ID attribute for the component
   * @type {string}
   * @default ''
   */
  export let id = ''

  /**
   * Whether the select is required in a form
   * @type {boolean}
   * @default false
   */
  export let required = false

  /**
   * Whether the select is disabled/non-interactive
   * @type {boolean}
   * @default false
   */
  export let disabled = false

  /**
   * Event dispatcher for the select component
   * Dispatches 'change' event with the new selected value
   */
  const dispatch = createEventDispatcher()

  /**
   * Whether the dropdown is currently open
   * @type {boolean}
   */
  let isOpen = false

  /**
   * The currently selected option object
   * @type {Object}
   */
  let selectedOption = options.find((opt) => opt.value === value) || options[0]

  /**
   * Handles selecting an option from the dropdown
   * Updates the value, closes the dropdown, and dispatches a change event
   *
   * @param {Object} option - The selected option
   */
  function handleSelect(option: (typeof options)[number]) {
    selectedOption = option
    value = option.value
    isOpen = false
    dispatch('change', option.value)
  }

  /**
   * Keyboard event handler for the select component
   * Handles opening/closing the dropdown and navigating options
   *
   * @param {KeyboardEvent} event - The keyboard event
   */
  function handleKeydown(event: KeyboardEvent) {
    if (disabled) return

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      isOpen = !isOpen
    } else if (event.key === 'Escape') {
      isOpen = false
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) {
        isOpen = true
        return
      }

      const currentIndex = options.findIndex((opt) => opt.value === value)
      const nextIndex =
        event.key === 'ArrowDown'
          ? (currentIndex + 1) % options.length
          : (currentIndex - 1 + options.length) % options.length
      handleSelect(options[nextIndex])
    }
  }

  $: if (value && !options.find((opt) => opt.value === value)) {
    console.warn(`Invalid value "${value}" for select "${label}"`)
  }
</script>

<div use:clickOutside on:click_outside={() => (isOpen = false)}>
  <label for={id || name} class="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
    {label}
  </label>
  <div class="relative mt-2">
    <button
      type="button"
      {id}
      {disabled}
      on:keydown={handleKeydown}
      on:click={() => !disabled && (isOpen = !isOpen)}
      class="grid w-full cursor-default grid-cols-1 rounded-md bg-white py-1.5 pl-3 pr-2 text-left text-gray-900
        outline outline-1 -outline-offset-1 outline-gray-300
        focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-brand-600
        disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:outline-gray-200
        dark:bg-gray-800 dark:text-gray-100 dark:outline-gray-600
        dark:focus:outline-brand-500
        dark:disabled:bg-gray-900 dark:disabled:text-gray-600 dark:disabled:outline-gray-700
        sm:text-sm/6"
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-labelledby={`${id || name}-label`}
    >
      <span class="col-start-1 row-start-1 truncate pr-6">
        {selectedOption.label}
      </span>
      <svg
        class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 dark:text-gray-400 sm:size-4"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z"
          clip-rule="evenodd"
        />
      </svg>
    </button>

    {#if isOpen}
      <ul
        transition:fade={{ duration: 100 }}
        class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none dark:bg-gray-800 dark:ring-white/5 sm:text-sm"
        tabindex="-1"
        role="listbox"
        aria-labelledby={`${id || name}-label`}
      >
        {#each options as option}
          {@const isSelected = option.value === value}
          <li
            class="relative cursor-default select-none py-2 pl-3 pr-9 hover:bg-brand-600 hover:text-white dark:hover:bg-brand-500"
            class:text-gray-900={!isSelected && true}
            class:dark:text-gray-100={!isSelected && true}
            role="option"
            aria-selected={isSelected}
            on:click={() => handleSelect(option)}
            on:keydown={(e) => e.key === 'Enter' && handleSelect(option)}
            tabindex="0"
          >
            <span
              class="block truncate"
              class:font-semibold={isSelected}
              class:font-normal={!isSelected}
            >
              {option.label}
            </span>

            {#if isSelected}
              <span
                class="absolute inset-y-0 right-0 flex items-center pr-4 text-brand-600 dark:text-brand-500"
              >
                <svg class="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fill-rule="evenodd"
                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <input type="hidden" {name} {value} {required} />
</div>
