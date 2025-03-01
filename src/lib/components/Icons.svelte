<!--
  @component
  A comprehensive icon system component that provides a collection of commonly used SVG icons throughout the application.
  
  @features
  - Pre-defined set of commonly used icons (create, update, delete, error, close, menu, edit)
  - Consistent styling and sizing across the application
  - Customizable size through className prop
  - Support for both filled and stroke variants
  - Accessible SVG implementation with aria-hidden
  - Optimized SVG paths for performance
  - TypeScript support with type safety for icon names
  
  @typedef {Object} IconType
  @property {string} create - Plus icon for creation actions
  @property {string} update - Pencil icon for update actions
  @property {string} delete - Trash bin icon for deletion actions
  @property {string} error - Circle with X for error states
  @property {string} close - X icon for closing/dismissing
  @property {string} menu - Hamburger menu icon
  @property {string} edit - Pencil icon for editing
  
  @prop {keyof IconType} type - The type of icon to display
  @prop {string} [className='size-5'] - CSS classes for styling the icon (primarily size)
  @prop {boolean} [stroke=false] - Whether to render the icon with stroke style instead of fill
  
  @example
  ```typescript
  // Basic usage
  type="create"
  
  // Custom size
  type="delete" className="size-6"
  
  // Stroke variant
  type="menu" stroke={true}
  
  // With custom color
  type="error" className="size-5 text-red-500"
  ```
-->
<script lang="ts" context="module">
  export const Icons = {
    create: `<path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />`,
    update: `<path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />`,
    delete: `<path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" />`,
    error: `<path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clip-rule="evenodd" />`,
    close: `<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />`,
    menu: `<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />`,
    edit: `<path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />`
  };
</script>

<script lang="ts">
  export let type: keyof typeof Icons;
  export let className = 'size-5';
  export let stroke = false;
</script>

<svg class={className} viewBox="0 0 24 24" fill={stroke ? 'none' : 'currentColor'} stroke={stroke ? 'currentColor' : 'none'} stroke-width={stroke ? 1.5 : undefined} aria-hidden="true">
  {@html Icons[type]}
</svg> 