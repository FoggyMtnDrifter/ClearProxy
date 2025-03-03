<script lang="ts">
  /**
   * @component AuditLogsPage
   * @description Displays a chronological list of system changes and configuration updates.
   *
   * This page shows a feed of all audit log entries, including details about who made changes,
   * what was changed, and when the changes occurred.
   */
  import type { PageData } from './$types'
  import Feed from '$lib/components/Feed.svelte'
  import type { FeedItem } from '$lib/components/Feed.svelte'
  import md5 from 'md5'

  export let data: PageData

  /**
   * Generates a Gravatar URL for a user's email address
   * @param {string} email - The user's email address
   * @returns {string} URL to the user's Gravatar image
   */
  function getGravatarUrl(email: string) {
    const hash = md5(email.toLowerCase().trim())
    return `https://www.gravatar.com/avatar/${hash}?d=mp&s=80`
  }

  /**
   * Formats a timestamp into a human-readable date and time string
   * @param {string|Date|null} date - The date to format
   * @returns {string} Formatted date string or empty string if date is null
   */
  function formatTimestamp(date: string | Date | null) {
    if (!date) return ''
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date))
  }

  /**
   * Formats changes from JSON string into a readable multi-line string
   * @param {string} changesJson - JSON string containing change details
   * @returns {string} Formatted string representing changes
   */
  function formatChanges(changesJson: string) {
    try {
      const changes = JSON.parse(changesJson)
      return Object.entries(changes)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => {
          if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
            return `${key}: ${value.from} → ${value.to}`
          }
          return `${key}: ${JSON.stringify(value)}`
        })
        .join('\n')
    } catch (e) {
      return changesJson
    }
  }

  /**
   * Extracts deleted item information from JSON changes string
   * @param {string} changesJson - JSON string containing change details
   * @returns {Record<string, any>|undefined} Object with deleted item properties or undefined
   */
  function extractDeletedItem(changesJson: string): Record<string, any> | undefined {
    try {
      const changes = JSON.parse(changesJson)
      if (changes.deleted && typeof changes.deleted === 'object') {
        return changes.deleted
      }
      const deletedValues: Record<string, any> = {}
      for (const [key, value] of Object.entries(changes)) {
        if (value && typeof value === 'object' && 'from' in value) {
          deletedValues[key] = value.from
        } else {
          deletedValues[key] = value
        }
      }
      return Object.keys(deletedValues).length > 0 ? deletedValues : undefined
    } catch (e) {
      return undefined
    }
  }

  /**
   * Transforms audit log data into feed items for display
   * Uses reactive declaration to automatically update when data changes
   */
  $: feedItems = data.logs.map(
    (log): FeedItem => ({
      id: log.id.toString(),
      timestamp: formatTimestamp(log.createdAt),
      type: log.actionType.toLowerCase() as FeedItem['type'],
      user: {
        name: log.user.name,
        email: log.user.email,
        avatar: getGravatarUrl(log.user.email)
      },
      entityType: log.entityType,
      details: formatChanges(log.changes),
      ...(log.actionType === 'DELETE' && { deletedItem: extractDeletedItem(log.changes) })
    })
  )
</script>

<div class="py-6">
  <div class="px-4 sm:px-6 lg:px-0">
    <div
      class="overflow-hidden bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/10 sm:rounded-lg"
    >
      <div class="px-4 py-5 sm:px-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Audit Logs</h3>
        <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          Detailed history of system changes and configuration updates.
        </p>
      </div>
      <div class="px-4 pb-5 sm:px-6 sm:pb-6">
        <Feed items={feedItems} />
      </div>
    </div>
  </div>
</div>
