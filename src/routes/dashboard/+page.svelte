<script lang="ts">
  export let data;
</script>

<div class="py-6">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <h1 class="text-2xl font-semibold text-gray-900">Dashboard</h1>
    
    <!-- Stats -->
    <div class="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Total Proxy Hosts</dt>
                <dd class="text-lg font-medium text-gray-900">{data.stats.totalHosts}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Active Hosts</dt>
                <dd class="text-lg font-medium text-gray-900">{data.stats.activeHosts}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Items -->
    <div class="mt-8">
      <!-- Recent Proxy Hosts -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900">Recent Proxy Hosts</h3>
        </div>
        <ul class="divide-y divide-gray-200">
          {#each data.recentHosts as host}
            <li class="px-4 py-4 sm:px-6">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class={`h-3 w-3 rounded-full ${host.enabled ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-indigo-600">{host.domain}</div>
                    <div class="text-sm text-gray-500">{host.targetHost}:{host.targetPort}</div>
                  </div>
                </div>
                <div>
                  <a href={`/proxy-hosts/${host.id}`} class="text-indigo-600 hover:text-indigo-900 text-sm font-medium">View</a>
                </div>
              </div>
            </li>
          {/each}
        </ul>
        <div class="px-4 py-4 border-t border-gray-200 sm:px-6">
          <a href="/proxy-hosts" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">View all proxy hosts</a>
        </div>
      </div>
    </div>
  </div>
</div> 