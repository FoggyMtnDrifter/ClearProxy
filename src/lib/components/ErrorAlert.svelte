<!--
  @component
  A reusable error alert component for displaying error messages.
  Provides a visually distinct and accessible way to show error states and messages.
  
  Features:
  - Consistent error styling with red color scheme
  - Error icon for immediate visual recognition
  - Primary error message with optional details
  - Semantic HTML structure
  - Accessible ARIA attributes
  - Responsive design
  - Dark mode support
  - Clear visual hierarchy
  - Support for multiline messages
  
  @prop {string} error - The primary error message to display
  @prop {string} [details] - Optional detailed error message or additional information
  
  @example Basic Usage
  ```svelte
  <ErrorAlert
    error="Failed to save changes"
  />
  ```
  
  @example With Details
  ```svelte
  <ErrorAlert
    error="Failed to connect to server"
    details="The server is not responding. Please try again later or contact support if the problem persists."
  />
  ```
  
  @example Form Validation
  ```svelte
  {#if formErrors}
    <ErrorAlert
      error="Please fix the following errors:"
      details={Object.values(formErrors).join('\n')}
    />
  {/if}
  ```
-->
<script lang="ts">
    import Icon from './Icons.svelte';
    export let error: string;
    export let details: string | undefined = undefined;
</script>

<div class="rounded-md bg-red-50 p-4 dark:bg-red-950">
    <div class="flex">
        <div class="shrink-0">
            <Icon type="error" className="size-5 text-red-400 dark:text-red-300" />
        </div>
        <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800 dark:text-red-300">{error}</h3>
            {#if details}
                <div class="mt-2 text-sm text-red-700 dark:text-red-400">
                    <p>{details}</p>
                </div>
            {/if}
        </div>
    </div>
</div>
