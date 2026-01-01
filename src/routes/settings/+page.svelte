<script lang="ts">
  import { onMount } from "svelte";
  import { db } from "$lib/db";

  let defaultVenue = "";
  let defaultPayTo = "";
  let toast = "";
  let timer: ReturnType<typeof setTimeout> | null = null;

  function showToast(m: string) {
    toast = m;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => (toast = ""), 1500);
  }

  async function load() {
    const s = await getDb().settings.get("default");
    defaultVenue = s?.defaultVenue ?? "";
    defaultPayTo = s?.defaultPayTo ?? "";
  }

  async function save() {
    const existing = await getDb().settings.get("default");
    await getDb().settings.put({
      id: "default",
      defaultVenue,
      defaultPayTo,
      language: existing?.language ?? "en",
      lastTemplateId: existing?.lastTemplateId
    });
    showToast("Saved ✅");
  }

  onMount(load);
</script>

<h2>Settings</h2>

<div style="max-width:520px; display:flex; flex-direction:column; gap:12px;">
  <label>
    Default venue
    <input bind:value={defaultVenue} />
  </label>

  <label>
    Default pay-to
    <input bind:value={defaultPayTo} />
  </label>

  <button on:click={save}>Save</button>
</div>

{#if toast}
  <div style="position:fixed; bottom:18px; left:50%; transform:translateX(-50%);
    background:#111; color:#fff; padding:10px 14px; border-radius:999px; border:1px solid #444;">
    {toast}
  </div>
{/if}
