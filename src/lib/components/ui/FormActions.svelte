<script lang="ts">
  /**
   * FormActions component
   * Consistent form action buttons (submit/cancel) for forms
   */
  import { createEventDispatcher } from 'svelte'
  import Button from './Button.svelte'

  /** Text for the submit button */
  export let submitText: string = 'Submit'

  /** Text for the cancel button */
  export let cancelText: string = 'Cancel'

  /** Loading state for the submit button */
  export let loading: boolean = false

  /** Text to show when loading */
  export let loadingText: string = 'Submitting...'

  /** Whether the submit button is disabled */
  export let disabled: boolean = false

  /** Show the cancel button */
  export let showCancel: boolean = true

  /** Alignment of the buttons */
  export let align: 'left' | 'center' | 'right' = 'right'

  /** Button size */
  export let size: 'sm' | 'md' | 'lg' | 'xl' = 'lg'

  /** Space between buttons */
  export let gap: number = 3

  /** Additional CSS classes */
  export let className: string = ''

  /** Form ID to associate the submit button with */
  export let form: string | undefined = undefined

  const dispatch = createEventDispatcher<{ cancel: null; submit: null }>()

  // Alignment class mapping
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  }
</script>

<div class="mt-6 flex items-center {alignClasses[align]} gap-{gap} {className}">
  {#if showCancel}
    <Button variant="secondary" {size} on:click={() => dispatch('cancel')}>
      {cancelText}
    </Button>
  {/if}

  <Button
    type="submit"
    variant="primary"
    {size}
    {disabled}
    {loading}
    {loadingText}
    {form}
    on:click={() => dispatch('submit')}
  >
    {submitText}
  </Button>
</div>
