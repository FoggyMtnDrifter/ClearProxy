<script lang="ts">
  /**
   * FormSection component
   * A consistent section for forms with optional title and description
   */

  /** Title for the form section */
  export let title: string | undefined = undefined

  /** Optional description for the form section */
  export let description: string | undefined = undefined

  /** Whether to show a border at the top of the section */
  export let bordered: boolean = true

  /** Additional CSS classes */
  export let className: string = ''

  /** Spacing between elements */
  export let spacing: string = 'space-y-4'
</script>

<div
  class="{bordered ? 'border-t border-gray-200 dark:border-gray-700/30 pt-6 mt-6' : ''} {className}"
>
  {#if title}
    <div class="mb-4">
      <h4 class="text-base font-medium text-gray-900 dark:text-gray-100">
        {title}
      </h4>
      {#if description}
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      {/if}
    </div>
  {/if}

  <div class={spacing}>
    <slot />
  </div>
</div>
