<script lang="ts">
  /**
   * UserAvatar component
   * Displays a user's profile image using Gravatar or a fallback
   */
  import md5 from 'md5'

  export let email: string | null | undefined = undefined

  export let name: string | null | undefined = undefined

  export let size: number = 40

  export let className: string = ''

  export let ringClass: string = 'ring-2 ring-gray-700 dark:ring-gray-800'

  function getGravatarUrl(email: string) {
    if (!email) return ''
    const hash = md5(email.toLowerCase().trim())
    return `https://www.gravatar.com/avatar/${hash}?d=mp&s=${size}`
  }

  $: avatarUrl = email ? getGravatarUrl(email) : ''
  $: initial = name ? name.charAt(0).toUpperCase() : 'U'
</script>

{#if email}
  <img
    class="size-[{size}px] rounded-full {ringClass} {className}"
    src={avatarUrl}
    alt="{name || 'User'}'s Avatar"
  />
{:else}
  <div
    class="size-[{size}px] rounded-full flex items-center justify-center bg-brand-600 text-white {ringClass} {className}"
  >
    {initial}
  </div>
{/if}
