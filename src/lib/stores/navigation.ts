/**
 * Navigation state management store.
 * Manages the state of the mobile navigation menu across components.
 *
 * Features:
 * - Reactive mobile menu state
 * - Svelte store subscription support
 * - TypeScript type safety
 * - Automatic cleanup with store unsubscription
 *
 * @type {import('svelte/store').Writable<boolean>}
 *
 * @example Subscribe to changes
 * ```typescript
 * import { isMobileMenuOpen } from '$lib/stores/navigation';
 *
 * isMobileMenuOpen.subscribe(isOpen => {
 *   // Handle menu state change
 * });
 * ```
 *
 * @example Toggle menu state
 * ```typescript
 * isMobileMenuOpen.update(isOpen => !isOpen);
 * ```
 */
import { writable } from 'svelte/store'

export const isMobileMenuOpen = writable(false)
