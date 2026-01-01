export type TemplateCategory = "receipt" | "event" | "rp" | "custom";

export type SeedTemplate = {
    name:string;
    category: TemplateCategory;
    content:string;
}

export const SEED_TEMPLATES: SeedTemplate[] = [
  {
    name: "Receipt - Simple",
    category: "receipt",
    content: `Thanks {guest} ✨
Order: {items}
Total: {total} gil
Pay to: {pay_to}`
  },
  {
    name: "Event - PF Listing",
    category: "event",
    content: `{venue} | {time} | {world}
Vibe: {vibe}
Come chill ✨`
  },
  {
    name: "RP - Greeting",
    category: "rp",
    content: `*smiles softly* Welcome to {venue}, {guest}. Make yourself comfortable ✨`
  }
];