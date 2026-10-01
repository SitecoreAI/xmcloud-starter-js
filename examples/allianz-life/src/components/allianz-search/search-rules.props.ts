import publicRouteIndex from '../../../content/public-route-index.json';
import type { PageFixture } from '../../content/types';
import type { AllianzDatasource, ContentEntry } from '../../lib/allianz-fields';

export interface SearchEntry { path: string; title: string; description: string; content?: string }
export const SEARCH_QUERY_LIMIT = 50;

export function normalizeSearchQuery(value: string | string[] | undefined | null): string {
  return (Array.isArray(value) ? value[0] || '' : value || '').trim().slice(0, SEARCH_QUERY_LIMIT);
}

/** Results only navigate to captured public routes, never a supplied arbitrary URL. */
export function safeSearchPath(value: string): string | null {
  if (!value.startsWith('/') || value.startsWith('//') || /[\\\\\u0000-\u001f]/.test(value)) return null;
  try {
    const url = new URL(value, 'https://www.allianzlife.com');
    if (url.origin !== 'https://www.allianzlife.com' || url.search || url.hash) return null;
    const path = decodeURIComponent(url.pathname).replace(/\/$/, '').toLowerCase() || '/';
    if (/^\/(?:new-york\/)?(?:login|registration|spa|account|portal|secured|logout|manageuserprofile|api|sitecore)(?:\/|$)/i.test(path)) return null;
    return Object.hasOwn(publicRouteIndex, path) ? url.pathname : null;
  } catch { return null; }
}

/** Plain-text extraction is for matching/snippets only; HTML is never rendered. */
export function searchText(value: unknown): string {
  if (typeof value !== 'string') return '';
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—' };
  return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (entity, digits: string) => {
      const codepoint = /^x/i.test(digits) ? Number.parseInt(digits.slice(1), 16) : Number(digits);
      return codepoint > 0 && codepoint <= 0x10ffff && !(codepoint >= 0xd800 && codepoint <= 0xdfff) ? String.fromCodePoint(codepoint) : entity;
    })
    .replace(/&([a-z]+);/gi, (entity, name: string) => entities[name.toLowerCase()] ?? entity)
    .replace(/\s+/g, ' ').trim();
}

function datasourceText(data?: AllianzDatasource | ContentEntry): string {
  if (!data) return '';
  const text = [data.heading, data.body, data.summary, data.subheading]
    .map((field) => searchText(field?.jsonValue?.value)).filter(Boolean);
  if ('children' in data) {
    text.push(...(data.children?.results ?? []).map((child) => datasourceText(child)));
  }
  return text.join(' ');
}

/** Index the typed imported route records, including editable child content. */
export function createSearchIndex(routes: Record<string, PageFixture>): SearchEntry[] {
  return Object.values(routes).flatMap((route) => {
    const path = safeSearchPath(route.path);
    if (!path) return [];
    try { if (new URL(route.sourceUrl).origin !== 'https://www.allianzlife.com') return []; }
    catch { return []; }
    const content = route.components.map((component) => datasourceText(component.fields?.data?.datasource)).filter(Boolean).join(' ');
    const description = searchText(route.description) || content;
    return [{ path, title: searchText(route.title).replace(/\s*\|\s*Allianz Life$/, ''), description: description.slice(0, 260), content }];
  }).sort((a, b) => a.path.localeCompare(b.path, 'en-US'));
}

function snippet(entry: SearchEntry, tokens: string[]): string {
  const description = entry.description || '';
  const text = entry.content || description;
  const lowerDescription = description.toLocaleLowerCase('en-US');
  if (tokens.some((token) => lowerDescription.includes(token)) || !text) return description;
  const lower = text.toLocaleLowerCase('en-US');
  const positions = tokens.map((token) => lower.indexOf(token)).filter((index) => index >= 0);
  if (!positions.length) return description;
  const match = Math.min(...positions);
  let start = Math.max(0, match - 70);
  if (start > 0) {
    const boundary = text.indexOf(' ', start);
    if (boundary >= 0 && boundary < match) start = boundary + 1;
  }
  let end = Math.min(text.length, start + 260);
  if (end < text.length) {
    const boundary = text.lastIndexOf(' ', end);
    if (boundary > match) end = boundary;
  }
  return `${start ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

/** Deterministic local matching. The index is a snapshot, not a connected CMS service. */
export function searchPublicRoutes(entries: SearchEntry[], query: string, market?: string): SearchEntry[] {
  const tokens = normalizeSearchQuery(query).toLocaleLowerCase('en-US').split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  return entries.filter((entry) => safeSearchPath(entry.path) && (!market || market !== 'new-york' || entry.path === '/new-york' || entry.path.startsWith('/new-york/'))).map((entry) => {
    const title = entry.title.toLocaleLowerCase('en-US');
    const description = entry.description.toLocaleLowerCase('en-US');
    const content = `${title} ${description} ${entry.content?.toLocaleLowerCase('en-US') || ''} ${entry.path}`;
    const slug = entry.path.split('/').at(-1)?.toLocaleLowerCase('en-US');
    return { entry, score: tokens.every((token) => content.includes(token)) ? tokens.reduce((score, token) => score + (title.startsWith(token) ? 10 : title.includes(token) ? 5 : 1) + (slug === token ? 10 : 0), 0) : 0 };
  }).filter((match) => match.score > 0).sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, 'en-US') || a.entry.path.localeCompare(b.entry.path, 'en-US'))
    .map(({ entry }) => ({ path: safeSearchPath(entry.path)!, title: entry.title, description: snippet(entry, tokens) }));
}
