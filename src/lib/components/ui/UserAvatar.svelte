<script lang="ts">
  /**
   * UserAvatar component
   * Displays a user's profile image using Gravatar or a fallback
   */
  import md5 from 'md5'

  /** User's email address */
  export let email: string | null | undefined = undefined

  /** User's name (or username) */
  export let name: string | null | undefined = undefined

  /** Size of avatar in pixels */
  export let size: number = 40

  /** Additional CSS classes for the avatar */
  export let className: string = ''

  /** Ring color CSS classes */
  export let ringClass: string = 'ring-2 ring-gray-700 dark:ring-gray-800'

  /** Generate Gravatar URL for the email */
  function getGravatarUrl(email: string) {
    if (!email) return ''
    const hash = md5(email.toLowerCase().trim())
    return `https://www.gravatar.com/avatar/${hash}?d=mp&s=${size}`
  }

  $: avatarUrl = email ? getGravatarUrl(email) : ''
  $: initial = name ? name.charAt(0).toUpperCase() : 'U'
</script>

{#if email}
  <!-- User has email, use Gravatar -->
  <img
    class="size-[{size}px] rounded-full {ringClass} {className}"
    src={avatarUrl}
    alt="{name || 'User'}'s Avatar"
  />
{:else}
  <!-- Fallback to initial-based avatar -->
  <div
    class="size-[{size}px] rounded-full flex items-center justify-center bg-brand-600 text-white {ringClass} {className}"
  >
    {initial}
  </div>
{/if}
