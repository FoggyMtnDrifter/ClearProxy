<script lang="ts">
  import { enhance } from '$app/forms'
  import { invalidate } from '$app/navigation'
  import { onMount, onDestroy } from 'svelte'
  import type { ProxyHostFormData } from './types'
  import type { SubmitFunction } from '@sveltejs/kit'
  import {
    Modal,
    ErrorAlert,
    Input,
    Table,
    Select,
    Toggle,
    Textarea,
    ActionButton,
    Card,
    TableHeader,
    FormSection,
    FormGroup,
    FormActions,
    EmptyState,
    StatusBadge
  } from '$lib/components'
  import { PencilLine, Trash2, Server } from 'lucide-svelte'

  export let data
  let form: ProxyHostFormData | null = null
  let statusCheckInterval: ReturnType<typeof setInterval>
  let searchQuery = ''
  let searchTimeout: ReturnType<typeof setTimeout>
  let filteredHosts = data.hosts

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
    }, 300)
  }

  // Function to toggle host status
  async function toggleHostStatus(host: (typeof data.hosts)[number]) {
    const formData = new FormData()
    formData.set('id', host.id.toString())
    formData.set('enabled', (!host.enabled).toString())

    console.log(`Toggling host ${host.id} to ${!host.enabled ? 'enabled' : 'disabled'}`)

    isSubmitting = true
    error = null

    try {
      const response = await fetch('?/toggle', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        console.log('Toggle successful, refreshing data')
        await invalidate('app:proxy-hosts')
      } else {
        const data = await response.json()
        console.error('Toggle failed', data)
        error = {
          message: data?.error || 'Failed to toggle proxy host status',
          details: data?.details
        }
      }
    } catch (err) {
      console.error('Toggle error', err)
      error = {
        message: 'Failed to toggle proxy host status',
        details: err instanceof Error ? err.message : String(err)
      }
    } finally {
      isSubmitting = false
    }
  }

  const columns = [
    { header: 'Domain Name', key: 'domain', class: 'font-medium text-gray-900' },
    { header: 'Target Host', key: 'targetHost' },
    { header: 'Target Port', key: 'targetPort' },
    { header: 'Protocol', key: 'targetProtocol' },
    {
      header: 'Status',
      key: 'status',
      class: 'whitespace-nowrap px-3 py-4 text-sm text-gray-500'
    }
  ]

  const rowActions = [
    {
      srLabel: (host: (typeof data.hosts)[number]) => `Edit ${host.domain}`,
      onClick: (host: (typeof data.hosts)[number]) => startEdit(host),
      component: ActionButton,
      props: {
        icon: PencilLine,
        buttonClass:
          'text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 cursor-pointer transition-colors duration-200',
        iconClass: 'size-5'
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
      component: ActionButton,
      props: {
        icon: Trash2,
        buttonClass:
          'text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 cursor-pointer ml-3 transition-colors duration-200',
        iconClass: 'size-5'
      }
    }
  ]

  function handleTargetHostInput(event: Event, targetPortId: string) {
    const input = event.target as HTMLInputElement
    const value = input.value

    const match = value.match(/:(\d+)$/)
    if (match) {
      input.value = value.replace(/:(\d+)$/, '')

      const portInput = document.getElementById(targetPortId) as HTMLInputElement
      if (portInput && !portInput.value) {
        portInput.value = match[1]
      }
    }
  }

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

  $: if (!sslEnabled) {
    forceSSL = false
    http2Support = false
    http3Support = false
  }

  function handleBasicAuthToggle(event: CustomEvent<boolean>) {
    basicAuthEnabled = event.detail

    if (!basicAuthEnabled) {
      basicAuthUsername = ''
      basicAuthPassword = ''
    }
  }

  const handleSubmit: SubmitFunction = ({ formData }) => {
    formData.set('sslEnabled', sslEnabled.toString())
    formData.set('forceSSL', forceSSL.toString())
    formData.set('http2Support', http2Support.toString())
    formData.set('http3Support', http3Support.toString())
    formData.set('advancedConfig', showAdvanced ? advancedConfig : '')
    formData.set('basicAuthEnabled', basicAuthEnabled.toString())
    formData.set('enabled', 'true')

    formData.set('basicAuthUsername', basicAuthEnabled ? basicAuthUsername : '')

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
    formData.set('enabled', 'true')

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
    editingHost = host

    basicAuthEnabled = Boolean(host.basicAuthEnabled)
    basicAuthUsername = host.basicAuthUsername || ''
    basicAuthPassword = ''
    sslEnabled = host.sslEnabled
    forceSSL = host.forceSSL
    http2Support = host.http2Support
    http3Support = host.http3Support
    advancedConfig = host.advancedConfig || ''
    showAdvanced = !!host.advancedConfig
    targetProtocol = host.targetProtocol
    ignoreInvalidCert = host.ignoreInvalidCert

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
    <Card>
      <TableHeader
        title="Proxy Hosts"
        description="Configure and manage your proxy host settings."
        bind:searchQuery
        searchPlaceholder="Search hosts..."
        actionText="Add Host"
        on:search={() => {
          // Search is handled by the reactive statement
        }}
        on:action={() => {
          showCreateModal = true
          resetForm()
        }}
      />
      <div class="px-4 pb-5 sm:px-6 sm:pb-6">
        {#if filteredHosts.length > 0}
          <Table {columns} data={filteredHosts} {rowActions}>
            <svelte:fragment slot="status" let:row>
              <button
                type="button"
                on:click={() => toggleHostStatus(row)}
                class="cursor-pointer hover:opacity-80 transition-opacity"
              >
                <StatusBadge
                  text={row.enabled ? 'Active' : 'Disabled'}
                  type={row.enabled ? 'success' : 'neutral'}
                />
              </button>
            </svelte:fragment>
          </Table>
        {:else}
          <EmptyState
            title="No proxy hosts yet"
            description="Add your first proxy host to get started with ClearProxy"
            icon={Server}
            actionText="Add Host"
            className="mt-10"
            on:action={() => {
              showCreateModal = true
              resetForm()
            }}
          />
        {/if}
      </div>
    </Card>

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
          <FormSection title="Basic Configuration" bordered={false}>
            <Input
              label="Domain Name"
              name="domain"
              type="text"
              required
              placeholder="example.com"
            />

            <div class="flex flex-row space-x-4">
              <div class="w-1/4">
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
              <div class="w-1/2">
                <Input
                  label="Target Host"
                  name="targetHost"
                  type="text"
                  required
                  placeholder="localhost"
                  on:input={(e) => handleTargetHostInput(e, 'targetPort')}
                />
              </div>
              <div class="w-1/4">
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
          </FormSection>

          {#if targetProtocol === 'https'}
            <FormSection bordered={false}>
              <Toggle
                bind:checked={ignoreInvalidCert}
                label="Ignore Invalid Certificate"
                description="Skip SSL certificate validation for target"
                name="ignoreInvalidCert"
              />
            </FormSection>
          {/if}

          <FormSection title="SSL Configuration">
            <Toggle bind:checked={sslEnabled} label="Enable SSL" name="sslEnabled" />

            {#if sslEnabled}
              <FormGroup layout="stack" gap={4}>
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
              </FormGroup>
            {/if}
          </FormSection>

          <FormSection title="Security">
            <Toggle
              bind:checked={basicAuthEnabled}
              label="Basic Authentication"
              description="Enable basic authentication for this proxy"
              name="basicAuthEnabled"
              on:change={handleBasicAuthToggle}
            />

            {#if basicAuthEnabled}
              <FormGroup layout="stack" gap={4}>
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
              </FormGroup>
            {/if}
          </FormSection>

          <FormSection title="Advanced Configuration">
            <Toggle
              bind:checked={showAdvanced}
              label="Custom Caddyfile Directives"
              description="Additional Caddyfile directives for advanced users"
              name="showAdvanced"
            />

            {#if showAdvanced}
              <Textarea
                label="Additional Caddyfile Configuration"
                name="advancedConfig"
                bind:value={advancedConfig}
                rows={4}
                placeholder="Enter Caddyfile directives (e.g., header /* &#123;X-Frame-Options SAMEORIGIN&#125;)"
              />
            {/if}
          </FormSection>

          {#if error}
            <ErrorAlert error={error.message} details={error.details} />
          {/if}

          <FormActions
            submitText="Create Host"
            cancelText="Cancel"
            loading={isSubmitting}
            loadingText="Creating..."
            disabled={isSubmitting}
            on:cancel={() => {
              showCreateModal = false
              resetForm()
            }}
          />
        </form>
      </Modal>
    {/if}

    {#if showEditModal && editingHost}
      <Modal
        title="Edit Proxy Host"
        isOpen={showEditModal}
        onClose={() => {
          showEditModal = false
          editingHost = null
        }}
      >
        <form method="POST" action="?/update" use:enhance={handleEditSubmit} class="space-y-6">
          <FormSection title="Basic Configuration" bordered={false}>
            <Input label="Domain Name" name="domain" type="text" required bind:value={editDomain} />

            <div class="flex flex-row space-x-4">
              <div class="w-1/4">
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
              <div class="w-1/2">
                <Input
                  label="Target Host"
                  name="targetHost"
                  type="text"
                  required
                  bind:value={editTargetHost}
                  on:input={(e) => handleTargetHostInput(e, 'targetPort')}
                />
              </div>
              <div class="w-1/4">
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
          </FormSection>

          {#if targetProtocol === 'https'}
            <FormSection bordered={false}>
              <Toggle
                bind:checked={ignoreInvalidCert}
                label="Ignore Invalid Certificate"
                description="Skip SSL certificate validation for target"
                name="ignoreInvalidCert"
              />
            </FormSection>
          {/if}

          <FormSection title="SSL Configuration">
            <Toggle bind:checked={sslEnabled} label="Enable SSL" name="sslEnabled" />

            {#if sslEnabled}
              <FormGroup layout="stack" gap={4}>
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
              </FormGroup>
            {/if}
          </FormSection>

          <FormSection title="Security">
            <Toggle
              bind:checked={basicAuthEnabled}
              label="Basic Authentication"
              description="Enable basic authentication for this proxy"
              name="basicAuthEnabled"
              on:change={handleBasicAuthToggle}
            />

            {#if basicAuthEnabled}
              <FormGroup layout="stack" gap={4}>
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
              </FormGroup>
            {/if}
          </FormSection>

          <FormSection title="Advanced Configuration">
            <Toggle
              bind:checked={showAdvanced}
              label="Custom Caddyfile Directives"
              description="Additional Caddyfile directives for advanced users"
              name="showAdvanced"
            />

            {#if showAdvanced}
              <Textarea
                label="Additional Caddyfile Configuration"
                name="advancedConfig"
                bind:value={advancedConfig}
                rows={4}
                placeholder="Enter Caddyfile directives (e.g., header /* &#123;X-Frame-Options SAMEORIGIN&#125;)"
              />
            {/if}
          </FormSection>

          {#if error}
            <ErrorAlert error={error.message} details={error.details} />
          {/if}

          <FormActions
            submitText="Save Changes"
            cancelText="Cancel"
            loading={isSubmitting}
            loadingText="Saving..."
            disabled={isSubmitting}
            on:cancel={() => {
              showEditModal = false
              editingHost = null
            }}
          />
        </form>
      </Modal>
    {/if}
  </div>
</div>
