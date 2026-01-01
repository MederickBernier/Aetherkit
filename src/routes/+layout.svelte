<script lang="ts">
  import { onMount } from "svelte";
  import { ensureSeeded } from "$lib/db/seed";

  onMount(async () => {
    await ensureSeeded();
  });
</script>

<slot />
