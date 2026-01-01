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
  keptLocal: number;
  skipped: number;
};

function tsOf(t: Partial<Template> | undefined | null): number {
  if (!t) return 0;
  const u = typeof t.updatedAt === "number" ? t.updatedAt : 0;
  const c = typeof t.createdAt === "number" ? t.createdAt : 0;
  return u || c || 0;
}

export async function importTemplatesKeepNewestById(
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
  let keptLocal = 0;
  let skipped = 0;

  await db.transaction("rw", db.templates, db.settings, async () => {
    for (const incoming of payload.templates) {
      if (!incoming?.id || typeof incoming.id !== "string") {
        skipped++;
        continue;
      }

      const existing = await db.templates.get(incoming.id);

      if (!existing) {
        // Insert: ensure timestamps exist
        await db.templates.add({
          ...incoming,
          createdAt: incoming.createdAt ?? now,
          updatedAt: incoming.updatedAt ?? now
        });
        inserted++;
        continue;
      }

      const localTs = tsOf(existing);
      const incomingTs = tsOf(incoming);

      if (incomingTs > localTs) {
        // Incoming wins: overwrite, but preserve local createdAt if it exists
        await db.templates.put({
          ...existing,
          ...incoming,
          createdAt: existing.createdAt ?? incoming.createdAt ?? now,
          updatedAt: incoming.updatedAt ?? now
        });
        updated++;
      } else if (localTs > incomingTs) {
        // Local wins: keep
        keptLocal++;
      } else {
        // Same timestamp (or both missing)
        skipped++;
      }
    }

    // Optional future: import settings. Default off.
    if (importSettings && (payload as any).settings) {
      // noop for now
    }
  });

  return { inserted, updated, keptLocal, skipped };
}
