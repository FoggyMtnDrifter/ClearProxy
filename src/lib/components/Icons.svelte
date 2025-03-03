<script lang="ts" context="module">
  /**
   * Collection of SVG path definitions for icons used throughout the application.
   * Each icon is defined as an SVG path string that can be rendered within an SVG element.
   * @type {Record<string, string>}
   */
  export const Icons = {
    create: `<path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />`,
    update: `<path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />`,
    delete: `<path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" />`,
    error: `<path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clip-rule="evenodd" />`,
    close: `<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />`,
    menu: `<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />`,
    edit: `<path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />`,
    sun: `<path fill-rule="evenodd" d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM12 18a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM2.25 12a.75.75 0 01.75-.75h2.25a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75zM18 12a.75.75 0 01.75-.75h2.25a.75.75 0 010 1.5h-2.25A.75.75 0 0118 12zM5.636 5.636a.75.75 0 011.06 0l1.59 1.591a.75.75 0 01-1.061 1.06l-1.59-1.59a.75.75 0 010-1.06zM18.364 5.636a.75.75 0 010 1.06l-1.59 1.591a.75.75 0 11-1.061-1.06l1.59-1.591a.75.75 0 011.06 0zM5.636 18.364a.75.75 0 010-1.06l1.591-1.591a.75.75 0 111.06 1.061l-1.59 1.59a.75.75 0 01-1.06 0zM18.364 18.364a.75.75 0 01-1.06 0l-1.591-1.591a.75.75 0 011.061-1.06l1.59 1.59a.75.75 0 010 1.06z" clip-rule="evenodd" />`,
    moon: `<path fill-rule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clip-rule="evenodd" />`,
    system: `<path fill-rule="evenodd" d="M2.25 5.25a3 3 0 013-3h13.5a3 3 0 013 3V15a3 3 0 01-3 3h-3v.257c0 .597.237 1.17.659 1.591l.621.622a.75.75 0 01-.53 1.28h-9a.75.75 0 01-.53-1.28l.621-.622a2.25 2.25 0 00.659-1.59V18h-3a3 3 0 01-3-3V5.25zm1.5 0v9.75c0 .83.67 1.5 1.5 1.5h13.5c.83 0 1.5-.67 1.5-1.5V5.25c0-.83-.67-1.5-1.5-1.5H5.25c-.83 0-1.5.67-1.5 1.5z" clip-rule="evenodd" />`
  }
</script>

<script lang="ts">
  /**
   * Icon component for rendering SVG icons from the predefined collection.
   * Supports customization of size, appearance, and event forwarding.
   */
  import { createEventDispatcher } from 'svelte'

  /**
   * Type of icon to display from the Icons collection
   * @type {keyof typeof Icons}
   */
  export let type: keyof typeof Icons

  /**
   * CSS class(es) to apply to the SVG element
   * @type {string}
   * @default 'size-5'
   */
  export let className = 'size-5'

  /**
   * Whether to render the icon with stroke styling (outline) instead of fill
   * @type {boolean}
   * @default false
   */
  export let stroke = false

  /**
   * Event dispatcher for forwarding events from the SVG element
   */
  const dispatch = createEventDispatcher()

  /**
   * Forwards DOM events from the SVG element to the component's consumer
   * @param {Event} e - The DOM event to forward
   */
  function forwardEvent(e: Event) {
    dispatch(e.type, e)
  }
</script>

<svg
  class={className}
  viewBox="0 0 24 24"
  fill={stroke ? 'none' : 'currentColor'}
  stroke={stroke ? 'currentColor' : 'none'}
  stroke-width={stroke ? 1.5 : undefined}
  aria-hidden="true"
  on:click={forwardEvent}
  on:mouseenter={forwardEvent}
  on:mouseleave={forwardEvent}
  on:focus={forwardEvent}
  on:blur={forwardEvent}
  on:keydown={forwardEvent}
>
  {@html Icons[type]}
</svg>
