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
  import { CircleCheck, CircleX } from 'lucide-svelte'
  import md5 from 'md5'
  import { onMount, onDestroy } from 'svelte'
  import { invalidate } from '$app/navigation'

  /**
   * Debug function to log audit changes structure
   * @param {string} actionType - The action type
   * @param {any} changes - The changes object
   */
  function debugAuditLogChanges(actionType: string, changes: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.group(`Audit Log (${actionType})`)
      console.log('Changes structure:', changes)
      if (typeof changes === 'object') {
        console.log('Keys:', Object.keys(changes))
        if (changes.domain) {
          console.log('Domain field:', changes.domain)
        }
      }
      console.groupEnd()
    }
  }

  /**
   * Page data loaded from the server containing statistics and recent logs
   */
  export let data

  let statusCheckInterval: ReturnType<typeof setInterval>

  onMount(() => {
    invalidate('app:caddy-status')

    statusCheckInterval = setInterval(() => {
      invalidate('app:caddy-status')
    }, 5000)
  })

  onDestroy(() => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval)
    }
  })

  /**
   * Statistics to display in the dashboard's Stats component
   * @type {Array<{label: string, value: number|string, type?: 'success'|'error'|'warning'|'info'|'neutral'|'indigo'|'purple'|'pink', icon?: {component: any, color?: string}}>}
   */
  const stats = [
    { label: 'Total Hosts', value: data.stats.totalHosts },
    { label: 'Active Hosts', value: data.stats.activeHosts },
    {
      label: 'Caddy Status',
      value: data.stats.caddyRunning ? 'Running' : 'Stopped',
      icon: {
        component: data.stats.caddyRunning ? CircleCheck : CircleX,
        color: data.stats.caddyRunning
          ? 'text-green-500 dark:text-green-400'
          : 'text-red-500 dark:text-red-400'
      }
    }
  ]

  /**
   * Transforms recent log data into feed items for display
   * Uses reactive declaration to automatically update when data changes
   */
  $: feedItems = data.recentLogs.map((log): FeedItem => {
    let domain: string | undefined = undefined

    if (
      log.entityType.toLowerCase() === 'proxyhost' ||
      log.entityType.toLowerCase() === 'proxy_host'
    ) {
      try {
        const changes = typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes
        const actionType = log.actionType.toLowerCase()

        debugAuditLogChanges(actionType, changes)

        if (changes) {
          if (typeof changes.domain === 'string') {
            domain = changes.domain
          } else if (changes.domain && typeof changes.domain === 'object') {
            if (changes.domain.to) {
              domain = changes.domain.to
            } else if (changes.domain.from) {
              domain = changes.domain.from
            }
          }

          if (process.env.NODE_ENV !== 'production' && domain) {
            console.log(`Extracted domain: ${domain} from action type: ${actionType}`)
          }

          if (!domain && (changes.basicAuth || changes.basicAuthEnabled)) {
            Object.entries(changes).forEach(([key, value]) => {
              if (key === 'domain' && typeof value === 'string') {
                domain = value
              }
            })
          }

          if (!domain && actionType === 'delete') {
            if (typeof changes === 'object') {
              ;['domain', 'host', 'address'].forEach((fieldName) => {
                if (!domain && changes[fieldName] && typeof changes[fieldName] === 'string') {
                  domain = changes[fieldName]
                }
              })
            }
          }

          if (!domain && changes.target && changes.target.domain) {
            domain = changes.target.domain
          }
          if (!domain && changes.host && changes.host.domain) {
            domain = changes.host.domain
          }
        }
      } catch (e) {
        console.error('Error parsing changes for audit log', e)
      }
    }

    return {
      id: log.id.toString(),
      timestamp: formatTimestamp(log.createdAt),
      type: log.actionType.toLowerCase() as FeedItem['type'],
      user: {
        name: log.user.name,
        email: log.user.email,
        avatar: `https://www.gravatar.com/avatar/${log.user.email ? md5(log.user.email.toLowerCase().trim()) : ''}?d=mp&s=80`
      },
      entityType: log.entityType,
      domain
    }
  })

  /**
   * Formats a timestamp into a relative time string (e.g., "3h ago")
   * @param {string|Date|null} date - The date to format
   * @returns {string} Relative time string or empty string if date is null
   */
  function formatTimestamp(date: string | Date | null): string {
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
      <Stats {stats} columns={3} />
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
