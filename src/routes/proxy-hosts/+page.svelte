<!--
  @component
  Proxy Hosts management page.
  Displays a list of configured proxy hosts and allows adding, editing, and deleting them.
-->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidate } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import type { ProxyHostFormData } from './types';
  import type { SubmitFunction } from '@sveltejs/kit';
  import Modal from '$lib/components/Modal.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import ErrorAlert from '$lib/components/ErrorAlert.svelte';
  import Input from '$lib/components/Input.svelte';
  import Table from '$lib/components/Table.svelte';
  import Icon from '$lib/components/Icons.svelte';
  
  export let data;
  let form: ProxyHostFormData | null = null;
  let statusCheckInterval: ReturnType<typeof setInterval>;
  let searchQuery = '';
  let searchTimeout: ReturnType<typeof setTimeout>;
  let filteredHosts = data.hosts;

  // Filter hosts when search query changes
  $: {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (!searchQuery) {
        filteredHosts = data.hosts;
      } else {
        const query = searchQuery.toLowerCase();
        filteredHosts = data.hosts.filter(host => 
          host.domain.toLowerCase().includes(query) ||
          host.targetHost.toLowerCase().includes(query) ||
          host.targetPort.toString().includes(query) ||
          host.targetProtocol.toLowerCase().includes(query)
        );
      }
    }, 300); // 300ms debounce delay
  }

  // Table configuration
  const columns = [
    { header: 'Domain Name', key: 'domain', class: 'font-medium text-gray-900' },
    { header: 'Target Host', key: 'targetHost' },
    { header: 'Target Port', key: 'targetPort' },
    { header: 'Protocol', key: 'targetProtocol' },
    { 
      header: 'Status', 
      key: 'status',
      class: 'whitespace-nowrap px-3 py-4 text-sm text-gray-500',
      render: (host: typeof data.hosts[number]) => `
        <span class="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
          Active
        </span>
      `
    }
  ];

  const rowActions = [
    {
      srLabel: (host: typeof data.hosts[number]) => `Edit ${host.domain}`,
      onClick: (host: typeof data.hosts[number]) => startEdit(host),
      class: 'p-2 hover:bg-gray-50 rounded-full',
      component: Icon,
      props: {
        type: 'edit',
        className: 'size-4 text-gray-500 hover:text-gray-700'
      }
    },
    {
      srLabel: (host: typeof data.hosts[number]) => `Delete ${host.domain}`,
      onClick: async (host: typeof data.hosts[number]) => {
        if (confirm(`Are you sure you want to delete ${host.domain}?`)) {
          const form = new FormData();
          form.set('id', host.id.toString());
          
          const response = await fetch('?/delete', {
            method: 'POST',
            body: form
          });
          
          if (response.ok) {
            invalidate('app:proxy-hosts');
          }
        }
      },
      class: 'p-2 hover:bg-gray-50 rounded-full',
      component: Icon,
      props: {
        type: 'delete',
        className: 'size-4 text-red-500 hover:text-red-700'
      }
    }
  ];

  // Add function to handle target host input changes
  function handleTargetHostInput(event: Event, targetPortId: string) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    
    // Check for port in the host (e.g., localhost:3000)
    const match = value.match(/:(\d+)$/);
    if (match) {
      // Remove the port from the host
      input.value = value.replace(/:(\d+)$/, '');
      
      // Set the port value
      const portInput = document.getElementById(targetPortId) as HTMLInputElement;
      if (portInput && !portInput.value) {
        portInput.value = match[1];
      }
    }
  }

  // Set up periodic status check
  onMount(() => {
    // Initial check
    invalidate('app:caddy-status');
    
    // Set up interval for subsequent checks
    statusCheckInterval = setInterval(() => {
      invalidate('app:caddy-status');
    }, 5000);
  });

  // Clean up interval when component is destroyed
  onDestroy(() => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
    }
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
  });

  let showCreateModal = false;
  let showEditModal = false;
  let editingHost: typeof data.hosts[number] | null = null;
  let sslEnabled = true;
  let forceSSL = true;
  let http2Support = true;
  let http3Support = true;
  let showAdvanced = false;
  let advancedConfig = '';
  let basicAuthEnabled = false;
  let basicAuthUsername = '';
  let basicAuthPassword = '';
  let targetProtocol = 'http';
  let isSubmitting = false;
  let error: { message: string; details?: string } | null = null;
  let ignoreInvalidCert = false;

  // Watch sslEnabled and update dependent settings
  $: if (!sslEnabled) {
    forceSSL = false;
    http2Support = false;
    http3Support = false;
  }

  const handleSubmit: SubmitFunction = ({ formData }) => {
    // Set the actual boolean values
    formData.set('sslEnabled', sslEnabled.toString());
    formData.set('forceSSL', forceSSL.toString());
    formData.set('http2Support', http2Support.toString());
    formData.set('http3Support', http3Support.toString());
    formData.set('advancedConfig', showAdvanced ? advancedConfig : '');
    formData.set('basicAuthEnabled', basicAuthEnabled.toString());
    formData.set('basicAuthUsername', basicAuthUsername);
    formData.set('basicAuthPassword', basicAuthPassword);
    formData.set('targetProtocol', targetProtocol);
    formData.set('ignoreInvalidCert', ignoreInvalidCert.toString());

    isSubmitting = true;
    error = null;

    return async ({ result, update }) => {
      isSubmitting = false;
      if (result.type === 'success') {
        showCreateModal = false;
        resetForm();
        await update();
      } else if (result.type === 'failure') {
        error = {
          message: result.data?.error || 'Failed to create proxy host',
          details: result.data?.details
        };
      }
    };
  };

  const handleEditSubmit: SubmitFunction = ({ formData }) => {
    if (!editingHost) return;
    formData.set('id', editingHost.id.toString());
    formData.set('sslEnabled', sslEnabled.toString());
    formData.set('forceSSL', forceSSL.toString());
    formData.set('http2Support', http2Support.toString());
    formData.set('http3Support', http3Support.toString());
    formData.set('advancedConfig', showAdvanced ? advancedConfig : '');
    formData.set('basicAuthEnabled', basicAuthEnabled.toString());
    formData.set('basicAuthUsername', basicAuthUsername);
    formData.set('basicAuthPassword', basicAuthPassword);
    formData.set('targetProtocol', targetProtocol);
    formData.set('ignoreInvalidCert', ignoreInvalidCert.toString());

    isSubmitting = true;
    error = null;

    return async ({ result, update }) => {
      isSubmitting = false;
      if (result.type === 'success') {
        showEditModal = false;
        editingHost = null;
        await update();
      } else if (result.type === 'failure') {
        error = {
          message: result.data?.error || 'Failed to update proxy host',
          details: result.data?.details
        };
      }
    };
  };

  const handleToggle: SubmitFunction = () => {
    isSubmitting = true;
    error = null;

    return async ({ result, update }) => {
      isSubmitting = false;
      if (result.type === 'success') {
        await update();
      } else if (result.type === 'failure') {
        error = {
          message: result.data?.error || 'Failed to toggle proxy host status',
          details: result.data?.details
        };
      }
    };
  };

  const handleDelete: SubmitFunction = () => {
    isSubmitting = true;
    error = null;

    return async ({ result, update }) => {
      isSubmitting = false;
      if (result.type === 'success') {
        await update();
      } else if (result.type === 'failure') {
        error = {
          message: result.data?.error || 'Failed to delete proxy host',
          details: result.data?.details
        };
      }
    };
  };

  function startEdit(host: typeof data.hosts[number]) {
    editingHost = host;
    sslEnabled = host.sslEnabled;
    forceSSL = host.forceSSL;
    http2Support = host.http2Support;
    http3Support = host.http3Support;
    advancedConfig = host.advancedConfig || '';
    showAdvanced = !!host.advancedConfig;
    basicAuthEnabled = host.basicAuthEnabled;
    basicAuthUsername = host.basicAuthUsername || '';
    basicAuthPassword = host.basicAuthPassword || '';
    targetProtocol = host.targetProtocol;
    ignoreInvalidCert = host.ignoreInvalidCert;
    showEditModal = true;
    error = null;
  }

  function resetForm() {
    sslEnabled = true;
    forceSSL = true;
    http2Support = true;
    http3Support = true;
    showAdvanced = false;
    advancedConfig = '';
    basicAuthEnabled = false;
    basicAuthUsername = '';
    basicAuthPassword = '';
    targetProtocol = 'http';
    ignoreInvalidCert = false;
    error = null;
  }
</script>

<div class="py-6">
  <div class="px-4 sm:px-6 lg:px-0">
    <!-- Table -->
    <div class="overflow-hidden bg-white shadow sm:rounded-lg">
      <div class="px-4 py-5 sm:px-6">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-lg leading-6 font-medium text-gray-900">Proxy Hosts</h3>
            <p class="mt-1 max-w-2xl text-sm text-gray-500">Configure and manage your proxy host settings.</p>
          </div>
          <div class="flex gap-4">
            <div class="relative">
              <input
                type="text"
                bind:value={searchQuery}
                placeholder="Search hosts..."
                class="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
            <button
              type="button"
              on:click={() => {
                showCreateModal = true;
                resetForm();
              }}
              class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Add Host
            </button>
          </div>
        </div>
      </div>
      <div class="px-4 pb-5 sm:px-6 sm:pb-6">
        <Table columns={columns} data={filteredHosts} rowActions={rowActions} />
      </div>
    </div>

    <!-- Create Modal -->
    {#if showCreateModal}
      <Modal
        title="Add Proxy Host"
        isOpen={showCreateModal}
        onClose={() => {
          showCreateModal = false;
          resetForm();
        }}
      >
        <form
          method="POST"
          action="?/create"
          use:enhance={handleSubmit}
          class="space-y-4"
        >
          <Input
            label="Domain Name"
            name="domain"
            type="text"
            required
            placeholder="example.com"
          />
          <Input
            label="Target Host"
            name="targetHost"
            type="text"
            required
            placeholder="localhost"
            on:input={(e) => handleTargetHostInput(e, 'targetPort')}
          />
          <Input
            label="Target Port"
            name="targetPort"
            id="targetPort"
            type="number"
            required
            placeholder="8080"
          />

          <div class="space-y-4 border-t border-gray-200 pt-4">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-gray-900">SSL Settings</h4>
              <div class="flex items-center">
                <input
                  type="checkbox"
                  id="sslEnabled"
                  bind:checked={sslEnabled}
                  class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label for="sslEnabled" class="ml-2 text-sm text-gray-600">Enable SSL</label>
              </div>
            </div>

            {#if sslEnabled}
              <div class="ml-4 space-y-2">
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    id="forceSSL"
                    bind:checked={forceSSL}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label for="forceSSL" class="ml-2 text-sm text-gray-600">Force SSL</label>
                </div>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    id="http2Support"
                    bind:checked={http2Support}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label for="http2Support" class="ml-2 text-sm text-gray-600">HTTP/2 Support</label>
                </div>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    id="http3Support"
                    bind:checked={http3Support}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label for="http3Support" class="ml-2 text-sm text-gray-600">HTTP/3 Support</label>
                </div>
              </div>
            {/if}
          </div>

          <div class="space-y-4 border-t border-gray-200 pt-4">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-gray-900">Basic Authentication</h4>
              <div class="flex items-center">
                <input
                  type="checkbox"
                  id="basicAuthEnabled"
                  bind:checked={basicAuthEnabled}
                  class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label for="basicAuthEnabled" class="ml-2 text-sm text-gray-600">Enable Basic Auth</label>
              </div>
            </div>

            {#if basicAuthEnabled}
              <div class="ml-4 space-y-4">
                <Input
                  label="Username"
                  name="basicAuthUsername"
                  bind:value={basicAuthUsername}
                  required={basicAuthEnabled}
                />
                <Input
                  label="Password"
                  name="basicAuthPassword"
                  type="password"
                  bind:value={basicAuthPassword}
                  required={basicAuthEnabled}
                />
              </div>
            {/if}
          </div>

          <div class="space-y-4 border-t border-gray-200 pt-4">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-gray-900">Advanced Settings</h4>
              <div class="flex items-center">
                <input
                  type="checkbox"
                  id="showAdvanced"
                  bind:checked={showAdvanced}
                  class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label for="showAdvanced" class="ml-2 text-sm text-gray-600">Show Advanced Settings</label>
              </div>
            </div>

            {#if showAdvanced}
              <div class="ml-4 space-y-4">
                <div>
                  <label for="targetProtocol" class="block text-sm font-medium text-gray-700">Target Protocol</label>
                  <select
                    id="targetProtocol"
                    name="targetProtocol"
                    bind:value={targetProtocol}
                    class="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                  </select>
                </div>

                <div class="flex items-center">
                  <input
                    type="checkbox"
                    id="ignoreInvalidCert"
                    bind:checked={ignoreInvalidCert}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label for="ignoreInvalidCert" class="ml-2 text-sm text-gray-600">Ignore Invalid Certificate</label>
                </div>

                <div>
                  <label for="advancedConfig" class="block text-sm font-medium text-gray-700">Advanced Configuration</label>
                  <div class="mt-1">
                    <textarea
                      id="advancedConfig"
                      name="advancedConfig"
                      bind:value={advancedConfig}
                      rows="4"
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Enter advanced Caddyfile configuration"
                    />
                  </div>
                </div>
              </div>
            {/if}
          </div>

          {#if error}
            <ErrorAlert error={error.message} details={error.details} />
          {/if}

          <div class="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <button
              type="submit"
              class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2"
              disabled={isSubmitting}
            >
              {#if isSubmitting}
                <LoadingSpinner size="sm" label="Loading..." center />
                Creating...
              {:else}
                Create Host
              {/if}
            </button>
            <button
              type="button"
              class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
              on:click={() => {
                showCreateModal = false;
                resetForm();
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    {/if}

    <!-- Edit Modal -->
    {#if showEditModal && editingHost}
      <Modal
        title="Edit Proxy Host"
        isOpen={showEditModal}
        onClose={() => {
          showEditModal = false;
          editingHost = null;
        }}
      >
        <form
          method="POST"
          action="?/update"
          use:enhance={handleEditSubmit}
          class="space-y-4"
        >
          <Input
            label="Domain Name"
            name="domain"
            type="text"
            required
            value={editingHost.domain}
          />
          <Input
            label="Target Host"
            name="targetHost"
            type="text"
            required
            value={editingHost.targetHost}
            on:input={(e) => handleTargetHostInput(e, 'targetPort')}
          />
          <Input
            label="Target Port"
            name="targetPort"
            id="targetPort"
            type="text"
            required
            value={editingHost.targetPort.toString()}
          />

          <div class="space-y-4 border-t border-gray-200 pt-4">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-gray-900">SSL Settings</h4>
              <div class="flex items-center">
                <input
                  type="checkbox"
                  id="sslEnabled"
                  bind:checked={sslEnabled}
                  class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label for="sslEnabled" class="ml-2 text-sm text-gray-600">Enable SSL</label>
              </div>
            </div>

            {#if sslEnabled}
              <div class="ml-4 space-y-2">
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    id="forceSSL"
                    bind:checked={forceSSL}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label for="forceSSL" class="ml-2 text-sm text-gray-600">Force SSL</label>
                </div>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    id="http2Support"
                    bind:checked={http2Support}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label for="http2Support" class="ml-2 text-sm text-gray-600">HTTP/2 Support</label>
                </div>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    id="http3Support"
                    bind:checked={http3Support}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label for="http3Support" class="ml-2 text-sm text-gray-600">HTTP/3 Support</label>
                </div>
              </div>
            {/if}
          </div>

          <div class="space-y-4 border-t border-gray-200 pt-4">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-gray-900">Basic Authentication</h4>
              <div class="flex items-center">
                <input
                  type="checkbox"
                  id="basicAuthEnabled"
                  bind:checked={basicAuthEnabled}
                  class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label for="basicAuthEnabled" class="ml-2 text-sm text-gray-600">Enable Basic Auth</label>
              </div>
            </div>

            {#if basicAuthEnabled}
              <div class="ml-4 space-y-4">
                <Input
                  label="Username"
                  name="basicAuthUsername"
                  bind:value={basicAuthUsername}
                  required={basicAuthEnabled}
                />
                <Input
                  label="Password"
                  name="basicAuthPassword"
                  type="password"
                  bind:value={basicAuthPassword}
                  required={basicAuthEnabled}
                />
              </div>
            {/if}
          </div>

          <div class="space-y-4 border-t border-gray-200 pt-4">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-gray-900">Advanced Settings</h4>
              <div class="flex items-center">
                <input
                  type="checkbox"
                  id="showAdvanced"
                  bind:checked={showAdvanced}
                  class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label for="showAdvanced" class="ml-2 text-sm text-gray-600">Show Advanced Settings</label>
              </div>
            </div>

            {#if showAdvanced}
              <div class="ml-4 space-y-4">
                <div>
                  <label for="targetProtocol" class="block text-sm font-medium text-gray-700">Target Protocol</label>
                  <select
                    id="targetProtocol"
                    name="targetProtocol"
                    bind:value={targetProtocol}
                    class="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                  </select>
                </div>

                <div class="flex items-center">
                  <input
                    type="checkbox"
                    id="ignoreInvalidCert"
                    bind:checked={ignoreInvalidCert}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label for="ignoreInvalidCert" class="ml-2 text-sm text-gray-600">Ignore Invalid Certificate</label>
                </div>

                <div>
                  <label for="advancedConfig" class="block text-sm font-medium text-gray-700">Advanced Configuration</label>
                  <div class="mt-1">
                    <textarea
                      id="advancedConfig"
                      name="advancedConfig"
                      bind:value={advancedConfig}
                      rows="4"
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Enter advanced Caddyfile configuration"
                    />
                  </div>
                </div>
              </div>
            {/if}
          </div>

          {#if error}
            <ErrorAlert error={error.message} details={error.details} />
          {/if}

          <div class="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <button
              type="submit"
              class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2"
              disabled={isSubmitting}
            >
              {#if isSubmitting}
                <LoadingSpinner size="sm" label="Loading..." center />
                Saving...
              {:else}
                Save Changes
              {/if}
            </button>
            <button
              type="button"
              class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
              on:click={() => {
                showEditModal = false;
                editingHost = null;
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    {/if}
  </div>
</div>