import { z } from "zod";

export const TemplateCategorySchema = z.enum(["receipt", "event", "rp", "custom"]);
export type TemplateCategory = z.infer<typeof TemplateCategorySchema>;

export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(64),
  category: TemplateCategorySchema,
  content: z.string().min(1).max(10000),
  favorite: z.boolean().default(false),
  createdAt: z.number(),
  updatedAt: z.number()
});
export type Template = z.infer<typeof TemplateSchema>;

export const SettingsSchema = z.object({
  id: z.literal("default"),
  defaultVenue: z.string().optional().default(""),
  defaultPayTo: z.string().optional().default(""),
  language: z.enum(["en", "fr-ca"]).optional().default("en"),
  lastTemplateId: z.string().optional()
});
export type Settings = z.infer<typeof SettingsSchema>;

export const UsageSchema = z.object({
  templateId: z.string(),
  lastUsedAt: z.number()
});
export type TemplateUsage = z.infer<typeof UsageSchema>;
