import { getDb } from "./index";
import type { Template, TemplateCategory } from "./schema";

export async function listTemplates(): Promise<Template[]> {
  const all = await getDb().templates.toArray();
  return all.sort((a, b) => {
    const fav = Number(b.favorite) - Number(a.favorite);
    if (fav !== 0) return fav;
    return b.updatedAt - a.updatedAt;
  });
}

export async function getTemplate(id: string): Promise<Template | undefined> {
  return getDb().templates.get(id);
}

export async function createTemplate(partial?: Partial<Template>): Promise<string> {
  const now = Date.now();
  const id = crypto.randomUUID();
  await getDb().templates.add({
    id,
    name: partial?.name ?? "New Template",
    category: (partial?.category as TemplateCategory) ?? "custom",
    content: partial?.content ?? "Hello {guest}",
    favorite: partial?.favorite ?? false,
    createdAt: now,
    updatedAt: now
  });
  return id;
}

export async function updateTemplate(id: string, patch: Partial<Template>): Promise<void> {
  await getDb().templates.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteTemplate(id: string): Promise<void> {
  await getDb().templates.delete(id);
}

export async function toggleFavorite(id: string): Promise<void> {
  const t = await getDb().templates.get(id);
  if (!t) return;
  await updateTemplate(id, { favorite: !t.favorite });
}

export async function duplicateTemplate(id: string): Promise<string> {
  const db = getDb();
  const t = await db.templates.get(id);
  if (!t) throw new Error("Template not found");

  const now = Date.now();
  const newId = crypto.randomUUID();

  await db.templates.add({
    ...t,
    id: newId,
    name: `${t.name} (copy)`,
    favorite: false,
    createdAt: now,
    updatedAt: now
  });

  return newId;
}

