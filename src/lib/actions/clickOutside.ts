/**
 * Svelte action that detects clicks outside of a specified element.
 * Used for components like dropdowns, modals, and popovers to close when clicking outside.
 *
 * @param {HTMLElement} node - The DOM node to detect outside clicks for
 * @returns {object} An action object with a destroy method
 *
 * @example
 * <div use:clickOutside on:click_outside={handleClose}>Content</div>
 */
export function clickOutside(node: HTMLElement) {
  /**
   * Event handler for click events
   * Dispatches a custom 'click_outside' event when a click occurs outside the node
   *
   * @param {MouseEvent} event - The click event
   */
  const handleClick = (event: MouseEvent) => {
    if (node && !node.contains(event.target as Node) && !event.defaultPrevented) {
      node.dispatchEvent(new CustomEvent('click_outside'))
    }
  }

  document.addEventListener('click', handleClick, true)

  return {
    /**
     * Cleanup method that removes the event listener
     */
    destroy() {
      document.removeEventListener('click', handleClick, true)
    }
  }
}

/**
 * Type declaration for the custom click_outside event
 * Enables proper TypeScript support for the event in Svelte components
 */
declare global {
  namespace svelteHTML {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface HTMLAttributes<T> {
      'on:click_outside'?: (event: CustomEvent) => void
    }
  }
}
