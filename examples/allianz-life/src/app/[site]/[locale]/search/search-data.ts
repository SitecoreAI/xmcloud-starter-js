import importedContent from '../../../../../content/native-content.json';
import type { FixtureContent } from '../../../../content/types';
import { createSearchIndex, normalizeSearchQuery, searchPublicRoutes } from '../../../../components/allianz-search/search-rules.props';

// This app-owned utility reads the imported public snapshot only. It never
// fabricates a Layout Service Page or calls Edge as evidence of native rendering.
const searchIndex = createSearchIndex((importedContent as unknown as FixtureContent).routes);

export function localSearchResults(query: string | string[] | undefined, market?: 'new-york') {
  const normalized = normalizeSearchQuery(query);
  return { query: normalized, matches: searchPublicRoutes(searchIndex, normalized, market) };
}

export function isLocalSearchScope(site: string, locale: string) {
  return site === 'allianz-life' && locale === 'en';
}
