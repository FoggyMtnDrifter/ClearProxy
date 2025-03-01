<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ProxyHostFormData } from './types';
  import type { SubmitFunction } from '@sveltejs/kit';
  import Modal from '$lib/components/Modal.svelte';
  
  export let data;
  export let form: ProxyHostFormData | null = null;

  let showCreateModal = false;
  let showEditModal = false;
  let editingHost: typeof data.hosts[number] | null = null;
  let sslEnabled = true;
  let forceSSL = true;
  let http2Support = true;
  let showAdvanced = false;
  let advancedConfig = '';
  let basicAuthEnabled = false;
  let basicAuthUsername = '';
  let basicAuthPassword = '';

  // Watch sslEnabled and update forceSSL accordingly
  $: if (!sslEnabled) {
    forceSSL = false;
  }

  const handleSubmit: SubmitFunction = ({ formData }) => {
    // Set the actual boolean values
    formData.set('sslEnabled', sslEnabled.toString());
    formData.set('forceSSL', forceSSL.toString());
    formData.set('http2Support', http2Support.toString());
    formData.set('advancedConfig', advancedConfig);
    formData.set('basicAuthEnabled', basicAuthEnabled.toString());
    formData.set('basicAuthUsername', basicAuthUsername);
    formData.set('basicAuthPassword', basicAuthPassword);

    return async ({ result }) => {
      if (result.type === 'success') {
        showCreateModal = false;
        resetForm();
      }
    };
  };

  const handleEditSubmit: SubmitFunction = ({ formData }) => {
    if (!editingHost) return;
    formData.set('id', editingHost.id.toString());
    formData.set('sslEnabled', sslEnabled.toString());
    formData.set('forceSSL', forceSSL.toString());
    formData.set('http2Support', http2Support.toString());
    formData.set('advancedConfig', advancedConfig);
    formData.set('basicAuthEnabled', basicAuthEnabled.toString());
    formData.set('basicAuthUsername', basicAuthUsername);
    formData.set('basicAuthPassword', basicAuthPassword);

    return async ({ result }) => {
      if (result.type === 'success') {
        showEditModal = false;
        editingHost = null;
      }
    };
  };

  function startEdit(host: typeof data.hosts[number]) {
    editingHost = host;
    sslEnabled = host.sslEnabled;
    forceSSL = host.forceSSL;
    http2Support = host.http2Support;
    advancedConfig = host.advancedConfig || '';
    showAdvanced = !!host.advancedConfig;
    basicAuthEnabled = host.basicAuthEnabled;
    basicAuthUsername = host.basicAuthUsername || '';
    basicAuthPassword = host.basicAuthPassword || '';
    showEditModal = true;
  }

  function resetForm() {
    sslEnabled = true;
    forceSSL = true;
    http2Support = true;
    showAdvanced = false;
    advancedConfig = '';
    basicAuthEnabled = false;
    basicAuthUsername = '';
    basicAuthPassword = '';
  }
</script>

<div class="py-6">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold text-gray-900">Proxy Hosts</h1>
      <button
        on:click={() => {
          resetForm();
          showCreateModal = true;
        }}
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Add Proxy Host
      </button>
    </div>

    <Modal
      title="Add Proxy Host"
      isOpen={showCreateModal}
      onClose={() => showCreateModal = false}
    >
      <form method="POST" action="?/create" use:enhance={handleSubmit}>
        <div class="space-y-6">
          <!-- Domain Name -->
          <div>
            <label for="domain" class="block text-sm font-medium text-gray-700">Domain Name</label>
            <input
              type="text"
              name="domain"
              id="domain"
              required
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="example.com"
            />
          </div>

          <!-- Target Host and Port -->
          <div class="flex gap-4">
            <div class="flex-1">
              <label for="targetHost" class="block text-sm font-medium text-gray-700">Target Host</label>
              <input
                type="text"
                name="targetHost"
                id="targetHost"
                required
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="localhost"
              />
            </div>

            <div class="w-24">
              <label for="targetPort" class="block text-sm font-medium text-gray-700">Target Port</label>
              <input
                type="number"
                name="targetPort"
                id="targetPort"
                required
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="3000"
              />
            </div>
          </div>

          <!-- Toggles -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <label for="sslEnabled" class="text-sm font-medium text-gray-700">Enable SSL</label>
              <button 
                type="button"
                role="switch"
                aria-checked={sslEnabled}
                id="sslEnabled"
                on:click={() => sslEnabled = !sslEnabled}
                class={`${
                  sslEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
              >
                <span class="sr-only">Enable SSL</span>
                <span
                  aria-hidden="true"
                  class={`${
                    sslEnabled ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                ></span>
              </button>
            </div>

            <div class="flex items-center justify-between">
              <label for="forceSSL" class="text-sm font-medium text-gray-700">Force SSL</label>
              <button 
                type="button"
                role="switch"
                aria-checked={forceSSL}
                id="forceSSL"
                on:click={() => sslEnabled && (forceSSL = !forceSSL)}
                class={`${
                  forceSSL && sslEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  !sslEnabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={!sslEnabled}
              >
                <span class="sr-only">Force SSL</span>
                <span
                  aria-hidden="true"
                  class={`${
                    forceSSL && sslEnabled ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                ></span>
              </button>
            </div>

            <div class="flex items-center justify-between">
              <label for="http2Support" class="text-sm font-medium text-gray-700">HTTP/2 Support</label>
              <button 
                type="button"
                role="switch"
                aria-checked={http2Support}
                id="http2Support"
                on:click={() => http2Support = !http2Support}
                class={`${
                  http2Support ? 'bg-indigo-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
              >
                <span class="sr-only">HTTP/2 Support</span>
                <span
                  aria-hidden="true"
                  class={`${
                    http2Support ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                ></span>
              </button>
            </div>

            <div class="flex items-center justify-between">
              <label for="showAdvanced" class="text-sm font-medium text-gray-700">Advanced Configuration</label>
              <button 
                type="button"
                role="switch"
                aria-checked={showAdvanced}
                id="showAdvanced"
                on:click={() => showAdvanced = !showAdvanced}
                class={`${
                  showAdvanced ? 'bg-indigo-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
              >
                <span class="sr-only">Show Advanced Configuration</span>
                <span
                  aria-hidden="true"
                  class={`${
                    showAdvanced ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                ></span>
              </button>
            </div>

            <div class="flex items-center justify-between">
              <label for="basicAuthEnabled" class="text-sm font-medium text-gray-700">Basic Authentication</label>
              <button 
                type="button"
                role="switch"
                aria-checked={basicAuthEnabled}
                id="basicAuthEnabled"
                on:click={() => basicAuthEnabled = !basicAuthEnabled}
                class={`${
                  basicAuthEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
              >
                <span class="sr-only">Enable Basic Authentication</span>
                <span
                  aria-hidden="true"
                  class={`${
                    basicAuthEnabled ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                ></span>
              </button>
            </div>
          </div>

          {#if basicAuthEnabled}
            <div class="space-y-4">
              <div>
                <label for="basicAuthUsername" class="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  name="basicAuthUsername"
                  id="basicAuthUsername"
                  bind:value={basicAuthUsername}
                  required={basicAuthEnabled}
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label for="basicAuthPassword" class="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  name="basicAuthPassword"
                  id="basicAuthPassword"
                  bind:value={basicAuthPassword}
                  required={basicAuthEnabled}
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter password"
                />
              </div>
            </div>
          {/if}

          {#if showAdvanced}
            <div class="mt-4">
              <label for="advancedConfig" class="block text-sm font-medium text-gray-700">
                Advanced Configuration
                <span class="text-xs text-gray-500 font-normal">(Caddyfile syntax)</span>
              </label>
              <div class="mt-1">
                <textarea
                  id="advancedConfig"
                  name="advancedConfig"
                  rows="6"
                  bind:value={advancedConfig}
                  class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                  placeholder={`header {
    Access-Control-Allow-Origin *
}`}
                ></textarea>
              </div>
              <p class="mt-1 text-xs text-gray-500">
                Add custom Caddyfile directives here. They will be merged with the generated configuration.
              </p>
            </div>
          {/if}
        </div>

        {#if form?.error}
          <div class="mt-4 text-sm text-red-600">
            <p>{form.error}</p>
            {#if form.details}
              <p class="mt-1 font-mono text-xs">{form.details}</p>
            {/if}
          </div>
        {/if}

        <div class="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            on:click={() => showCreateModal = false}
            class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create
          </button>
        </div>
      </form>
    </Modal>

    <Modal
      title="Edit Proxy Host"
      isOpen={showEditModal}
      onClose={() => showEditModal = false}
    >
      {#if editingHost}
        <form method="POST" action="?/edit" use:enhance={handleEditSubmit}>
          <div class="space-y-6">
            <!-- Domain Name -->
            <div>
              <label for="editDomain" class="block text-sm font-medium text-gray-700">Domain Name</label>
              <input
                type="text"
                name="domain"
                id="editDomain"
                required
                value={editingHost.domain}
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="example.com"
              />
            </div>

            <!-- Target Host and Port -->
            <div class="flex gap-4">
              <div class="flex-1">
                <label for="editTargetHost" class="block text-sm font-medium text-gray-700">Target Host</label>
                <input
                  type="text"
                  name="targetHost"
                  id="editTargetHost"
                  required
                  value={editingHost.targetHost}
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="localhost"
                />
              </div>

              <div class="w-24">
                <label for="editTargetPort" class="block text-sm font-medium text-gray-700">Target Port</label>
                <input
                  type="number"
                  name="targetPort"
                  id="editTargetPort"
                  required
                  value={editingHost.targetPort}
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="3000"
                />
              </div>
            </div>

            <!-- Toggles -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <label for="editSslEnabled" class="text-sm font-medium text-gray-700">Enable SSL</label>
                <button 
                  type="button"
                  role="switch"
                  aria-checked={sslEnabled}
                  id="editSslEnabled"
                  on:click={() => sslEnabled = !sslEnabled}
                  class={`${
                    sslEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                >
                  <span class="sr-only">Enable SSL</span>
                  <span
                    aria-hidden="true"
                    class={`${
                      sslEnabled ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  ></span>
                </button>
              </div>

              <div class="flex items-center justify-between">
                <label for="editForceSSL" class="text-sm font-medium text-gray-700">Force SSL</label>
                <button 
                  type="button"
                  role="switch"
                  aria-checked={forceSSL}
                  id="editForceSSL"
                  on:click={() => sslEnabled && (forceSSL = !forceSSL)}
                  class={`${
                    forceSSL && sslEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    !sslEnabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={!sslEnabled}
                >
                  <span class="sr-only">Force SSL</span>
                  <span
                    aria-hidden="true"
                    class={`${
                      forceSSL && sslEnabled ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  ></span>
                </button>
              </div>

              <div class="flex items-center justify-between">
                <label for="editHttp2Support" class="text-sm font-medium text-gray-700">HTTP/2 Support</label>
                <button 
                  type="button"
                  role="switch"
                  aria-checked={http2Support}
                  id="editHttp2Support"
                  on:click={() => http2Support = !http2Support}
                  class={`${
                    http2Support ? 'bg-indigo-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                >
                  <span class="sr-only">HTTP/2 Support</span>
                  <span
                    aria-hidden="true"
                    class={`${
                      http2Support ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  ></span>
                </button>
              </div>

              <div class="flex items-center justify-between">
                <label for="editShowAdvanced" class="text-sm font-medium text-gray-700">Advanced Configuration</label>
                <button 
                  type="button"
                  role="switch"
                  aria-checked={showAdvanced}
                  id="editShowAdvanced"
                  on:click={() => showAdvanced = !showAdvanced}
                  class={`${
                    showAdvanced ? 'bg-indigo-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                >
                  <span class="sr-only">Show Advanced Configuration</span>
                  <span
                    aria-hidden="true"
                    class={`${
                      showAdvanced ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  ></span>
                </button>
              </div>

              <div class="flex items-center justify-between">
                <label for="editBasicAuthEnabled" class="text-sm font-medium text-gray-700">Basic Authentication</label>
                <button 
                  type="button"
                  role="switch"
                  aria-checked={basicAuthEnabled}
                  id="editBasicAuthEnabled"
                  on:click={() => basicAuthEnabled = !basicAuthEnabled}
                  class={`${
                    basicAuthEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                >
                  <span class="sr-only">Enable Basic Authentication</span>
                  <span
                    aria-hidden="true"
                    class={`${
                      basicAuthEnabled ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  ></span>
                </button>
              </div>
            </div>

            {#if basicAuthEnabled}
              <div class="space-y-4">
                <div>
                  <label for="editBasicAuthUsername" class="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    name="basicAuthUsername"
                    id="editBasicAuthUsername"
                    bind:value={basicAuthUsername}
                    required={basicAuthEnabled}
                    class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <label for="editBasicAuthPassword" class="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    name="basicAuthPassword"
                    id="editBasicAuthPassword"
                    bind:value={basicAuthPassword}
                    required={basicAuthEnabled}
                    class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter password"
                  />
                </div>
              </div>
            {/if}

            {#if showAdvanced}
              <div class="mt-4">
                <label for="editAdvancedConfig" class="block text-sm font-medium text-gray-700">
                  Advanced Configuration
                  <span class="text-xs text-gray-500 font-normal">(Caddyfile syntax)</span>
                </label>
                <div class="mt-1">
                  <textarea
                    id="editAdvancedConfig"
                    name="advancedConfig"
                    rows="6"
                    bind:value={advancedConfig}
                    class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                    placeholder={`header {
    Access-Control-Allow-Origin *
}`}
                  ></textarea>
                </div>
                <p class="mt-1 text-xs text-gray-500">
                  Add custom Caddyfile directives here. They will be merged with the generated configuration.
                </p>
              </div>
            {/if}
          </div>

          {#if form?.error}
            <div class="mt-4 text-sm text-red-600">
              <p>{form.error}</p>
              {#if form.details}
                <p class="mt-1 font-mono text-xs">{form.details}</p>
              {/if}
            </div>
          {/if}

          <div class="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              on:click={() => showEditModal = false}
              class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      {/if}
    </Modal>

    <div class="mt-8 flex flex-col">
      <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
          <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table class="min-w-full divide-y divide-gray-300">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Domain</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Target</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">SSL</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Certificate</th>
                  <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span class="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                {#each data.hosts as host}
                  <tr>
                    <td class="whitespace-nowrap px-3 py-4">
                      <form method="POST" action="?/toggle" use:enhance>
                        <input type="hidden" name="id" value={host.id} />
                        <input type="hidden" name="enabled" value={(!host.enabled).toString()} />
                        <button
                          type="submit"
                          class={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded ${
                            host.enabled
                              ? 'text-green-800 bg-green-100 hover:bg-green-200'
                              : 'text-gray-800 bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          {host.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </form>
                    </td>
                    <td class="whitespace-nowrap px-3 py-4">{host.domain}</td>
                    <td class="whitespace-nowrap px-3 py-4">{host.targetHost}:{host.targetPort}</td>
                    <td class="whitespace-nowrap px-3 py-4">{host.sslEnabled ? 'Enabled' : 'Disabled'}</td>
                    <td class="whitespace-nowrap px-3 py-4">{host.certInfo ? 'Certified' : 'Uncertified'}</td>
                    <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <div class="flex justify-end space-x-3">
                        <button
                          type="button"
                          on:click={() => startEdit(host)}
                          class="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <form method="POST" action="?/delete" use:enhance class="inline-block">
                          <input type="hidden" name="id" value={host.id} />
                          <button
                            type="submit"
                            class="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
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
</div>