<!--
  @component
  A reusable modal dialog component that can be used throughout the application.
  
  Features:
  - Centered positioning with backdrop overlay
  - Keyboard support (Escape to close)
  - Body scroll locking when open
  - Accessible (proper ARIA attributes and keyboard handling)
  - Responsive design
  - Smooth transitions and animations
  
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
  import { fade } from 'svelte/transition';
  import Icon from './Icons.svelte';
  import { clickOutside } from '$lib/actions/clickOutside';

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

  function handleClickOutside() {
    onClose();
  }
</script>

{#if isOpen}
  <div 
    class="relative z-50" 
    role="dialog" 
    aria-labelledby="modal-title" 
    aria-modal="true"
  >
    <!-- Background backdrop -->
    <div 
      class="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
      transition:fade={{ duration: 200 }}
    ></div>

    <div class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <!-- Modal panel -->
        <div
          use:clickOutside
          on:click_outside={handleClickOutside}
          class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6"
          transition:fade={{ duration: 200 }}
        >
          <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
            <button
              type="button"
              class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              on:click={onClose}
            >
              <span class="sr-only">Close</span>
              <Icon type="close" className="size-6" stroke={true} />
            </button>
          </div>

          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 class="text-base font-semibold leading-6 text-gray-900" id="modal-title">
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