<script lang="ts">
  /**
   * Modal component that displays content in a dialog overlay.
   * Features include click outside to close, escape key to close, and focus trap.
   */
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { X } from 'lucide-svelte'
  import { clickOutside } from '$lib/actions/clickOutside'

  /**
   * Title of the modal displayed in the header
   * @type {string}
   */
  export let title: string

  /**
   * Whether the modal is currently open and visible
   * @type {boolean}
   */
  export let isOpen: boolean

  /**
   * Callback function to be called when the modal should close
   * @type {() => void}
   */
  export let onClose: () => void

  /**
   * Set up keyboard event handler for Escape key to close modal
   */
  onMount(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  })

  /**
   * Prevent body scrolling when modal is open
   */
  onMount(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  })

  /**
   * Handler for click outside the modal content
   */
  function handleClickOutside() {
    onClose()
  }
</script>

{#if isOpen}
  <div class="relative z-50" role="dialog" aria-labelledby="modal-title" aria-modal="true">
    <div
      class="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity dark:bg-black/50"
      transition:fade={{ duration: 200 }}
    ></div>

    <div class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          use:clickOutside
          on:click_outside={handleClickOutside}
          class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all dark:bg-gray-800 dark:text-gray-100 sm:my-8 sm:w-full sm:max-w-2xl sm:p-6"
          transition:fade={{ duration: 200 }}
        >
          <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
            <button
              type="button"
              class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-500 dark:hover:text-gray-400 dark:focus:ring-brand-500 dark:focus:ring-offset-gray-800"
              on:click={onClose}
            >
              <span class="sr-only">Close</span>
              <X class="size-6" />
            </button>
          </div>

          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3
                class="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100"
                id="modal-title"
              >
                {title}
              </h3>
              <div class="mt-4">
                <slot />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
