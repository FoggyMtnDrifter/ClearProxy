<!--
  Profile Edit Page
  Allows users to update their profile information and change their password
-->
<script lang="ts">
  /**
   * @component ProfileEditPage
   * @description Allows users to update their profile information and change their password
   *
   * This page provides forms for users to edit their personal details and security credentials.
   * It also includes admin tools for resetting other users' passwords via CLI.
   */
  import { enhance } from '$app/forms'
  import type { PageData } from './$types'
  import { fade } from 'svelte/transition'
  import Input from '$lib/components/Input.svelte'
  import Button from '$lib/components/Button.svelte'
  import ErrorAlert from '$lib/components/ErrorAlert.svelte'
  import { invalidateAll } from '$app/navigation'
  import { ClipboardCopy, Check } from 'lucide-svelte'

  export let data: PageData
  export let form: any

  let profileSuccess = false
  let passwordSuccess = false
  let copySuccess = false

  /**
   * Reset success messages after 5 seconds
   */
  function resetSuccessMessages() {
    setTimeout(() => {
      profileSuccess = false
      passwordSuccess = false
    }, 5000)
  }

  /**
   * Copy command to clipboard
   */
  function copyToClipboard() {
    const command = `./src/cli/reset-password.sh --email ${data.user.email} --password newpassword`
    navigator.clipboard
      .writeText(command)
      .then(() => {
        copySuccess = true
        setTimeout(() => {
          copySuccess = false
        }, 2000)
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err)
      })
  }
</script>

<svelte:head>
  <title>Edit Profile | ClearProxy</title>
</svelte:head>

<div class="py-6">
  <div class="px-4 sm:px-6 lg:px-0">
    <div class="space-y-6">
      <!-- Profile Information Form -->
      <div
        class="overflow-hidden bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/10 sm:rounded-lg"
      >
        <div class="px-4 py-5 sm:px-6">
          <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
            Profile Information
          </h3>
          <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Update your personal details and contact information.
          </p>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-700">
          <div class="px-4 py-5 sm:p-6">
            {#if profileSuccess}
              <div
                class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 dark:bg-green-900 dark:border-green-700 dark:text-green-300"
                transition:fade
              >
                <p>Profile updated successfully!</p>
              </div>
            {/if}

            {#if form?.updateProfile && form?.error}
              <ErrorAlert error={form.error} />
            {/if}

            <form
              method="POST"
              action="?/updateProfile"
              use:enhance={() => {
                return async ({ update, result }) => {
                  // Apply the form result from the server without resetting the form
                  // This keeps the form values intact
                  await update({ reset: false })

                  if (
                    result.type === 'success' &&
                    result.data?.updateProfile &&
                    result.data?.success
                  ) {
                    // Show success message
                    profileSuccess = true
                    resetSuccessMessages()

                    // Reload page data to get updated user information
                    await invalidateAll()
                  }
                }
              }}
              class="space-y-6 max-w-lg"
            >
              <Input
                type="text"
                id="name"
                name="name"
                label="Name"
                value={data.user.name}
                required
                error={form?.updateProfile?.error?.name}
              />

              <Input
                type="email"
                id="email"
                name="email"
                label="Email"
                value={data.user.email}
                required
                error={form?.updateProfile?.error?.email}
                autocomplete="email"
              />

              <div class="pt-2">
                <Button type="submit" variant="primary" size="lg">Update Profile</Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Change Password Form -->
      <div
        class="overflow-hidden bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/10 sm:rounded-lg"
      >
        <div class="px-4 py-5 sm:px-6">
          <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
            Change Password
          </h3>
          <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Update your password to maintain account security.
          </p>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-700">
          <div class="px-4 py-5 sm:p-6">
            {#if passwordSuccess}
              <div
                class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 dark:bg-green-900 dark:border-green-700 dark:text-green-300"
                transition:fade
              >
                <p>Password updated successfully!</p>
              </div>
            {/if}

            {#if form?.changePassword && form?.error}
              <ErrorAlert error={form.error} />
            {/if}

            <form
              method="POST"
              action="?/changePassword"
              use:enhance={() => {
                return async ({ update, result, formElement }) => {
                  // Apply the form result from the server
                  await update({ reset: false })

                  if (
                    result.type === 'success' &&
                    result.data?.changePassword &&
                    result.data?.success
                  ) {
                    // Show success message
                    passwordSuccess = true
                    // For password fields, we want to clear them after success for security
                    formElement.reset()
                    resetSuccessMessages()

                    // Reload page data to get updated user information
                    await invalidateAll()
                  }
                }
              }}
              class="space-y-6 max-w-lg"
            >
              <Input
                type="password"
                id="currentPassword"
                name="currentPassword"
                label="Current Password"
                required
                autocomplete="current-password"
              />

              <Input
                type="password"
                id="newPassword"
                name="newPassword"
                label="New Password"
                required
                autocomplete="new-password"
              />

              <Input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm New Password"
                required
                autocomplete="new-password"
              />

              <div class="pt-2">
                <Button type="submit" variant="primary" size="lg">Change Password</Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {#if data.user.isAdmin}
        <div
          class="overflow-hidden bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/10 sm:rounded-lg"
        >
          <div class="px-4 py-5 sm:px-6">
            <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
              Admin Password Reset
            </h3>
            <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Tools for administrators to reset user passwords.
            </p>
          </div>

          <div class="border-t border-gray-200 dark:border-gray-700">
            <div class="px-4 py-5 sm:p-6">
              <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
                As an admin, you can reset user passwords using the provided shell script. Run the
                following command on the server:
              </p>
              <div
                class="bg-gray-100 dark:bg-gray-700 p-3 rounded-md overflow-x-auto relative group"
              >
                <code class="text-sm"
                  >./src/cli/reset-password.sh --email {data.user.email} --password newpassword</code
                >
                <button
                  class="absolute right-2 top-2 p-1.5 rounded-md bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-gray-300 dark:hover:bg-gray-500 transition-opacity"
                  title={copySuccess ? 'Copied!' : 'Copy to clipboard'}
                  on:click={copyToClipboard}
                >
                  {#if copySuccess}
                    <Check size={16} />
                  {:else}
                    <ClipboardCopy size={16} />
                  {/if}
                </button>
              </div>
              <p class="mt-3 text-xs text-gray-500 dark:text-gray-500">
                The script provides a secure way to reset any user's password through the command
                line.
              </p>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
