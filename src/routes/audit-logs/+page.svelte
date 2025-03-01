<!--
  @component
  Audit Logs page component.
  Displays a list of system activity logs with filtering and sorting options.
-->
<script lang="ts">
  export let data;

  function formatDate(date: Date | null) {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date));
  }

  function formatChanges(changesJson: string) {
    try {
      const changes = JSON.parse(changesJson);
      return Object.entries(changes)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join('\n');
    } catch (e) {
      return changesJson;
    }
  }
</script>

<div class="py-6">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <h1 class="text-2xl font-semibold text-gray-900">Audit Logs</h1>
    <p class="mt-1 text-sm text-gray-500">System activity logs showing recent changes and actions.</p>

    <div class="mt-8">
      <div class="bg-white shadow overflow-hidden sm:rounded-lg">
        <div class="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Changes
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each data.logs as log}
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(log.createdAt)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      {log.actionType === 'create' ? 'bg-green-100 text-green-800' :
                       log.actionType === 'update' ? 'bg-blue-100 text-blue-800' :
                       log.actionType === 'delete' ? 'bg-red-100 text-red-800' :
                       'bg-gray-100 text-gray-800'}">
                      {log.actionType}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.entityType} {#if log.entityId}#{log.entityId}{/if}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500">
                    <pre class="whitespace-pre-wrap font-mono text-xs">{formatChanges(log.changes)}</pre>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div> 