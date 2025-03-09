<script lang="ts">
  /**
   * @component RegisterPage
   * @description User registration page for creating a new account
   *
   * This page provides a form for users to create a new account with full name,
   * email address, and password inputs. It displays validation errors and
   * provides navigation to the login page for existing users.
   */
  import { enhance } from '$app/forms'
  import type { ActionData } from './$types'
  import { Input, Button, Logo } from '$lib/components'

  /**
   * Form data returned from the form action, containing any validation errors
   * @type {ActionData}
   */
  export let form: ActionData
</script>

<div class="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8 dark:bg-gray-900">
  <div class="sm:mx-auto sm:w-full sm:max-w-sm">
    <div class="flex justify-center">
      <Logo variant="dark" className="h-12 w-auto mb-6" />
    </div>
    <h2
      class="mt-6 text-center text-2xl/9 font-bold tracking-tight text-gray-900 dark:text-gray-100"
    >
      Create your account
    </h2>
  </div>

  <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
    <form method="POST" use:enhance class="space-y-6">
      <Input
        type="text"
        name="name"
        label="Full name"
        required
        placeholder="Full name"
        error={form?.error}
        autocomplete="name"
      />

      <Input
        type="email"
        name="email"
        label="Email address"
        required
        placeholder="you@example.com"
        error={form?.error}
        autocomplete="email"
      />

      <Input
        type="password"
        name="password"
        label="Password"
        required
        placeholder="Password"
        error={form?.error}
        autocomplete="new-password"
      />

      <div>
        <Button type="submit" variant="primary" size="md" class_name="w-full justify-center">
          Create account
        </Button>
      </div>
    </form>

    <p class="mt-10 text-center text-sm/6 text-gray-500 dark:text-gray-400">
      Already have an account?
      <a href="/auth/login" class="font-semibold text-brand-600 hover:text-brand-500"
        >Sign in here</a
      >
    </p>
  </div>
</div>
