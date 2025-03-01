<!--
  @component
  A reusable toggle switch component with optional label and description.
  
  Features:
  - Optional label and description
  - Accessible (proper ARIA attributes)
  - Smooth transitions
  - TypeScript support
  - Customizable colors via Tailwind classes
  
  Usage:
  ```svelte
  <Toggle
    bind:checked
    label="Enable Feature"
    description="Optional description text"
    name="feature-toggle"
  />
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
          class="text-sm/6 font-medium text-gray-900" 
          id={id ? `${id}-label` : undefined}
        >
          {label}
        </span>
      {/if}
      {#if description}
        <span 
          class="text-sm text-gray-500" 
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
    class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {checked ? 'bg-indigo-600' : 'bg-gray-200'}"
    on:click={toggle}
    {disabled}
  >
    <span
      aria-hidden="true"
      class="pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {checked ? 'translate-x-5' : 'translate-x-0'}"
    ></span>
  </button>
</div>

{#if name}
  <input type="hidden" {name} value={checked.toString()} />
{/if} 