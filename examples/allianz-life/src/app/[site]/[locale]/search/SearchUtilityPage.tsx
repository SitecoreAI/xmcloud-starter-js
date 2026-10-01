import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import LocalSearchUtility from './LocalSearchUtility';
import { isLocalSearchScope, localSearchResults } from './search-data';

export type SearchPageProps = {
  params: Promise<{ site: string; locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};

/** Shared app-owned search view. It never creates a native CMS Page payload. */
export default async function SearchUtilityPage({ params, searchParams, market }: SearchPageProps & { market?: 'new-york' }) {
  const { site, locale } = await params;
  if (!isLocalSearchScope(site, locale)) notFound();
  const { query, matches } = localSearchResults((await searchParams).q, market);
  const newYork = market === 'new-york';
  return <div className="allianz-modern prod-mode">
    <main id="main" className="l-container u-padding-top-md u-padding-bottom-md">
      <nav aria-label="Breadcrumb"><NextLink href={newYork ? '/new-york' : '/'}>{newYork ? 'Allianz Life New York home' : 'Allianz Life home'}</NextLink><span> / Search</span></nav>
      <h1 className="c-heading c-heading--section">Search</h1>
      <p>Local demo search uses the imported {newYork ? 'New York ' : ''}public-content snapshot. Results are not a live Sitecore search index.</p>
      <LocalSearchUtility key={query} query={query} matches={matches} market={market} />
    </main>
  </div>;
}
