<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';
  import Input from '$lib/components/Input.svelte';
  import Button from '$lib/components/Button.svelte';

  export let form: ActionData;
</script>

<div class="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-sm">
    <h2 class="mt-6 text-center text-2xl/9 font-bold tracking-tight text-gray-900">Create your account</h2>
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
        <Button
          type="submit"
          variant="primary"
          size="md"
          class_name="w-full justify-center"
        >
          Create account
        </Button>
      </div>
    </form>

    <p class="mt-10 text-center text-sm/6 text-gray-500">
      Already have an account?
      <a href="/auth/login" class="font-semibold text-indigo-600 hover:text-indigo-500">Sign in here</a>
    </p>
  </div>
</div> 