<!--
  @component
  A reusable textarea component with consistent styling.
  Matches the Input component's visual design but adapted for multiline text.
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
    class="block text-sm font-medium leading-6 text-gray-900"
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
      class="block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:outline-gray-200 sm:text-sm/6"
      class:outline-red-600={error}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : description ? `${id}-description` : undefined}
    ></textarea>
  </div>
  {#if error}
    <p class="mt-2 text-sm text-red-600" id="{id}-error">{error}</p>
  {:else if description}
    <p class="mt-2 text-sm text-gray-500" id="{id}-description">{description}</p>
  {/if}
</div> 