// src/lib/db/index.ts
import Dexie, { type Table } from "dexie";
import { browser } from "$app/environment";
import type { Template, Settings, TemplateUsage } from "./schema";

export class AetherKitDB extends Dexie {
  templates!: Table<Template, string>;
  settings!: Table<Settings, string>;
  usage!: Table<TemplateUsage, string>;

  constructor() {
    super("aetherkit-db");
    this.version(1).stores({
      templates: "id, name, category, favorite, updatedAt",
      settings: "id",
      usage: "templateId, lastUsedAt"
    });
  }
}

let _db: AetherKitDB | null = null;

/**
 * Get the Dexie DB instance.
 * - In the browser: returns a singleton
 * - In SSR: throws (because IndexedDB doesn't exist)
 */
export function getDb(): AetherKitDB {
  if (!browser) {
    throw new Error("AetherKitDB is browser-only (IndexedDB not available in SSR).");
  }
  if (!_db) _db = new AetherKitDB();
  return _db;
}
