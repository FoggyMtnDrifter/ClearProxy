<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';
  import Input from '$lib/components/Input.svelte';

  export let form: ActionData;
  export let data: PageData;
</script>

<div class="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-sm">
    <h2 class="mt-6 text-center text-2xl/9 font-bold tracking-tight text-gray-900">Sign in to your account</h2>
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
          <label for="password" class="block text-sm/6 font-medium text-gray-900">Password</label>
          <!-- Uncomment when implementing password reset
          <div class="text-sm">
            <a href="/auth/reset-password" class="font-semibold text-indigo-600 hover:text-indigo-500">Forgot password?</a>
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
        <button
          type="submit"
          class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Sign in
        </button>
      </div>
    </form>

    {#if data.registrationAllowed}
      <p class="mt-10 text-center text-sm/6 text-gray-500">
        Need an account?
        <a href="/auth/register" class="font-semibold text-indigo-600 hover:text-indigo-500">Register here</a>
      </p>
    {/if}
  </div>
</div> 