<!--
  @component
  A reusable modal dialog component that can be used throughout the application.
  
  Features:
  - Centered positioning with backdrop overlay
  - Keyboard support (Escape to close)
  - Body scroll locking when open
  - Accessible (proper ARIA attributes and keyboard handling)
  - Responsive design
  
  Usage:
  ```svelte
  <Modal
    title="Your Title"
    isOpen={showModal}
    onClose={() => showModal = false}
  >
    <div>Your modal content here</div>
  </Modal>
  ```
-->
<script lang="ts">
  import { onMount } from 'svelte';

  export let title: string;
  export let isOpen: boolean;
  export let onClose: () => void;

  // Handle escape key to close modal
  onMount(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  // Prevent scrolling when modal is open
  onMount(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  });
</script>

{#if isOpen}
  <dialog
    class="fixed inset-0 z-50 overflow-y-auto bg-transparent p-0 m-0"
    aria-labelledby={title}
    open
  >
    <!-- Overlay -->
    <button
      type="button"
      class="fixed inset-0 bg-black/30 backdrop-blur-sm"
      on:click={onClose}
      aria-label="Close modal"
    ></button>

    <!-- Modal panel -->
    <div class="fixed inset-0 overflow-y-auto">
      <div class="flex min-h-full items-center justify-center p-4">
        <div
          class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl sm:my-8 sm:w-full sm:max-w-2xl sm:p-6"
        >
          <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
            <button
              type="button"
              class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              on:click={onClose}
            >
              <span class="sr-only">Close</span>
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 class="text-lg font-semibold leading-6 text-gray-900 mb-4" id="modal-title">
                {title}
              </h3>
              <div class="mt-2">
                <slot />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </dialog>
{/if} 