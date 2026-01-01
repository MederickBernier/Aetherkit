import { getDb } from "./index";
import { SEED_TEMPLATES } from "../templates/seed";
import type { Template } from "./schema";

function newId(): string {
  return crypto.randomUUID();
}

export async function ensureSeeded(): Promise<void> {
  const count = await getDb().templates.count();
  if (count > 0) return;

  const now = Date.now();
  const templates: Template[] = SEED_TEMPLATES.map((t) => ({
    id: newId(),
    name: t.name,
    category: t.category,
    content: t.content,
    favorite: false,
    createdAt: now,
    updatedAt: now
  }));

  await getDb().transaction("rw", getDb().templates, getDb().settings, async () => {
    await getDb().templates.bulkAdd(templates);
    await getDb().settings.put({
      id: "default",
      defaultVenue: "",
      defaultPayTo: "",
      language: "en"
    });
  });
}
