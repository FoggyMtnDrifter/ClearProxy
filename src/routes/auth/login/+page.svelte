<script lang="ts">
  import { enhance } from '$app/forms'
  import type { ActionData, PageData } from './$types'
  import Input from '$lib/components/Input.svelte'
  import Button from '$lib/components/Button.svelte'
  import Logo from '$lib/components/Logo.svelte'

  export let form: ActionData
  export let data: PageData
</script>

<div class="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8 dark:bg-gray-900">
  <div class="sm:mx-auto sm:w-full sm:max-w-sm">
    <div class="flex justify-center">
      <Logo variant="dark" className="h-12 w-auto mb-6" />
    </div>
    <h2
      class="mt-6 text-center text-2xl/9 font-bold tracking-tight text-gray-900 dark:text-gray-100"
    >
      Sign in to your account
    </h2>
  </div>

  <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
    <form method="POST" use:enhance class="space-y-6">
      <Input
        type="email"
        name="email"
        label="Email address"
        required
        placeholder="you@example.com"
        error={form?.error}
        autocomplete="email"
      />

      <div>
        <div class="flex items-center justify-between">
          <label for="password" class="block text-sm/6 font-medium text-gray-900 dark:text-gray-100"
            >Password</label
          >
          <!-- Uncomment when implementing password reset
          <div class="text-sm">
            <a href="/auth/reset-password" class="font-semibold text-brand-600 hover:text-brand-500">Forgot password?</a>
          </div>
          -->
        </div>
        <div class="mt-2">
          <Input
            type="password"
            name="password"
            required
            placeholder="Password"
            error={form?.error}
            autocomplete="current-password"
          />
        </div>
      </div>

      <div>
        <Button type="submit" variant="primary" size="md" class_name="w-full justify-center">
          Sign in
        </Button>
      </div>
    </form>

    {#if data.registrationAllowed}
      <p class="mt-10 text-center text-sm/6 text-gray-500 dark:text-gray-400">
        Need an account?
        <a href="/auth/register" class="font-semibold text-brand-600 hover:text-brand-500"
          >Register here</a
        >
      </p>
    {/if}
  </div>
</div>
