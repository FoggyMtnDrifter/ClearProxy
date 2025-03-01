<!--
  @component
  A reusable input component with support for various states and decorations.
  Provides a consistent, accessible, and feature-rich input field implementation.
  
  Features:
  - Optional label with corner hint
  - Optional help text and error messages
  - Full accessibility support with ARIA attributes
  - Comprehensive autocomplete options
  - Visual feedback for different states (error, disabled)
  - Responsive design with Tailwind CSS
  - Consistent styling across the application
  - Two-way binding support with bind:value
  
  @prop {string} [label] - Label text for the input field
  @prop {string} [type='text'] - HTML input type attribute
  @prop {string} name - Name attribute for the input field
  @prop {string} [id] - ID attribute, defaults to name if not provided
  @prop {string} [value=''] - Current value of the input field
  @prop {string} [placeholder] - Placeholder text
  @prop {string} [helpText] - Help text displayed below the input
  @prop {string} [error] - Error message to display
  @prop {boolean} [disabled=false] - Whether the input is disabled
  @prop {string} [cornerHint] - Optional text displayed in the top-right corner
  @prop {boolean} [required=false] - Whether the input is required
  @prop {AutoComplete} [autocomplete] - HTML autocomplete attribute value
  
  @typedef {'off' | 'on' | 'name' | 'email' | 'username' | 'new-password' | 'current-password' |
    'one-time-code' | 'organization-title' | 'organization' | 'street-address' |
    'address-line1' | 'address-line2' | 'address-line3' | 'address-level1' |
    'address-level2' | 'address-level3' | 'address-level4' | 'country' |
    'country-name' | 'postal-code' | 'cc-name' | 'cc-given-name' | 'cc-additional-name' |
    'cc-family-name' | 'cc-number' | 'cc-exp' | 'cc-exp-month' | 'cc-exp-year' |
    'cc-csc' | 'cc-type' | 'transaction-currency' | 'transaction-amount' | 'language' |
    'bday' | 'bday-day' | 'bday-month' | 'bday-year' | 'sex' | 'tel' | 'tel-country-code' |
    'tel-national' | 'tel-area-code' | 'tel-local' | 'tel-local-prefix' | 'tel-local-suffix' |
    'tel-extension' | 'url' | 'photo'} AutoComplete
  
  @example
  ```svelte
  <Input
    label="Email Address"
    type="email"
    name="email"
    placeholder="you@example.com"
    helpText="We'll never share your email with anyone else."
    cornerHint="Required"
    required={true}
    autocomplete="email"
    error={emailError}
    bind:value={email}
  />
  ```
-->
<script lang="ts">
  import Icon from './Icons.svelte';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    input: { value: string };
    change: { value: string };
  }>();

  type AutoComplete = 
    | 'off' | 'on' 
    | 'name' | 'email' | 'username' | 'new-password' | 'current-password' 
    | 'one-time-code' | 'organization-title' | 'organization' | 'street-address' 
    | 'address-line1' | 'address-line2' | 'address-line3' | 'address-level1' 
    | 'address-level2' | 'address-level3' | 'address-level4' | 'country' 
    | 'country-name' | 'postal-code' | 'cc-name' | 'cc-given-name' | 'cc-additional-name' 
    | 'cc-family-name' | 'cc-number' | 'cc-exp' | 'cc-exp-month' | 'cc-exp-year' 
    | 'cc-csc' | 'cc-type' | 'transaction-currency' | 'transaction-amount' | 'language' 
    | 'bday' | 'bday-day' | 'bday-month' | 'bday-year' | 'sex' | 'tel' | 'tel-country-code' 
    | 'tel-national' | 'tel-area-code' | 'tel-local' | 'tel-local-prefix' | 'tel-local-suffix' 
    | 'tel-extension' | 'url' | 'photo';

  export let label: string | undefined = undefined;
  export let type = "text";
  export let name: string;
  export let id = name;
  export let value: string = "";
  export let placeholder: string | undefined = undefined;
  export let helpText: string | undefined = undefined;
  export let error: string | undefined = undefined;
  export let disabled = false;
  export let cornerHint: string | undefined = undefined;
  export let required = false;
  export let autocomplete: AutoComplete | undefined = undefined;

  $: hasError = error !== undefined;
  $: describedBy = [
    helpText && `${id}-description`,
    error && `${id}-error`,
    cornerHint && `${id}-corner-hint`
  ].filter(Boolean).join(' ');

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    value = target.value;
    dispatch('input', { value });
  }

  function handleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    value = target.value;
    dispatch('change', { value });
  }
</script>

<div>
  {#if label}
    <div class="flex justify-between">
      <label for={id} class="block text-sm/6 font-medium text-gray-900">{label}</label>
      {#if cornerHint}
        <span class="text-sm/6 text-gray-500" id={`${id}-corner-hint`}>{cornerHint}</span>
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
        {hasError ? 'col-start-1 row-start-1 pr-10 text-red-900 outline-red-300 placeholder:text-red-300 focus:outline-red-600' : 'text-gray-900 outline-gray-300 placeholder:text-gray-400 focus:outline-indigo-600'}
        outline outline-1 -outline-offset-1
        focus:outline focus:outline-2 focus:-outline-offset-2
        disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:outline-gray-200
        sm:text-sm/6"
      aria-invalid={hasError}
      aria-describedby={describedBy || undefined}
    />
    
    {#if hasError}
      <Icon type="error" className="pointer-events-none col-start-1 row-start-1 mr-3 size-5 self-center justify-self-end text-red-500 sm:size-4" />
    {/if}
  </div>

  {#if helpText && !error}
    <p class="mt-2 text-sm text-gray-500" id={`${id}-description`}>{helpText}</p>
  {/if}

  {#if error}
    <p class="mt-2 text-sm text-red-600" id={`${id}-error`}>{error}</p>
  {/if}
</div> 