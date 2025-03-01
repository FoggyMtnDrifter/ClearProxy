<!--
  @component
  Dashboard page displaying system status and recent activity.
-->
<script lang="ts">
  import Stats from '$lib/components/Stats.svelte';
  import Feed from '$lib/components/Feed.svelte';
  import type { FeedItem } from '$lib/components/Feed.svelte';
  import md5 from 'md5';
  
  export let data;

  const stats = [
    { label: 'Total Hosts', value: data.stats.totalHosts },
    { label: 'Active Hosts', value: data.stats.activeHosts }
  ];

  function getGravatarUrl(email: string) {
    const hash = md5(email.toLowerCase().trim());
    return `https://www.gravatar.com/avatar/${hash}?d=mp&s=80`;
  }

  // Transform activity logs into feed items
  $: feedItems = data.recentLogs.map((log): FeedItem => ({
    id: log.id.toString(),
    timestamp: formatTimestamp(log.createdAt),
    type: log.actionType.toLowerCase() as FeedItem['type'],
    user: {
      name: log.user.name,
      email: log.user.email,
      avatar: getGravatarUrl(log.user.email)
    },
    entityType: log.entityType
  }));

  function formatTimestamp(date: string | Date | null) {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }
</script>

<div class="py-6">
  <div class="px-4 sm:px-6 lg:px-0">
    <!-- Stats -->
    <div class="mb-8">
      <Stats {stats} columns={2} />
    </div>

    <!-- Activity Feed -->
    <div class="overflow-hidden bg-white shadow sm:rounded-lg">
      <div class="px-4 py-5 sm:px-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900">Recent Activity</h3>
        <p class="mt-1 max-w-2xl text-sm text-gray-500">Latest system events and configuration changes.</p>
      </div>
      <div class="px-4 pb-5 sm:px-6 sm:pb-6">
        <Feed items={feedItems} />
      </div>
    </div>
  </div>
</div> 