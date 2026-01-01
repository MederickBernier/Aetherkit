<script lang="ts">
  import { onMount } from "svelte";
  import type { Template } from "$lib/db/schema";
  import { extractTokens, renderTemplate } from "$lib/templates/engine";
  import { copyToClipboard } from "$lib/ui/clipboard";
  import {
    listTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleFavorite
  } from "$lib/db/templates";
  import { getDb } from "$lib/db";
  import { duplicateTemplate } from "$lib/db/templates";
  import { downloadTextFile } from "$lib/ui/download";


  let templates: Template[] = [];
  let selectedId: string | null = null;
  let selected: Template | null = null;

  let search = "";
  let tokenValues: Record<string, string> = {};
  let tokens: string[] = [];

  let toast = "";
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  async function refreshTemplates() {
    templates = await listTemplates();
    if (!selectedId && templates.length > 0) {
      selectedId = templates[0].id;
    }
  }

  async function loadSelected() {
    if (!selectedId) {
      selected = null;
      tokens = [];
      tokenValues = {};
      return;
    }

    selected = (await getDb().templates.get(selectedId)) ?? null;
    if (!selected) return;

    tokens = extractTokens(selected.content);

    // keep existing values if possible
    const next: Record<string, string> = {};
    for (const t of tokens) next[t] = tokenValues[t] ?? "";
    tokenValues = next;

    // store last template (bulletproof if settings was cleared)
    const existing = await getDb().settings.get("default");
    await getDb().settings.put({
      id: "default",
      defaultVenue: existing?.defaultVenue ?? "",
      defaultPayTo: existing?.defaultPayTo ?? "",
      language: existing?.language ?? "en",
      lastTemplateId: selectedId
    });
  }

  function showToast(msg: string) {
    toast = msg;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = ""), 1500);
  }

  function filteredTemplates() {
    const q = search.trim().toLowerCase();
    if (!q) return templates;

    return templates.filter((t) => {
      return (
        t.name.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }

$: preview = selected ? renderTemplate(selected.content, tokenValues, "preview") : "";

  async function onSelect(id: string) {
    selectedId = id;
    await loadSelected();
  }

  async function onNew() {
    const id = await createTemplate();
    await refreshTemplates();
    await onSelect(id);
    showToast("Created template");
  }

  async function onDelete(id: string) {
    const ok = confirm("Delete this template?");
    if (!ok) return;

    await deleteTemplate(id);
    selectedId = null;
    selected = null;

    await refreshTemplates();
    if (templates.length > 0) await onSelect(templates[0].id);

    showToast("Deleted");
  }

  async function onToggleFav(id: string) {
    await toggleFavorite(id);
    await refreshTemplates();
    showToast("Updated");
  }

  async function onSaveField(field: "name" | "category" | "content", value: string) {
    if (!selected) return;

    // optimistic UI update
    selected = { ...selected, [field]: value } as Template;

    await updateTemplate(selected.id, { [field]: value } as any);

    // tokens may change when content changes
    if (field === "content") {
      tokens = extractTokens(value);
      const next: Record<string, string> = {};
      for (const t of tokens) next[t] = tokenValues[t] ?? "";
      tokenValues = next;
    }

    await refreshTemplates();
  }

  async function applyDefaults() {
    const s = await getDb().settings.get("default");
    if (!s) return;

    // Only fill if token exists and is empty
    if (tokens.includes("venue") && !tokenValues["venue"]) tokenValues["venue"] = s.defaultVenue ?? "";
    if (tokens.includes("pay_to") && !tokenValues["pay_to"]) tokenValues["pay_to"] = s.defaultPayTo ?? "";

    showToast("Defaults applied");
  }

async function copy() {
  const finalText = selected ? renderTemplate(selected.content, tokenValues, "final") : "";
  await copyToClipboard(finalText);
  showToast("Copied ✅");
}


  // Helper for "pseudo-button" actions inside a clickable template row
  function actionKeyActivate(e: KeyboardEvent, fn: () => void) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      fn();
    }
  }

  let contentSaveTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSaveContent(value: string) {
  if (!selected) return;

  // Update UI immediately (smooth typing)
  selected = { ...selected, content: value } as Template;

  // Reset timer
  if (contentSaveTimer) clearTimeout(contentSaveTimer);

  // Save + retokenize after pause
  contentSaveTimer = setTimeout(async () => {
    await onSaveField("content", value);
  }, 250);
}

async function onDuplicate() {
  if (!selectedId) return;
  const newId = await duplicateTemplate(selectedId);
  await refreshTemplates();
  await onSelect(newId);
  showToast("Duplicated");
}

async function onExport() {
  // export all templates
  const db = getDb();
  const all = await db.templates.toArray();

  const payload = {
    schema: "aetherkit.templates.export",
    version: 1,
    exportedAt: new Date().toISOString(),
    templates: all
  };

  downloadTextFile("aetherkit-templates.json", JSON.stringify(payload, null, 2));
  showToast("Exported");
}

  onMount(async () => {
    await refreshTemplates();

    const s = await getDb().settings.get("default");
    if (s?.lastTemplateId) selectedId = s.lastTemplateId;

    await loadSelected();
  });
</script>

<style>
  .grid {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 16px;
  }
  @media (max-width: 900px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  .card {
    border: 1px solid #3333;
    border-radius: 12px;
    padding: 12px;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: calc(100vh - 180px);
    overflow: auto;
  }

  .row {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
  }

  button {
    padding: 8px 10px;
  }

  input,
  textarea,
  select {
    width: 100%;
    padding: 8px;
    border-radius: 8px;
    border: 1px solid #3333;
  }

  textarea {
    min-height: 180px;
    resize: vertical;
  }

  .pill {
    font-size: 12px;
    opacity: 0.8;
  }

  /* Outer row is a real button (a11y-friendly) */
  .templateBtn {
    text-align: left;
    width: 100%;
    cursor: pointer;
    background: transparent;
  }

  .templateBtn:hover {
    border-color: #666;
  }

  /* Inner actions are spans that behave like buttons */
  .iconAction {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid #3333;
    cursor: pointer;
    user-select: none;
    background: transparent;
  }

  .iconAction:hover {
    border-color: #666;
  }

  .toast {
    position: fixed;
    bottom: 18px;
    left: 50%;
    transform: translateX(-50%);
    background: #111;
    color: #fff;
    padding: 10px 14px;
    border-radius: 999px;
    border: 1px solid #444;
  }
</style>

<h2>Chat Toolkit</h2>

<div class="grid">
  <!-- LEFT: Templates -->
  <div class="card">
    <div class="row">
      <strong>Templates</strong>
      <button type="button" on:click={onNew}>New</button>
    </div>

    <div style="margin-top: 10px;">
      <input placeholder="Search..." bind:value={search} />
    </div>

    <div class="list" style="margin-top: 10px;">
      {#each filteredTemplates() as t}
        <button
          type="button"
          class="card templateBtn"
          style="padding: 10px; border-color: {t.id === selectedId ? '#666' : '#3333'}"
          aria-current={t.id === selectedId ? "true" : "false"}
          on:click={() => onSelect(t.id)}
        >
          <div class="row">
            <div>
              <div><strong>{t.name}</strong></div>
              <div class="pill">{t.category}{t.favorite ? " • ★" : ""}</div>
            </div>

            <div class="row" style="gap: 6px;">
              <span
                class="iconAction"
                role="button"
                tabindex="0"
                title="Favorite"
                on:click|stopPropagation={() => onToggleFav(t.id)}
                on:keydown={(e) => actionKeyActivate(e, () => onToggleFav(t.id))}
              >
                {t.favorite ? "★" : "☆"}
              </span>

              <span
                class="iconAction"
                role="button"
                tabindex="0"
                title="Delete"
                on:click|stopPropagation={() => onDelete(t.id)}
                on:keydown={(e) => actionKeyActivate(e, () => onDelete(t.id))}
              >
                🗑
              </span>
            </div>
          </div>
        </button>
      {/each}
    </div>
  </div>

  <!-- RIGHT: Editor -->
  <div class="card">
    {#if selected}
<div class="row">
  <strong>Edit</strong>
  <div class="row">
    <button type="button" on:click={onDuplicate} disabled={!selectedId}>Duplicate</button>
    <button type="button" on:click={onExport} disabled={templates.length === 0}>Export JSON</button>
    <button type="button" on:click={applyDefaults} disabled={tokens.length === 0}>Apply defaults</button>
    <button type="button" on:click={copy} disabled={!preview.trim()}>Copy</button>
  </div>
</div>

      <div style="margin-top: 10px;">
        <label>
          Name
          <input
            value={selected.name}
            on:change={(e) => onSaveField("name", (e.currentTarget as HTMLInputElement).value)}
          />
        </label>
      </div>

      <div style="margin-top: 10px;">
        <label>
          Category
          <select
            value={selected.category}
            on:change={(e) => onSaveField("category", (e.currentTarget as HTMLSelectElement).value)}
          >
            <option value="receipt">receipt</option>
            <option value="event">event</option>
            <option value="rp">rp</option>
            <option value="custom">custom</option>
          </select>
        </label>
      </div>

      <div style="margin-top: 10px;">
        <label>
          Content
          <textarea
  on:input={(e) => debouncedSaveContent((e.currentTarget as HTMLTextAreaElement).value)}
>{selected.content}</textarea>
        </label>
      </div>

      <div class="card" style="margin-top: 12px;">
        <strong>Tokens</strong>
        {#if tokens.length === 0}
          <p class="pill">No tokens detected. Add placeholders like {"{guest}"}.</p>
        {:else}
          <div
            style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 10px;"
          >
            {#each tokens as t}
              <label>
                {t}
                <input bind:value={tokenValues[t]} />
              </label>
            {/each}
          </div>
        {/if}
      </div>

      <div class="card" style="margin-top: 12px;">
        <strong>Preview</strong>
        <pre style="white-space: pre-wrap; margin-top: 10px;">{preview}</pre>
      </div>
    {:else}
      <p>No template selected.</p>
    {/if}
  </div>
</div>

{#if toast}
  <div class="toast" role="status" aria-live="polite">{toast}</div>
{/if}
