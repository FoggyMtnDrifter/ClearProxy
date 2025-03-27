<script context="module">
  type ClickOutsideHandler = () => void

  function clickOutside(node: HTMLElement, handler: ClickOutsideHandler) {
    const handleClick = (event: MouseEvent) => {
      if (node && !node.contains(event.target as Node) && !event.defaultPrevented) {
        handler()
      }
    }

    document.addEventListener('click', handleClick, true)

    return {
      destroy() {
        document.removeEventListener('click', handleClick, true)
      }
    }
  }
</script>

<script lang="ts">
  /**
   * @component ProxyHostsPage
   * @description Manages proxy host configurations for the application.
   *
   * This page allows users to view, add, edit, and delete proxy host configurations,
   * with options for SSL, authentication, and advanced settings.
   */
  import { enhance } from '$app/forms'
  import { invalidate } from '$app/navigation'
  import { onMount, onDestroy } from 'svelte'
  import type { ProxyHostFormData } from './types'
  import type { SubmitFunction } from '@sveltejs/kit'
  import type { ProxyHostWithCert } from '$lib/models/proxyHost'
  import {
    Modal,
    Alert,
    Input,
    Table,
    Select,
    Toggle,
    Textarea,
    ActionButton,
    Card,
    FormSection,
    FormGroup,
    FormActions,
    EmptyState,
    StatusBadge,
    Button
  } from '$lib/components'
  import { PencilLine, Trash2, Server, Filter as FilterIcon } from 'lucide-svelte'

  export let data
  let statusCheckInterval: ReturnType<typeof setInterval>
  let searchQuery = ''
  let searchTimeout: ReturnType<typeof setTimeout>
  let filteredHosts = data.hosts
  let isCaddyRunning = data.caddyRunning
  let isLoadingCertificates = data.loadingCertificates || false
  let certificatesLoaded = !isLoadingCertificates

  let protocolFilter = 'all'
  let statusFilter = 'all'
  let sslFilter = 'all'

  let sortColumn: string | null = null
  let sortDirection: 'asc' | 'desc' = 'asc'

  let showFilters = true

  let showFilterDropdown = false
  let filterButtonRect: DOMRect | null = null

  function toggleFilterDropdown() {
    if (!showFilterDropdown) {
      const buttonEl = document.querySelector('.filter-button') as HTMLElement
      if (buttonEl) {
        filterButtonRect = buttonEl.getBoundingClientRect()
      }
    }
    showFilterDropdown = !showFilterDropdown
  }

  function closeFilterDropdown() {
    showFilterDropdown = false
  }

  $: {
    isCaddyRunning = data.caddyRunning
    console.log(`Caddy running state updated: ${isCaddyRunning}`)
  }

  $: filterState = {
    protocol: protocolFilter,
    status: statusFilter,
    ssl: sslFilter,
    search: searchQuery
  }

  $: {
    if (showFilters) {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => {
        applyFilters()
      }, 300)
    }
  }

  $: if (showFilters && filterState) {
    applyFilters()
  }

  function applyFilters() {
    let results = [...data.hosts]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      results = results.filter(
        (host) =>
          host.domain.toLowerCase().includes(query) ||
          host.targetHost.toLowerCase().includes(query) ||
          host.targetPort.toString().includes(query) ||
          host.targetProtocol.toLowerCase().includes(query)
      )
    }

    if (protocolFilter !== 'all') {
      results = results.filter((host) => host.targetProtocol === protocolFilter)
    }

    if (statusFilter !== 'all') {
      results = results.filter(
        (host) =>
          (statusFilter === 'active' && host.enabled) ||
          (statusFilter === 'disabled' && !host.enabled)
      )
    }

    if (sslFilter !== 'all') {
      results = results.filter(
        (host) =>
          (sslFilter === 'enabled' && host.sslEnabled) ||
          (sslFilter === 'disabled' && !host.sslEnabled)
      )
    }

    if (sortColumn) {
      results.sort((a, b) => {
        let valueA = a[sortColumn as keyof typeof a] ?? ''
        let valueB = b[sortColumn as keyof typeof b] ?? ''

        if (typeof valueA === 'string') valueA = valueA.toLowerCase()
        if (typeof valueB === 'string') valueB = valueB.toLowerCase()

        if (sortDirection === 'asc') {
          if (valueA < valueB) return -1
          if (valueA > valueB) return 1
          return 0
        } else {
          if (valueA > valueB) return -1
          if (valueA < valueB) return 1
          return 0
        }
      })
    }

    filteredHosts = results
  }

  function handleSort(column: string, direction: 'asc' | 'desc') {
    sortColumn = column
    sortDirection = direction
    applyFilters()
  }

  function clearAllFilters() {
    searchQuery = ''

    showFilters = false

    protocolFilter = 'all'
    statusFilter = 'all'
    sslFilter = 'all'

    sortColumn = null
    sortDirection = 'asc'

    filteredHosts = [...data.hosts]

    setTimeout(() => {
      showFilters = true
    }, 50)
  }

  async function toggleHostStatus(host: (typeof data.hosts)[number]) {
    if (!data.caddyRunning) {
      error = {
        message: 'Cannot modify proxy hosts',
        details: 'Caddy server is not running. Please start Caddy before making changes.'
      }
      return
    }

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
    { header: 'Domain Name', key: 'domain', class: 'font-medium text-gray-900', sortable: true },
    { header: 'Target Host', key: 'targetHost', sortable: true },
    { header: 'Target Port', key: 'targetPort', sortable: true },
    { header: 'Protocol', key: 'targetProtocol', sortable: true },
    {
      header: 'Status',
      key: 'status',
      class: 'whitespace-nowrap px-3 py-4 text-gray-500'
    }
  ]

  const rowActions = [
    {
      srLabel: (host: (typeof data.hosts)[number]) => `Edit ${host.domain}`,
      onClick: (host: (typeof data.hosts)[number]) => {
        if (!data.caddyRunning) {
          error = {
            message: 'Cannot edit proxy hosts',
            details: 'Caddy server is not running. Please start Caddy before making changes.'
          }
          return
        }
        startEdit(host)
      },
      component: ActionButton,
      props: {
        icon: PencilLine,
        buttonClass: 'text-gray-600 dark:text-gray-300 transition-colors duration-200',
        iconClass: 'size-5',
        disabled: !data.caddyRunning
      }
    },
    {
      srLabel: (host: (typeof data.hosts)[number]) => `Delete ${host.domain}`,
      onClick: async (host: (typeof data.hosts)[number]) => {
        if (!data.caddyRunning) {
          error = {
            message: 'Cannot delete proxy hosts',
            details: 'Caddy server is not running. Please start Caddy before making changes.'
          }
          return
        }

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
        buttonClass: 'text-red-600 dark:text-red-300 ml-3 transition-colors duration-200',
        iconClass: 'size-5',
        disabled: !data.caddyRunning
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
    // Start the regular status updates
    statusCheckInterval = setInterval(async () => {
      await invalidate('app:caddy-status')
    }, 30000) // Check every 30 seconds

    // If we have SSL hosts, fetch their certificate info in the background
    if (isLoadingCertificates) {
      setTimeout(async () => {
        try {
          const response = await fetch('?/fetchCertificates', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          })

          if (response.ok) {
            const result = await response.json()
            if (result.data && result.data.hosts) {
              // Update the hosts with certificate information
              const sslHosts = result.data.hosts as ProxyHostWithCert[]
              const hostMap = new Map(sslHosts.map((h) => [h.id, h]))

              data.hosts = data.hosts.map((host) => {
                if (host.sslEnabled && hostMap.has(host.id)) {
                  return hostMap.get(host.id) || host
                }
                return host
              })

              filteredHosts = [...data.hosts]
              applyFilters()
            }
          }
        } catch (err) {
          console.error('Error loading certificate data:', err)
        } finally {
          isLoadingCertificates = false
          certificatesLoaded = true
        }
      }, 100) // Start loading certificates shortly after component is mounted
    }
  })

  onDestroy(() => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval)
    }
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
  })

  $: isCaddyRunning = data.caddyRunning

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
    {#if error && !showCreateModal && !showEditModal}
      <div class="mb-6">
        <Alert type="error" title={error.message} message={error.details} />
      </div>
    {/if}

    <Card
      title="Proxy Hosts"
      description="Manage your reverse proxy domain configurations.{isLoadingCertificates
        ? ' Loading SSL certificates...'
        : ''}"
    >
      <div class="mb-6">
        <div class="flex flex-wrap gap-4 items-end relative">
          <div class="w-full sm:w-64">
            <Input
              type="search"
              label=""
              name="search"
              placeholder="Search domains, hosts, or ports..."
              bind:value={searchQuery}
            />
          </div>

          <div class="relative">
            <Button
              variant="secondary"
              size="md"
              on:click={toggleFilterDropdown}
              class_name="h-9 flex items-center gap-2 filter-button"
            >
              <FilterIcon size={14} />
              <span>Filter</span>
              {#if protocolFilter !== 'all' || statusFilter !== 'all' || sslFilter !== 'all'}
                <span
                  class="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ml-1"
                >
                  {(protocolFilter !== 'all' ? 1 : 0) +
                    (statusFilter !== 'all' ? 1 : 0) +
                    (sslFilter !== 'all' ? 1 : 0)}
                </span>
              {/if}
            </Button>
          </div>

          {#if searchQuery && !(protocolFilter !== 'all' || statusFilter !== 'all' || sslFilter !== 'all')}
            <div class="pb-[1px]">
              <Button variant="secondary" size="md" class_name="h-9" on:click={clearAllFilters}
                >Clear Search</Button
              >
            </div>
          {/if}

          <div class="ml-auto sm:ml-auto pb-[1px] w-full sm:w-auto mt-3 sm:mt-0">
            <Button
              variant="primary"
              size="md"
              disabled={!isCaddyRunning}
              class_name="h-9 w-full sm:w-auto"
              on:click={() => {
                if (!isCaddyRunning) {
                  error = {
                    message: 'Cannot add proxy hosts',
                    details:
                      'Caddy server is not running. Please start Caddy before making changes.'
                  }
                  return
                }
                showCreateModal = true
                resetForm()
              }}
            >
              Add Host
            </Button>
          </div>
        </div>
      </div>

      {#if filteredHosts.length > 0}
        <Table
          {columns}
          data={filteredHosts}
          {rowActions}
          consistentColumnPadding={true}
          removeHorizontalPadding={true}
          {sortColumn}
          {sortDirection}
          onSort={handleSort}
        >
          <svelte:fragment slot="status" let:row>
            <button
              type="button"
              on:click={() => toggleHostStatus(row)}
              class={isCaddyRunning
                ? 'cursor-pointer hover:opacity-80 transition-opacity'
                : 'cursor-not-allowed opacity-90 transition-opacity'}
              aria-disabled={!isCaddyRunning}
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
          title="No proxy hosts found"
          description={searchQuery ||
          protocolFilter !== 'all' ||
          statusFilter !== 'all' ||
          sslFilter !== 'all'
            ? 'No hosts match your filters. Try adjusting your search criteria.'
            : 'Add your first proxy host to get started.'}
          icon={Server}
          actionText={isCaddyRunning
            ? searchQuery ||
              protocolFilter !== 'all' ||
              statusFilter !== 'all' ||
              sslFilter !== 'all'
              ? 'Clear Filters'
              : 'Add Host'
            : undefined}
          disabled={!isCaddyRunning}
          on:action={() => {
            if (
              searchQuery ||
              protocolFilter !== 'all' ||
              statusFilter !== 'all' ||
              sslFilter !== 'all'
            ) {
              clearAllFilters()
            } else if (isCaddyRunning) {
              showCreateModal = true
              resetForm()
            }
          }}
        />
      {/if}
    </Card>

    {#if showFilterDropdown && filterButtonRect}
      <div
        class="fixed inset-0 z-40"
        on:click|stopPropagation={closeFilterDropdown}
        on:keydown={(e) => e.key === 'Escape' && closeFilterDropdown()}
        role="button"
        tabindex="0"
        aria-label="Close filters"
      ></div>

      <div
        class="fixed z-[999] w-[280px] bg-white dark:bg-gray-900 rounded-md shadow-lg flex flex-col border border-gray-200 dark:border-gray-700"
        style="top: {filterButtonRect.bottom + window.scrollY + 8}px; left: {Math.min(
          filterButtonRect.left + window.scrollX,
          window.innerWidth - 290
        )}px; max-width: calc(100vw - 20px);"
        use:clickOutside={closeFilterDropdown}
      >
        <div class="p-3 border-b border-gray-200 dark:border-gray-700">
          <h3 class="font-semibold text-gray-800 dark:text-gray-200">Filter Options</h3>
        </div>

        <div class="p-3 flex flex-col gap-3">
          {#if showFilters}
            <div class="w-full">
              <Select
                label="Protocol"
                name="protocolFilter"
                bind:value={protocolFilter}
                options={[
                  { value: 'all', label: 'All Protocols' },
                  { value: 'http', label: 'HTTP' },
                  { value: 'https', label: 'HTTPS' }
                ]}
              />
            </div>

            <div class="w-full">
              <Select
                label="Status"
                name="statusFilter"
                bind:value={statusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'disabled', label: 'Disabled' }
                ]}
              />
            </div>

            <div class="w-full">
              <Select
                label="SSL"
                name="sslFilter"
                bind:value={sslFilter}
                options={[
                  { value: 'all', label: 'All SSL' },
                  { value: 'enabled', label: 'SSL Enabled' },
                  { value: 'disabled', label: 'SSL Disabled' }
                ]}
              />
            </div>
          {:else}
            <div class="h-[100px] flex items-center justify-center">
              <span class="text-gray-400">Loading filters...</span>
            </div>
          {/if}
        </div>

        {#if protocolFilter !== 'all' || statusFilter !== 'all' || sslFilter !== 'all'}
          <div
            class="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-md"
          >
            <Button
              variant="secondary"
              size="sm"
              class_name="w-full justify-center"
              on:click={() => {
                clearAllFilters()
                closeFilterDropdown()
              }}
            >
              Clear Filters
            </Button>
          </div>
        {/if}
      </div>
    {/if}

    {#if showCreateModal}
      <Modal
        title="Add Proxy Host"
        isOpen={showCreateModal}
        onClose={() => {
          showCreateModal = false
          error = null
        }}
      >
        {#if error}
          <div class="mb-4">
            <Alert type="error" title={error.message} message={error.details} />
          </div>
        {/if}

        <form method="POST" action="?/create" use:enhance={handleSubmit} class="space-y-6">
          <FormSection title="Basic Configuration" bordered={false}>
            <Input
              label="Domain Name"
              name="domain"
              type="text"
              required
              placeholder="example.com"
            />

            <div class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div class="w-full sm:w-1/4">
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
              <div class="w-full sm:w-1/2">
                <Input
                  label="Target Host"
                  name="targetHost"
                  type="text"
                  required
                  placeholder="localhost"
                  on:input={(e) => handleTargetHostInput(e, 'targetPort')}
                />
              </div>
              <div class="w-full sm:w-1/4">
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
            <FormSection bordered={false} className="px-1">
              <Toggle
                bind:checked={ignoreInvalidCert}
                label="Ignore Invalid Certificate"
                description="Skip SSL certificate validation for target"
                name="ignoreInvalidCert"
              />
            </FormSection>
          {/if}

          <FormSection title="SSL Configuration" className="px-1">
            <Toggle bind:checked={sslEnabled} label="Enable SSL" name="sslEnabled" />

            {#if sslEnabled}
              <FormGroup layout="stack" gap={4} className="space-y-3">
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

          <FormSection title="Security" className="px-1">
            <Toggle
              bind:checked={basicAuthEnabled}
              label="Basic Authentication"
              description="Enable basic authentication for this proxy"
              name="basicAuthEnabled"
              on:change={handleBasicAuthToggle}
            />

            {#if basicAuthEnabled}
              <FormGroup layout="stack" gap={4} className="space-y-3">
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

          <FormSection title="Advanced Configuration" className="px-1">
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
          error = null
        }}
      >
        {#if error}
          <div class="mb-4">
            <Alert type="error" title={error.message} message={error.details} />
          </div>
        {/if}

        <form method="POST" action="?/update" use:enhance={handleEditSubmit} class="space-y-6">
          <FormSection title="Basic Configuration" bordered={false}>
            <Input label="Domain Name" name="domain" type="text" required bind:value={editDomain} />

            <div class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div class="w-full sm:w-1/4">
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
              <div class="w-full sm:w-1/2">
                <Input
                  label="Target Host"
                  name="targetHost"
                  type="text"
                  required
                  bind:value={editTargetHost}
                  on:input={(e) => handleTargetHostInput(e, 'targetPort')}
                />
              </div>
              <div class="w-full sm:w-1/4">
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
            <FormSection bordered={false} className="px-1">
              <Toggle
                bind:checked={ignoreInvalidCert}
                label="Ignore Invalid Certificate"
                description="Skip SSL certificate validation for target"
                name="ignoreInvalidCert"
              />
            </FormSection>
          {/if}

          <FormSection title="SSL Configuration" className="px-1">
            <Toggle bind:checked={sslEnabled} label="Enable SSL" name="sslEnabled" />

            {#if sslEnabled}
              <FormGroup layout="stack" gap={4} className="space-y-3">
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

          <FormSection title="Security" className="px-1">
            <Toggle
              bind:checked={basicAuthEnabled}
              label="Basic Authentication"
              description="Enable basic authentication for this proxy"
              name="basicAuthEnabled"
              on:change={handleBasicAuthToggle}
            />

            {#if basicAuthEnabled}
              <FormGroup layout="stack" gap={4} className="space-y-3">
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

          <FormSection title="Advanced Configuration" className="px-1">
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
