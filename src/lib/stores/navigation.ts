/**
 * Navigation related stores for managing UI state.
 * @module stores/navigation
 */
import { writable } from 'svelte/store'

/**
 * Store that tracks whether the mobile menu is currently open.
 * Used to control the visibility of the mobile navigation menu.
 *
 * @type {import('svelte/store').Writable<boolean>}
 * @default false
 *
 * @example
 * // In a Svelte component
 * import { isMobileMenuOpen } from '$lib/stores/navigation';
 *
 * // Toggle the menu
 * function toggleMenu() {
 *   isMobileMenuOpen.update(value => !value);
 * }
 *
 * // Subscribe to changes
 * $: isOpen = $isMobileMenuOpen;
 */
export const isMobileMenuOpen = writable(false)
