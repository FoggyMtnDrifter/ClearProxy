<script lang="ts">
  import Icon from './Icons.svelte'
  export let error: string
  export let details: string | undefined = undefined
</script>

<div class="rounded-md bg-red-50 p-4 dark:bg-red-950">
  <div class="flex">
    <div class="shrink-0">
      <Icon type="error" className="size-5 text-red-400 dark:text-red-300" />
    </div>
    <div class="ml-3">
      <h3 class="text-sm font-medium text-red-800 dark:text-red-300">{error}</h3>
      {#if details}
        <div class="mt-2 text-sm text-red-700 dark:text-red-400">
          <p>{details}</p>
        </div>
      {/if}
    </div>
  </div>
</div>
