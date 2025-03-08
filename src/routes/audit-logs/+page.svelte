<script lang="ts">
  /**
   * @component AuditLogsPage
   * @description Displays a chronological list of system changes and configuration updates.
   *
   * This page shows a feed of all audit log entries, including details about who made changes,
   * what was changed, and when the changes occurred.
   */
  import type { PageData } from './$types'
  import { Card, Feed } from '$lib/components'
  import type { FeedItem } from '$lib/components/features/Feed.svelte'
  import md5 from 'md5'

  export let data: PageData

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
   * Formats changes from JSON string or object into a readable multi-line string
   * @param {string|Record<string, unknown>} changes - JSON string or object containing change details
   * @returns {string} Formatted string representing changes
   */
  function formatChanges(changes: string | Record<string, unknown>): string {
    try {
      const changesObj = typeof changes === 'string' ? JSON.parse(changes) : changes
      return Object.entries(changesObj)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => {
          if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
            return `${key}: ${value.from} → ${value.to}`
          }
          return `${key}: ${JSON.stringify(value)}`
        })
        .join('\n')
    } catch (e) {
      return typeof changes === 'string' ? changes : JSON.stringify(changes)
    }
  }

  /**
   * Extracts deleted item information from JSON changes string or object
   * @param {string|Record<string, unknown>} changes - JSON string or object containing change details
   * @returns {Record<string, any>|undefined} Object with deleted item properties or undefined
   */
  function extractDeletedItem(
    changes: string | Record<string, unknown>
  ): Record<string, any> | undefined {
    try {
      const changesObj = typeof changes === 'string' ? JSON.parse(changes) : changes
      if (changesObj.deleted && typeof changesObj.deleted === 'object') {
        return changesObj.deleted
      }
      const deletedValues: Record<string, any> = {}
      for (const [key, value] of Object.entries(changesObj)) {
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
        avatar: `https://www.gravatar.com/avatar/${log.user.email ? md5(log.user.email.toLowerCase().trim()) : ''}?d=mp&s=80`
      },
      entityType: log.entityType,
      details: formatChanges(log.changes),
      ...(log.actionType.toLowerCase() === 'delete' && {
        deletedItem: extractDeletedItem(log.changes)
      })
    })
  )
</script>

<div class="py-6">
  <div class="px-4 sm:px-6 lg:px-0">
    <Card
      title="Audit Logs"
      description="Detailed history of system changes and configuration updates."
    >
      {#if feedItems.length > 0}
        <Feed items={feedItems} />
      {:else}
        <div class="px-4 py-5 sm:px-6">
          <Feed items={[]} />
        </div>
      {/if}
    </Card>
  </div>
</div>
