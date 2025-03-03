<!--
  @component
  Proxy Hosts management page.
  Displays a list of configured proxy hosts and allows adding, editing, and deleting them.
-->
<script lang="ts">
  import { enhance } from '$app/forms'
  import { invalidate } from '$app/navigation'
  import { onMount, onDestroy } from 'svelte'
  import type { ProxyHostFormData } from './types'
  import type { SubmitFunction } from '@sveltejs/kit'
  import type { ComponentType, SvelteComponent } from 'svelte'
  import Modal from '$lib/components/Modal.svelte'
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte'
  import ErrorAlert from '$lib/components/ErrorAlert.svelte'
  import Input from '$lib/components/Input.svelte'
  import Table from '$lib/components/Table.svelte'
  import Icon from '$lib/components/Icons.svelte'
  import Select from '$lib/components/Select.svelte'
  import Toggle from '$lib/components/Toggle.svelte'
  import Textarea from '$lib/components/Textarea.svelte'
  import Button from '$lib/components/Button.svelte'

  export let data
  let form: ProxyHostFormData | null = null
  let statusCheckInterval: ReturnType<typeof setInterval>
  let searchQuery = ''
  let searchTimeout: ReturnType<typeof setTimeout>
  let filteredHosts = data.hosts

  // Filter hosts when search query changes
  $: {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      if (!searchQuery) {
        filteredHosts = data.hosts
      } else {
        const query = searchQuery.toLowerCase()
        filteredHosts = data.hosts.filter(
          (host) =>
            host.domain.toLowerCase().includes(query) ||
            host.targetHost.toLowerCase().includes(query) ||
            host.targetPort.toString().includes(query) ||
            host.targetProtocol.toLowerCase().includes(query)
        )
      }
    }, 300) // 300ms debounce delay
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
      render: (host: (typeof data.hosts)[number]) => `
        <span class="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
          Active
        </span>
      `
    }
  ]

  const rowActions = [
    {
      srLabel: (host: (typeof data.hosts)[number]) => `Edit ${host.domain}`,
      onClick: (host: (typeof data.hosts)[number]) => startEdit(host),
      component: Icon,
      props: {
        type: 'edit',
        className:
          'size-5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 cursor-pointer transition-colors duration-200',
        tabindex: '0',
        role: 'button',
        onkeydown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (e.currentTarget) {
              e.currentTarget.dispatchEvent(new MouseEvent('click', { bubbles: true }))
            }
          }
        }
      }
    },
    {
      srLabel: (host: (typeof data.hosts)[number]) => `Delete ${host.domain}`,
      onClick: async (host: (typeof data.hosts)[number]) => {
        if (confirm(`Are you sure you want to delete ${host.domain}?`)) {
          const form = new FormData()
          form.set('id', host.id.toString())

          const response = await fetch('?/delete', {
            method: 'POST',
            body: form
          })

          if (response.ok) {
            invalidate('app:proxy-hosts')
          }
        }
      },
      component: Icon,
      props: {
        type: 'delete',
        className:
          'size-5 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 cursor-pointer ml-3 transition-colors duration-200',
        tabindex: '0',
        role: 'button',
        onkeydown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (e.currentTarget) {
              e.currentTarget.dispatchEvent(new MouseEvent('click', { bubbles: true }))
            }
          }
        }
      }
    }
  ]

  // Add function to handle target host input changes
  function handleTargetHostInput(event: Event, targetPortId: string) {
    const input = event.target as HTMLInputElement
    const value = input.value

    // Check for port in the host (e.g., localhost:3000)
    const match = value.match(/:(\d+)$/)
    if (match) {
      // Remove the port from the host
      input.value = value.replace(/:(\d+)$/, '')

      // Set the port value
      const portInput = document.getElementById(targetPortId) as HTMLInputElement
      if (portInput && !portInput.value) {
        portInput.value = match[1]
      }
    }
  }

  // Set up periodic status check
  onMount(() => {
    // Initial check
    invalidate('app:caddy-status')

    // Set up interval for subsequent checks
    statusCheckInterval = setInterval(() => {
      invalidate('app:caddy-status')
    }, 5000)
  })

  // Clean up interval when component is destroyed
  onDestroy(() => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval)
    }
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
  })

  let showCreateModal = false
  let showEditModal = false
  let editingHost: (typeof data.hosts)[number] | null = null
  let sslEnabled = true
  let forceSSL = true
  let http2Support = true
  let http3Support = true
  let showAdvanced = false
  let advancedConfig = ''
  let basicAuthEnabled = false
  let basicAuthUsername = ''
  let basicAuthPassword = ''
  let targetProtocol = 'http'
  let isSubmitting = false
  let error: { message: string; details?: string } | null = null
  let ignoreInvalidCert = false
  let editDomain = ''
  let editTargetHost = ''
  let editTargetPort = ''

  // Watch sslEnabled and update dependent settings
  $: if (!sslEnabled) {
    forceSSL = false
    http2Support = false
    http3Support = false
  }

  function handleBasicAuthToggle(event: CustomEvent<boolean>) {
    basicAuthEnabled = event.detail

    if (!basicAuthEnabled) {
      // When disabling, clear the username and password
      basicAuthUsername = ''
      basicAuthPassword = ''
    }
  }

  const handleSubmit: SubmitFunction = ({ formData }) => {
    // Set the form values
    formData.set('sslEnabled', sslEnabled.toString())
    formData.set('forceSSL', forceSSL.toString())
    formData.set('http2Support', http2Support.toString())
    formData.set('http3Support', http3Support.toString())
    formData.set('advancedConfig', showAdvanced ? advancedConfig : '')
    formData.set('basicAuthEnabled', basicAuthEnabled.toString())

    // Set username and password values from binding
    formData.set('basicAuthUsername', basicAuthEnabled ? basicAuthUsername : '')

    // Only set the password if it's not empty
    if (basicAuthPassword && basicAuthPassword.trim() !== '') {
      formData.set('basicAuthPassword', basicAuthPassword)
    }

    formData.set('targetProtocol', targetProtocol)
    formData.set('ignoreInvalidCert', ignoreInvalidCert.toString())

    isSubmitting = true
    error = null

    return async ({ result, update }) => {
      isSubmitting = false
      if (result.type === 'success') {
        showCreateModal = false
        resetForm()
        await update()
      } else if (result.type === 'failure') {
        error = {
          message: result.data?.error || 'Failed to create proxy host',
          details: result.data?.details
        }
      }
    }
  }

  const handleEditSubmit: SubmitFunction = ({ formData }) => {
    if (!editingHost) return

    // Set the form values
    formData.set('id', editingHost.id.toString())
    formData.set('domain', editDomain)
    formData.set('targetHost', editTargetHost)
    formData.set('targetPort', editTargetPort)
    formData.set('sslEnabled', sslEnabled.toString())
    formData.set('forceSSL', forceSSL.toString())
    formData.set('http2Support', http2Support.toString())
    formData.set('http3Support', http3Support.toString())
    formData.set('advancedConfig', showAdvanced ? advancedConfig : '')
    formData.set('basicAuthEnabled', basicAuthEnabled.toString())
    formData.set('basicAuthUsername', basicAuthEnabled ? basicAuthUsername : '')

    // Only set the password if it's not empty
    // Otherwise, delete the field to indicate keeping the existing password
    if (basicAuthPassword && basicAuthPassword.trim() !== '') {
      formData.set('basicAuthPassword', basicAuthPassword)
    } else {
      formData.delete('basicAuthPassword')
    }

    formData.set('targetProtocol', targetProtocol)
    formData.set('ignoreInvalidCert', ignoreInvalidCert.toString())

    isSubmitting = true
    error = null

    return async ({ result, update }) => {
      isSubmitting = false
      if (result.type === 'success') {
        showEditModal = false
        editingHost = null
        await update()
      } else if (result.type === 'failure') {
        error = {
          message: result.data?.error || 'Failed to update proxy host',
          details: result.data?.details
        }
      }
    }
  }

  const handleToggle: SubmitFunction = () => {
    isSubmitting = true
    error = null

    return async ({ result, update }) => {
      isSubmitting = false
      if (result.type === 'success') {
        await update()
      } else if (result.type === 'failure') {
        error = {
          message: result.data?.error || 'Failed to toggle proxy host status',
          details: result.data?.details
        }
      }
    }
  }

  const handleDelete: SubmitFunction = () => {
    isSubmitting = true
    error = null

    return async ({ result, update }) => {
      isSubmitting = false
      if (result.type === 'success') {
        await update()
      } else if (result.type === 'failure') {
        error = {
          message: result.data?.error || 'Failed to delete proxy host',
          details: result.data?.details
        }
      }
    }
  }

  function startEdit(host: (typeof data.hosts)[number]) {
    // Store the host reference
    editingHost = host

    // Set all fields directly
    basicAuthEnabled = Boolean(host.basicAuthEnabled)
    basicAuthUsername = host.basicAuthUsername || ''
    basicAuthPassword = '' // Leave password empty as it's already hashed
    sslEnabled = host.sslEnabled
    forceSSL = host.forceSSL
    http2Support = host.http2Support
    http3Support = host.http3Support
    advancedConfig = host.advancedConfig || ''
    showAdvanced = !!host.advancedConfig
    targetProtocol = host.targetProtocol
    ignoreInvalidCert = host.ignoreInvalidCert

    // Set local variables for form fields
    editDomain = host.domain
    editTargetHost = host.targetHost
    editTargetPort = host.targetPort.toString()

    showEditModal = true
    error = null
  }

  function resetForm() {
    sslEnabled = true
    forceSSL = true
    http2Support = true
    http3Support = true
    showAdvanced = false
    advancedConfig = ''
    basicAuthEnabled = false
    basicAuthUsername = ''
    basicAuthPassword = ''
    targetProtocol = 'http'
    ignoreInvalidCert = false
    error = null
  }
</script>

<div class="py-6">
  <div class="px-4 sm:px-6 lg:px-0">
    <!-- Table -->
    <div
      class="overflow-hidden bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/10 sm:rounded-lg"
    >
      <div class="px-4 py-5 sm:px-6">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
              Proxy Hosts
            </h3>
            <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Configure and manage your proxy host settings.
            </p>
          </div>
          <div class="flex gap-4">
            <div>
              <input
                type="text"
                bind:value={searchQuery}
                placeholder="Search hosts..."
                class="block rounded-md border-0 py-2 px-4 text-gray-900 dark:text-gray-100 dark:bg-gray-700 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-brand-600 dark:focus:ring-brand-500 sm:text-sm sm:leading-6"
              />
            </div>
            <Button
              variant="primary"
              size="xl"
              class_name="py-2 px-4"
              on:click={() => {
                showCreateModal = true
                resetForm()
              }}
            >
              Add Host
            </Button>
          </div>
        </div>
      </div>
      <div class="px-4 pb-5 sm:px-6 sm:pb-6">
        <Table {columns} data={filteredHosts} {rowActions} />
      </div>
    </div>

    <!-- Create Modal -->
    {#if showCreateModal}
      <Modal
        title="Add Proxy Host"
        isOpen={showCreateModal}
        onClose={() => {
          showCreateModal = false
          resetForm()
        }}
      >
        <form method="POST" action="?/create" use:enhance={handleSubmit} class="space-y-6">
          <!-- Basic Configuration -->
          <div class="space-y-4">
            <h4 class="text-base font-medium text-gray-900 dark:text-gray-100">
              Basic Configuration
            </h4>
            <Input
              label="Domain Name"
              name="domain"
              type="text"
              required
              placeholder="example.com"
            />

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div class="sm:col-span-3">
                <Select
                  label="Target Protocol"
                  name="targetProtocol"
                  bind:value={targetProtocol}
                  options={[
                    { value: 'http', label: 'HTTP' },
                    { value: 'https', label: 'HTTPS' }
                  ]}
                />
              </div>
              <div class="sm:col-span-6">
                <Input
                  label="Target Host"
                  name="targetHost"
                  type="text"
                  required
                  placeholder="localhost"
                  on:input={(e) => handleTargetHostInput(e, 'targetPort')}
                />
              </div>
              <div class="sm:col-span-3">
                <Input
                  label="Target Port"
                  name="targetPort"
                  id="targetPort"
                  type="number"
                  required
                  placeholder="8080"
                />
              </div>
            </div>
          </div>

          {#if targetProtocol === 'https'}
            <div class="mt-4">
              <Toggle
                bind:checked={ignoreInvalidCert}
                label="Ignore Invalid Certificate"
                description="Skip SSL certificate validation for target"
                name="ignoreInvalidCert"
              />
            </div>
          {/if}

          <!-- SSL Configuration -->
          <div class="border-t border-gray-200 dark:border-gray-700/30 pt-6">
            <Toggle bind:checked={sslEnabled} label="SSL Configuration" name="sslEnabled" />

            {#if sslEnabled}
              <div class="mt-4 space-y-4">
                <Toggle
                  bind:checked={forceSSL}
                  label="Force SSL"
                  description="Redirect all HTTP traffic to HTTPS"
                  name="forceSSL"
                />
                <Toggle
                  bind:checked={http2Support}
                  label="HTTP/2 Support"
                  description="Enable HTTP/2 protocol support"
                  name="http2Support"
                />
                <Toggle
                  bind:checked={http3Support}
                  label="HTTP/3 Support"
                  description="Enable HTTP/3 protocol support"
                  name="http3Support"
                />
              </div>
            {/if}
          </div>

          <!-- Security -->
          <div class="border-t border-gray-200 dark:border-gray-700/30 pt-6">
            <Toggle
              bind:checked={basicAuthEnabled}
              label="Security"
              description="Enable basic authentication for this proxy"
              name="basicAuthEnabled"
              on:change={handleBasicAuthToggle}
            />

            {#if basicAuthEnabled}
              <div class="mt-4 space-y-4">
                <Input
                  label="Username"
                  name="basicAuthUsername"
                  id="basicAuthUsername"
                  type="text"
                  bind:value={basicAuthUsername}
                  required={basicAuthEnabled}
                />
                <Input
                  label="Password"
                  name="basicAuthPassword"
                  id="basicAuthPassword"
                  type="password"
                  bind:value={basicAuthPassword}
                  helpText="Enter a new password"
                />
              </div>
            {/if}
          </div>

          <!-- Advanced Configuration -->
          <div class="border-t border-gray-200 dark:border-gray-700/30 pt-6">
            <Toggle
              bind:checked={showAdvanced}
              label="Advanced Configuration"
              description="Additional Caddyfile directives for advanced users"
              name="showAdvanced"
            />

            {#if showAdvanced}
              <div class="mt-4 space-y-4">
                <Textarea
                  label="Additional Caddyfile Configuration"
                  name="advancedConfig"
                  bind:value={advancedConfig}
                  rows={4}
                  placeholder="Enter Caddyfile directives (e.g., header /* &#123;X-Frame-Options SAMEORIGIN&#125;)"
                />
              </div>
            {/if}
          </div>

          {#if error}
            <ErrorAlert error={error.message} details={error.details} />
          {/if}

          <div class="mt-6 flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              size="xl"
              on:click={() => {
                showCreateModal = false
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="xl"
              disabled={isSubmitting}
              loading={isSubmitting}
              loadingText="Creating..."
            >
              Create Host
            </Button>
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
          showEditModal = false
          editingHost = null
        }}
      >
        <form method="POST" action="?/edit" use:enhance={handleEditSubmit} class="space-y-6">
          <!-- Basic Configuration -->
          <div class="space-y-4">
            <h4 class="text-base font-medium text-gray-900 dark:text-gray-100">
              Basic Configuration
            </h4>
            <Input label="Domain Name" name="domain" type="text" required bind:value={editDomain} />

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div class="sm:col-span-3">
                <Select
                  label="Target Protocol"
                  name="targetProtocol"
                  bind:value={targetProtocol}
                  options={[
                    { value: 'http', label: 'HTTP' },
                    { value: 'https', label: 'HTTPS' }
                  ]}
                />
              </div>
              <div class="sm:col-span-6">
                <Input
                  label="Target Host"
                  name="targetHost"
                  type="text"
                  required
                  bind:value={editTargetHost}
                  on:input={(e) => handleTargetHostInput(e, 'targetPort')}
                />
              </div>
              <div class="sm:col-span-3">
                <Input
                  label="Target Port"
                  name="targetPort"
                  id="targetPort"
                  type="number"
                  required
                  bind:value={editTargetPort}
                />
              </div>
            </div>
          </div>

          {#if targetProtocol === 'https'}
            <div class="mt-4">
              <Toggle
                bind:checked={ignoreInvalidCert}
                label="Ignore Invalid Certificate"
                description="Skip SSL certificate validation for target"
                name="ignoreInvalidCert"
              />
            </div>
          {/if}

          <!-- SSL Configuration -->
          <div class="border-t border-gray-200 dark:border-gray-700/30 pt-6">
            <Toggle bind:checked={sslEnabled} label="SSL Configuration" name="sslEnabled" />

            {#if sslEnabled}
              <div class="mt-4 space-y-4">
                <Toggle
                  bind:checked={forceSSL}
                  label="Force SSL"
                  description="Redirect all HTTP traffic to HTTPS"
                  name="forceSSL"
                />
                <Toggle
                  bind:checked={http2Support}
                  label="HTTP/2 Support"
                  description="Enable HTTP/2 protocol support"
                  name="http2Support"
                />
                <Toggle
                  bind:checked={http3Support}
                  label="HTTP/3 Support"
                  description="Enable HTTP/3 protocol support"
                  name="http3Support"
                />
              </div>
            {/if}
          </div>

          <!-- Security -->
          <div class="border-t border-gray-200 dark:border-gray-700/30 pt-6">
            <Toggle
              bind:checked={basicAuthEnabled}
              label="Security"
              description="Enable basic authentication for this proxy"
              name="basicAuthEnabled"
              on:change={handleBasicAuthToggle}
            />

            {#if basicAuthEnabled}
              <div class="mt-4 space-y-4">
                <Input
                  label="Username"
                  name="basicAuthUsername"
                  id="editBasicAuthUsername"
                  type="text"
                  bind:value={basicAuthUsername}
                  required={basicAuthEnabled}
                />
                <Input
                  label="Password"
                  name="basicAuthPassword"
                  id="editBasicAuthPassword"
                  type="password"
                  bind:value={basicAuthPassword}
                  helpText="Enter a new password or leave blank to keep the existing one"
                />
              </div>
            {/if}
          </div>

          <!-- Advanced Configuration -->
          <div class="border-t border-gray-200 dark:border-gray-700/30 pt-6">
            <Toggle
              bind:checked={showAdvanced}
              label="Advanced Configuration"
              description="Additional Caddyfile directives for advanced users"
              name="showAdvanced"
            />

            {#if showAdvanced}
              <div class="mt-4 space-y-4">
                <Textarea
                  label="Additional Caddyfile Configuration"
                  name="advancedConfig"
                  bind:value={advancedConfig}
                  rows={4}
                  placeholder="Enter Caddyfile directives (e.g., header /* &#123;X-Frame-Options SAMEORIGIN&#125;)"
                />
              </div>
            {/if}
          </div>

          {#if error}
            <ErrorAlert error={error.message} details={error.details} />
          {/if}

          <div class="mt-6 flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              size="xl"
              on:click={() => {
                showEditModal = false
                editingHost = null
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="xl"
              disabled={isSubmitting}
              loading={isSubmitting}
              loadingText="Saving..."
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    {/if}
  </div>
</div>
