/** Svelte action to handle clicks outside an element */
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