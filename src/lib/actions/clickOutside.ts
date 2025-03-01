/**
 * A Svelte action that detects clicks outside of an element and dispatches a custom event.
 * Useful for implementing dismissible dropdowns, modals, and other interactive components.
 * 
 * Features:
 * - Detects clicks outside the target element
 * - Handles cleanup on component destruction
 * - TypeScript support with global type declarations
 * - Ignores clicks that have been prevented
 * - Properly handles event bubbling
 * 
 * @param {HTMLElement} node - The element to monitor for outside clicks
 * @returns {Object} Action object with destroy cleanup method
 * 
 * @fires {CustomEvent} click_outside - Dispatched when a click occurs outside the element
 * 
 * @example
 * ```svelte
 * <div use:clickOutside on:click_outside={() => isOpen = false}>
 *   <!-- Dropdown or modal content -->
 * </div>
 * ```
 * 
 * @example With TypeScript
 * ```typescript
 * let isOpen = false;
 * const handleClickOutside = (event: CustomEvent) => {
 *   isOpen = false;
 * };
 * ```
 */
export function clickOutside(node: HTMLElement) {
  const handleClick = (event: MouseEvent) => {
    if (
      node && 
      !node.contains(event.target as Node) && 
      !event.defaultPrevented
    ) {
      node.dispatchEvent(new CustomEvent('click_outside'));
    }
  };

  document.addEventListener('click', handleClick, true);

  return {
    destroy() {
      document.removeEventListener('click', handleClick, true);
    },
  };
}

declare global {
  namespace svelteHTML {
    interface HTMLAttributes<T> {
      'on:click_outside'?: (event: CustomEvent) => void;
    }
  }
} 