<script lang="ts">
  /**
   * ConfirmDialog component
   * A modal dialog for confirming actions with customizable buttons
   */
  import { createEventDispatcher } from 'svelte'
  import Modal from '../layout/Modal.svelte'
  import Button from './Button.svelte'

  export let title: string = 'Confirm Action'

  export let message: string

  export let confirmLabel: string = 'Confirm'

  export let cancelLabel: string = 'Cancel'

  export let isOpen: boolean = false

  export let type: 'danger' | 'warning' | 'info' = 'danger'

  export let loading: boolean = false

  export let loadingText: string = 'Processing...'

  const dispatch = createEventDispatcher<{
    confirm: null
    cancel: null
    close: null
  }>()

  function handleConfirm() {
    dispatch('confirm')
  }

  function handleCancel() {
    dispatch('cancel')
    closeDialog()
  }

  function closeDialog() {
    isOpen = false
    dispatch('close')
  }

  function getButtonClass(type: 'danger' | 'warning' | 'info'): string {
    if (type === 'danger') {
      return 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    } else if (type === 'warning') {
      return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
    }
    return ''
  }
</script>

<Modal {title} {isOpen} onClose={handleCancel}>
  <div class="text-sm text-gray-600 dark:text-gray-300 mb-6">
    {message}
  </div>

  <div class="flex justify-end gap-3">
    <Button variant="secondary" on:click={handleCancel}>
      {cancelLabel}
    </Button>

    <Button
      variant="primary"
      {loading}
      {loadingText}
      on:click={handleConfirm}
      class_name={getButtonClass(type)}
    >
      {confirmLabel}
    </Button>
  </div>
</Modal>
