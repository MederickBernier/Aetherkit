export const TOKEN_REGEX = /\{([a-zA-Z0-9_]+)\}/g;

export function extractTokens(content:string):string[]{
    const found = new Set<string>();
    for(const match of content.matchAll(TOKEN_REGEX)){
        const token = match[1];
        if(token) found.add(token);
    }
    return [...found].sort((a,b)=>a.localeCompare(b));
}

export function renderTemplate(content:string, tokens:Record<string,string>):string{
    return content.replace(TOKEN_REGEX, (full, tokenName)=>{
        const v = tokens[tokenName];
        return v === undefined ? full : v;
    })
}