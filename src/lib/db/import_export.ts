import { getDb } from "$lib/db";
import type { Template } from "$lib/db/schema";

export type TemplatesExportV1 = {
  schema: "aetherkit.templates.export";
  version: 1;
  exportedAt: string;
  templates: Template[];
};

function isExportV1(x: any): x is TemplatesExportV1 {
  return (
    x &&
    x.schema === "aetherkit.templates.export" &&
    x.version === 1 &&
    typeof x.exportedAt === "string" &&
    Array.isArray(x.templates)
  );
}

export type ImportResult = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function importTemplatesMergeById(
  payload: unknown,
  opts?: { importSettings?: boolean }
): Promise<ImportResult> {
  const importSettings = opts?.importSettings ?? false;

  if (!isExportV1(payload)) {
    throw new Error("Invalid import file (expected AetherKit export v1).");
  }

  const db = getDb();
  const now = Date.now();

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  await db.transaction("rw", db.templates, db.settings, async () => {
    for (const t of payload.templates) {
      // Minimal shape check to avoid garbage
      if (!t?.id || typeof t.id !== "string") {
        skipped++;
        continue;
      }

      const existing = await db.templates.get(t.id);

      if (!existing) {
        // Insert: trust import data, but ensure timestamps exist
        await db.templates.add({
          ...t,
          createdAt: t.createdAt ?? now,
          updatedAt: now
        });
        inserted++;
      } else {
        // Update: merge-by-id
        // Policy: keep local createdAt (historical), update everything else from import
        await db.templates.put({
          ...existing,
          ...t,
          createdAt: existing.createdAt ?? t.createdAt ?? now,
          updatedAt: now
        });
        updated++;
      }
    }

    // Optional future: import settings. Default off.
    if (importSettings && (payload as any).settings) {
      // If you ever add settings to export, handle it here.
      // For now: noop.
    }
  });

  return { inserted, updated, skipped };
}
