<script lang="ts">
  /**
   * @component DashboardPage
   * @description Main dashboard displaying system statistics and recent activity
   *
   * The dashboard provides an overview of the system status with key metrics
   * and a feed of recent activity for at-a-glance monitoring of the application.
   */
  import { Stats, Feed, Card } from '$lib/components'
  import type { FeedItem } from '$lib/components/features/Feed.svelte'
  import md5 from 'md5'

  /**
   * Page data loaded from the server containing statistics and recent logs
   */
  export let data

  /**
   * Statistics to display in the dashboard's Stats component
   * @type {Array<{label: string, value: number}>}
   */
  const stats = [
    { label: 'Total Hosts', value: data.stats.totalHosts },
    { label: 'Active Hosts', value: data.stats.activeHosts }
  ]

  /**
   * Transforms recent log data into feed items for display
   * Uses reactive declaration to automatically update when data changes
   */
  $: feedItems = data.recentLogs.map(
    (log): FeedItem => ({
      id: log.id.toString(),
      timestamp: formatTimestamp(log.createdAt),
      type: log.actionType.toLowerCase() as FeedItem['type'],
      user: {
        name: log.user.name,
        email: log.user.email,
        avatar: `https://www.gravatar.com/avatar/${log.user.email ? md5(log.user.email.toLowerCase().trim()) : ''}?d=mp&s=80`
      },
      entityType: log.entityType
    })
  )

  /**
   * Formats a timestamp into a relative time string (e.g., "3h ago")
   * @param {string|Date|null} date - The date to format
   * @returns {string} Relative time string or empty string if date is null
   */
  function formatTimestamp(date: string | Date | null) {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'just now'
  }
</script>

<div class="py-6">
  <div class="px-4 sm:px-6 lg:px-0">
    <div class="mb-8">
      <Stats {stats} columns={2} />
    </div>

    <Card title="Recent Activity" description="Latest system events and configuration changes.">
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
