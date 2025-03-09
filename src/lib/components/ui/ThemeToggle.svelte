<script lang="ts">
  /**
   * ThemeToggle component for switching between light, dark, and system color schemes.
   * Persists the user's preference in localStorage and handles system preference changes.
   */
  import { onMount } from 'svelte'
  import { Sun, Moon, Laptop } from 'lucide-svelte'

  /**
   * Current theme preference
   * @type {'light' | 'dark' | 'system'}
   * @default 'system'
   */
  let theme: 'light' | 'dark' | 'system' = 'system'

  /**
   * Whether the component has mounted and initialized
   * Used to prevent SSR hydration issues
   */
  let mounted = false

  /**
   * Initialize the theme from localStorage on component mount
   */
  onMount(() => {
    const savedTheme = localStorage.getItem('theme') as typeof theme | null
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      theme = savedTheme
    }

    updateTheme()
    mounted = true
  })

  /**
   * Updates the document theme based on current preference
   * Applies dark class to document and saves preference to localStorage
   */
  function updateTheme() {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    document.documentElement.classList.toggle('dark', isDark)

    if (theme === 'system') {
      localStorage.removeItem('theme')
    } else {
      localStorage.setItem('theme', theme)
    }
  }

  /**
   * Sets a new theme preference and applies it
   *
   * @param {('light' | 'dark' | 'system')} newTheme - The theme to set
   */
  function setTheme(newTheme: typeof theme) {
    theme = newTheme
    updateTheme()
  }

  /**
   * Set up listener for system color scheme changes
   * Updates the theme if using system preference
   */
  onMount(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'system') {
        updateTheme()
      }
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  })
</script>

{#if mounted}
  <div
    class="flex items-center gap-1 rounded-lg border border-gray-600/30 bg-gray-700/30 p-1 dark:border-gray-700 dark:bg-gray-800/40"
  >
    <button
      type="button"
      class="relative rounded-md p-1.5 text-gray-300 hover:bg-gray-600/50 hover:text-white dark:hover:bg-gray-700/70 cursor-pointer {theme ===
      'light'
        ? 'bg-gray-600/50 text-white shadow-sm dark:bg-gray-700'
        : ''}"
      aria-label="Use light theme"
      on:click={() => setTheme('light')}
    >
      <Sun class="size-4" />
    </button>

    <button
      type="button"
      class="relative rounded-md p-1.5 text-gray-300 hover:bg-gray-600/50 hover:text-white dark:hover:bg-gray-700/70 cursor-pointer {theme ===
      'dark'
        ? 'bg-gray-600/50 text-white shadow-sm dark:bg-gray-700'
        : ''}"
      aria-label="Use dark theme"
      on:click={() => setTheme('dark')}
    >
      <Moon class="size-4" />
    </button>

    <button
      type="button"
      class="relative rounded-md p-1.5 text-gray-300 hover:bg-gray-600/50 hover:text-white dark:hover:bg-gray-700/70 cursor-pointer {theme ===
      'system'
        ? 'bg-gray-600/50 text-white shadow-sm dark:bg-gray-700'
        : ''}"
      aria-label="Use system theme"
      on:click={() => setTheme('system')}
    >
      <Laptop class="size-4" />
    </button>
  </div>
{/if}
