<script lang="ts">
  /**
   * Textarea component for multi-line text input.
   * Includes support for labels, validation, and error states.
   */

  /**
   * Label text for the textarea
   * @type {string}
   */
  export let label: string

  /**
   * Name attribute for the textarea, used for form submission
   * @type {string}
   */
  export let name: string

  /**
   * Current value of the textarea
   * @type {string}
   * @default ''
   */
  export let value = ''

  /**
   * Placeholder text to display when the textarea is empty
   * @type {string}
   * @default ''
   */
  export let placeholder = ''

  /**
   * Number of visible text rows
   * @type {number}
   * @default 4
   */
  export let rows = 4

  /**
   * Whether the textarea is required in a form
   * @type {boolean}
   * @default false
   */
  export let required = false

  /**
   * Whether the textarea is disabled/non-interactive
   * @type {boolean}
   * @default false
   */
  export let disabled = false

  /**
   * ID attribute for the textarea, defaults to name if not specified
   * @type {string}
   * @default name
   */
  export let id = name

  /**
   * Optional help text displayed below the textarea
   * @type {string|undefined}
   * @default undefined
   */
  export let description: string | undefined = undefined

  /**
   * Error message to display when validation fails
   * @type {string|undefined}
   * @default undefined
   */
  export let error: string | undefined = undefined
</script>

<div>
  <label for={id} class="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100">
    {label}
  </label>
  <div class="mt-2">
    <textarea
      {id}
      {name}
      {rows}
      bind:value
      {placeholder}
      {required}
      {disabled}
      class="block w-full rounded-md bg-white px-3 py-2 text-gray-900
        outline outline-1 -outline-offset-1 outline-gray-300
        focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-brand-600
        disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:outline-gray-200
        dark:bg-gray-800 dark:text-gray-100 dark:outline-gray-600 dark:placeholder:text-gray-500
        dark:focus:outline-brand-500 dark:disabled:bg-gray-900 dark:disabled:text-gray-600 dark:disabled:outline-gray-700
        sm:text-sm/6"
      class:outline-red-600={error}
      class:dark:outline-red-700={error}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : description ? `${id}-description` : undefined}
    ></textarea>
  </div>
  {#if error}
    <p class="mt-2 text-sm text-red-600 dark:text-red-400" id="{id}-error">{error}</p>
  {:else if description}
    <p class="mt-2 text-sm text-gray-500 dark:text-gray-400" id="{id}-description">{description}</p>
  {/if}
</div>
