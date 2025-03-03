<!--
  @component
  A theme toggle component that allows users to switch between light, dark, and system theme.
  
  Features:
  - Toggle between light, dark, and system theme
  - Persists theme preference in localStorage
  - Respects system preference when set to 'system'
  - Smooth transition between themes
  - Accessible controls with keyboard support
  
  @example
  ```svelte
  <ThemeToggle />
  ```
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from './Icons.svelte'

  let theme: 'light' | 'dark' | 'system' = 'system'
  let mounted = false

  onMount(() => {
    // Get saved theme from localStorage or default to system
    const savedTheme = localStorage.getItem('theme') as typeof theme | null
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      theme = savedTheme
    }

    // Apply appropriate theme
    updateTheme()
    mounted = true
  })

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

  function setTheme(newTheme: typeof theme) {
    theme = newTheme
    updateTheme()
  }

  // Listen for system preference changes when in system mode
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
      class="relative rounded-md p-1.5 text-gray-300 hover:bg-gray-600/50 hover:text-white dark:hover:bg-gray-700/70 {theme ===
      'light'
        ? 'bg-gray-600/50 text-white shadow-sm dark:bg-gray-700'
        : ''}"
      aria-label="Use light theme"
      on:click={() => setTheme('light')}
    >
      <Icon type="sun" className="size-4" />
    </button>

    <button
      type="button"
      class="relative rounded-md p-1.5 text-gray-300 hover:bg-gray-600/50 hover:text-white dark:hover:bg-gray-700/70 {theme ===
      'dark'
        ? 'bg-gray-600/50 text-white shadow-sm dark:bg-gray-700'
        : ''}"
      aria-label="Use dark theme"
      on:click={() => setTheme('dark')}
    >
      <Icon type="moon" className="size-4" />
    </button>

    <button
      type="button"
      class="relative rounded-md p-1.5 text-gray-300 hover:bg-gray-600/50 hover:text-white dark:hover:bg-gray-700/70 {theme ===
      'system'
        ? 'bg-gray-600/50 text-white shadow-sm dark:bg-gray-700'
        : ''}"
      aria-label="Use system theme"
      on:click={() => setTheme('system')}
    >
      <Icon type="system" className="size-4" />
    </button>
  </div>
{/if}
