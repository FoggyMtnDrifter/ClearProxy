<!--
  @component
  A reusable textarea component for multiline text input.
  Provides a consistent and accessible multiline text input with support for validation and help text.
  
  Features:
  - Consistent styling with Input component
  - Customizable number of rows
  - Optional label and description text
  - Error state with validation message
  - Support for disabled state
  - Full accessibility support
  - Responsive design
  - Dark mode support
  - Two-way value binding
  - Form integration
  
  @prop {string} label - Label text for the textarea
  @prop {string} name - Name attribute for form submission
  @prop {string} [value=''] - Current value of the textarea
  @prop {string} [placeholder=''] - Placeholder text when empty
  @prop {number} [rows=4] - Number of visible text rows
  @prop {boolean} [required=false] - Whether the textarea is required
  @prop {boolean} [disabled=false] - Whether the textarea is disabled
  @prop {string} [id] - ID attribute, defaults to name if not provided
  @prop {string} [description] - Help text displayed below the textarea
  @prop {string} [error] - Error message to display
  
  @example Basic Usage
  ```svelte
  <Textarea
    label="Comments"
    name="comments"
    placeholder="Enter your comments here..."
    bind:value={comments}
  />
  ```
  
  @example With Validation
  ```svelte
  <Textarea
    label="Description"
    name="description"
    rows={6}
    required={true}
    error={descriptionError}
    description="Please provide a detailed description"
    bind:value={description}
  />
  ```
  
  @example Disabled State
  ```svelte
  <Textarea
    label="Read-only Notes"
    name="notes"
    value={savedNotes}
    disabled={true}
  />
  ```
-->
<script lang="ts">
  export let label: string;
  export let name: string;
  export let value = '';
  export let placeholder = '';
  export let rows = 4;
  export let required = false;
  export let disabled = false;
  export let id = name;
  export let description: string | undefined = undefined;
  export let error: string | undefined = undefined;
</script>

<div>
  <label
    for={id}
    class="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
  >
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