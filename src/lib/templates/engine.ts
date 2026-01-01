export const TOKEN_REGEX = /\{([a-zA-Z0-9_]+)\}/g;

export function extractTokens(content:string):string[]{
    const found = new Set<string>();
    for(const match of content.matchAll(TOKEN_REGEX)){
        const token = match[1];
        if(token) found.add(token);
    }
    return [...found].sort((a,b)=>a.localeCompare(b));
}

export function renderTemplate(
  input: string,
  values: Record<string, string>,
  mode: "preview" | "final" = "preview"
): string {
  return input.replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, key: string) => {
    const v = (values[key] ?? "").trim();
    if (v) return v;
    return mode === "preview" ? `[${key}]` : "";
  });
}