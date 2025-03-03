<script lang="ts">
  /**
   * Input component for text entry with various configurations.
   * Supports different input types, validation, and styling options.
   */
  import Icon from './Icons.svelte'
  import { createEventDispatcher } from 'svelte'

  /**
   * Event dispatcher for the input component
   * Dispatches 'input' and 'change' events with the current value
   */
  const dispatch = createEventDispatcher<{
    input: { value: string }
    change: { value: string }
  }>()

  /**
   * Valid autocomplete attribute values for the input element
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete
   */
  type AutoComplete =
    | 'off'
    | 'on'
    | 'name'
    | 'email'
    | 'username'
    | 'new-password'
    | 'current-password'
    | 'one-time-code'
    | 'organization-title'
    | 'organization'
    | 'street-address'
    | 'address-line1'
    | 'address-line2'
    | 'address-line3'
    | 'address-level1'
    | 'address-level2'
    | 'address-level3'
    | 'address-level4'
    | 'country'
    | 'country-name'
    | 'postal-code'
    | 'cc-name'
    | 'cc-given-name'
    | 'cc-additional-name'
    | 'cc-family-name'
    | 'cc-number'
    | 'cc-exp'
    | 'cc-exp-month'
    | 'cc-exp-year'
    | 'cc-csc'
    | 'cc-type'
    | 'transaction-currency'
    | 'transaction-amount'
    | 'language'
    | 'bday'
    | 'bday-day'
    | 'bday-month'
    | 'bday-year'
    | 'sex'
    | 'tel'
    | 'tel-country-code'
    | 'tel-national'
    | 'tel-area-code'
    | 'tel-local'
    | 'tel-local-prefix'
    | 'tel-local-suffix'
    | 'tel-extension'
    | 'url'
    | 'photo'

  export let label: string | undefined = undefined
  export let type = 'text'
  export let name: string
  export let id = name
  export let value: string = ''
  export let placeholder: string | undefined = undefined
  export let helpText: string | undefined = undefined
  export let error: string | undefined = undefined
  export let disabled = false
  export let cornerHint: string | undefined = undefined
  export let required = false
  export let autocomplete: AutoComplete | undefined = undefined

  $: hasError = error !== undefined
  $: describedBy = [
    helpText && `${id}-description`,
    error && `${id}-error`,
    cornerHint && `${id}-corner-hint`
  ]
    .filter(Boolean)
    .join(' ')

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement
    value = target.value
    dispatch('input', { value })
  }

  function handleChange(event: Event) {
    const target = event.target as HTMLInputElement
    value = target.value
    dispatch('change', { value })
  }
</script>

<div>
  {#if label}
    <div class="flex justify-between">
      <label for={id} class="block text-sm/6 font-medium text-gray-900 dark:text-gray-100"
        >{label}</label
      >
      {#if cornerHint}
        <span class="text-sm/6 text-gray-500 dark:text-gray-400" id={`${id}-corner-hint`}
          >{cornerHint}</span
        >
      {/if}
    </div>
  {/if}

  <div class="mt-2 {hasError ? 'grid grid-cols-1' : ''}">
    <input
      {type}
      {name}
      {id}
      bind:value
      on:input={handleInput}
      on:change={handleChange}
      {disabled}
      {placeholder}
      {required}
      {autocomplete}
      class="block w-full rounded-md bg-white px-3 py-1.5 text-base
        {hasError
        ? 'col-start-1 row-start-1 pr-10 text-red-900 outline-red-300 placeholder:text-red-300 focus:outline-red-600 dark:text-red-300 dark:outline-red-700 dark:placeholder:text-red-700 dark:focus:outline-red-500'
        : 'text-gray-900 outline-gray-300 placeholder:text-gray-400 focus:outline-brand-600 dark:bg-gray-800 dark:text-gray-100 dark:outline-gray-600 dark:placeholder:text-gray-500 dark:focus:outline-brand-500'}
        outline outline-1 -outline-offset-1
        focus:outline focus:outline-2 focus:-outline-offset-2
        disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:outline-gray-200
        dark:disabled:bg-gray-900 dark:disabled:text-gray-600 dark:disabled:outline-gray-700
        sm:text-sm/6"
      aria-invalid={hasError}
      aria-describedby={describedBy || undefined}
    />

    {#if hasError}
      <Icon
        type="error"
        className="pointer-events-none col-start-1 row-start-1 mr-3 size-5 self-center justify-self-end text-red-500 dark:text-red-400 sm:size-4"
      />
    {/if}
  </div>

  {#if helpText && !error}
    <p class="mt-2 text-sm text-gray-500 dark:text-gray-400" id={`${id}-description`}>{helpText}</p>
  {/if}

  {#if error}
    <p class="mt-2 text-sm text-red-600 dark:text-red-400" id={`${id}-error`}>{error}</p>
  {/if}
</div>
