<script lang="ts">
  /**
   * FormActions component
   * Consistent form action buttons (submit/cancel) for forms
   */
  import { createEventDispatcher } from 'svelte'
  import Button from './Button.svelte'

  export let submitText: string = 'Submit'

  export let cancelText: string = 'Cancel'

  export let loading: boolean = false

  export let loadingText: string = 'Submitting...'

  export let disabled: boolean = false

  export let showCancel: boolean = true

  export let align: 'left' | 'center' | 'right' = 'right'

  export let size: 'sm' | 'md' | 'lg' | 'xl' = 'lg'

  export let gap: number = 3

  export let className: string = ''

  export let form: string | undefined = undefined

  const dispatch = createEventDispatcher<{ cancel: null; submit: null }>()

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
