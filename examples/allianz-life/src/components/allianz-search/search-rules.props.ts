export interface SearchEntry { path: string; title: string; description: string }

/** Deterministic local title/intro ranking over the verified public English route index. */
export function searchPublicRoutes(entries: SearchEntry[], query: string, market?: string): SearchEntry[] {
  const tokens = query.trim().toLocaleLowerCase('en-US').slice(0, 50).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  return entries.filter((entry) => !market || market !== 'new-york' || entry.path.startsWith('/new-york')).map((entry) => {
    const title = entry.title.toLocaleLowerCase('en-US');
    const description = entry.description.toLocaleLowerCase('en-US');
    const content = `${title} ${description} ${entry.path}`;
    return { entry, score: tokens.every((token) => content.includes(token)) ? tokens.reduce((score, token) => score + (title.startsWith(token) ? 10 : title.includes(token) ? 5 : 1), 0) : 0 };
  }).filter((match) => match.score > 0).sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title)).map((match) => match.entry);
}
