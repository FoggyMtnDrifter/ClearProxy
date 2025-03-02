<!--
  @component
  A reusable toggle switch component with optional label and description.
  Provides an accessible and animated switch control for boolean values.
  
  Features:
  - Optional label and description text
  - Full accessibility support with ARIA attributes
  - Smooth transition animations
  - Support for disabled state
  - Hidden form input for form submission
  - Keyboard navigation support
  - Focus ring for keyboard users
  - TypeScript event typing
  - Tailwind CSS styling
  
  @prop {boolean} [checked=false] - The current state of the toggle
  @prop {string} [label] - Optional label text to display
  @prop {string} [description] - Optional description text to display below the label
  @prop {string} [name] - Name attribute for the hidden form input
  @prop {boolean} [disabled=false] - Whether the toggle is disabled
  
  @event {boolean} change - Fired when the toggle state changes, detail contains the new state
  
  @example
  ```svelte
  <Toggle
    bind:checked={featureEnabled}
    label="Enable Feature"
    description="This will enable the experimental feature"
    name="feature-toggle"
    disabled={!hasPermission}
    on:change={(e) => handleFeatureToggle(e.detail)}
  />
  ```
  
  @example Form Usage
  ```svelte
  <form on:submit={handleSubmit}>
    <Toggle
      name="notifications"
      bind:checked={notificationsEnabled}
      label="Enable Notifications"
    />
  </form>
  ```
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let checked = false;
  export let label: string | undefined = undefined;
  export let description: string | undefined = undefined;
  export let name: string | undefined = undefined;
  export let disabled = false;

  const dispatch = createEventDispatcher<{
    change: boolean;
  }>();

  function toggle() {
    if (!disabled) {
      checked = !checked;
      dispatch('change', checked);
    }
  }

  $: id = name ? `toggle-${name}` : undefined;
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
    class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 dark:focus:ring-brand-500 dark:focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50 {checked ? 'bg-brand-600 dark:bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}"
    on:click={toggle}
    {disabled}
  >
    <span
      class="pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {checked ? 'translate-x-5' : 'translate-x-0'}"
    >
      <span
        class="absolute inset-0 flex h-full w-full items-center justify-center transition-opacity {checked ? 'opacity-0 duration-100 ease-out' : 'opacity-100 duration-200 ease-in'}"
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
        class="absolute inset-0 flex h-full w-full items-center justify-center transition-opacity {checked ? 'opacity-100 duration-200 ease-in' : 'opacity-0 duration-100 ease-out'}"
        aria-hidden="true"
      >
        <svg class="size-3 text-brand-600 dark:text-brand-500" fill="currentColor" viewBox="0 0 12 12">
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