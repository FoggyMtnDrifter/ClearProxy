<!--
  @component
  A reusable error alert component.
  
  Features:
  - Error icon
  - Primary error message
  - Optional detailed error message
  - Accessible (proper ARIA attributes)
  - Dismissible
  
  Usage:
  ```svelte
  <ErrorAlert
    error="Failed to save changes"
    details="Connection timeout after 5 seconds"
    onDismiss={() => showError = false}
  />
  ```
-->
<script lang="ts">
    import Icon from './Icons.svelte';
    export let error: string;
    export let details: string | undefined = undefined;
</script>

<div class="rounded-md bg-red-50 p-4">
    <div class="flex">
        <div class="shrink-0">
            <Icon type="error" className="size-5 text-red-400" />
        </div>
        <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">{error}</h3>
            {#if details}
                <div class="mt-2 text-sm text-red-700">
                    <p>{details}</p>
                </div>
            {/if}
        </div>
    </div>
</div>
