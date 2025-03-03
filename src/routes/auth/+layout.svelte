<script>
  /**
   * @component AuthLayout
   * @description Layout component for all authentication-related pages
   *
   * This layout provides a consistent full-height container with appropriate
   * background styling for the login, register, and other auth-related pages.
   * It imports the application's global CSS and renders its children via the slot.
   */
  import '../../app.css'
</script>

<div class="h-full bg-white dark:bg-gray-900">
  <slot />
</div>
