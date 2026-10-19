import {
  normalizeSearchQuery,
  searchPublicRoutes,
  type SearchEntry,
} from '../../../../components/allianz-search/search-rules.props';

export const ADVANCED_SEARCH_PATH = '/new-york/search/advanced-search';

export type SearchWithin = 'all' | 'titles';
export type SearchSort = 'best' | 'title';
export type SearchPageSize = '12' | '24' | '60' | 'all';
type SearchParam = string | string[] | undefined;

export interface AdvancedSearchParams {
  q?: SearchParam;
  within?: SearchParam;
  sort?: SearchParam;
  size?: SearchParam;
}

export interface AdvancedSearchState {
  query: string;
  within: SearchWithin;
  sort: SearchSort;
  pageSize: SearchPageSize;
}

export function normalizeAdvancedSearch(params: AdvancedSearchParams): AdvancedSearchState {
  const first = (value: SearchParam) => Array.isArray(value) ? value[0] : value;
  const size = first(params.size);
  return {
    // Unicode mode preserves complete pairs and removes lone UTF-16 surrogates,
    // including a pair split by the shared 50-code-unit query limit.
    query: normalizeSearchQuery(params.q).replace(/[\uD800-\uDFFF]/gu, ''),
    within: first(params.within) === 'titles' ? 'titles' : 'all',
    sort: first(params.sort) === 'title' ? 'title' : 'best',
    pageSize: size === '24' || size === '60' || size === 'all' ? size : '12',
  };
}

/** Only fixed option values and an encoded query can enter this local URL. */
export function advancedSearchHref(state: AdvancedSearchState): string {
  const normalized = normalizeAdvancedSearch({ q: state.query, within: state.within, sort: state.sort, size: state.pageSize });
  const parts: string[] = [];
  if (normalized.query) parts.push(`q=${encodeURIComponent(normalized.query)}`);
  if (normalized.within !== 'all') parts.push(`within=${normalized.within}`);
  if (normalized.sort !== 'best') parts.push(`sort=${normalized.sort}`);
  if (normalized.pageSize !== '12') parts.push(`size=${normalized.pageSize}`);
  return `${ADVANCED_SEARCH_PATH}${parts.length ? `?${parts.join('&')}` : ''}`;
}

/** A demo option over the existing public snapshot matcher, always NY-only. */
export function advancedSearchMatches(entries: SearchEntry[], state: AdvancedSearchState): SearchEntry[] {
  const tokens = normalizeSearchQuery(state.query).toLocaleLowerCase('en-US').split(/\s+/).filter(Boolean);
  const candidates = state.within === 'titles'
    ? entries.filter((entry) => tokens.every((token) => entry.title.toLocaleLowerCase('en-US').includes(token)))
    : entries;
  const matches = searchPublicRoutes(candidates, state.query, 'new-york');
  return state.sort === 'title'
    ? matches.sort((a, b) => a.title.localeCompare(b.title, 'en-US') || a.path.localeCompare(b.path, 'en-US'))
    : matches;
}

export function advancedSearchLimit(pageSize: SearchPageSize, matchCount: number): number {
  return pageSize === 'all' ? matchCount : Number(pageSize);
}
