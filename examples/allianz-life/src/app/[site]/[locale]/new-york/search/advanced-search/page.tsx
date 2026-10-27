import type { Metadata } from 'next';
import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import LocalAdvancedSearchUtility from '../../../search/LocalAdvancedSearchUtility';
import NewYorkSearchUtilityShell from '../../../search/NewYorkSearchUtilityShell';
import { advancedSearchHref, type AdvancedSearchParams } from '../../../search/advanced-search-model';
import { isLocalSearchScope, localAdvancedSearchResults } from '../../../search/search-data';

export const metadata: Metadata = {
  title: 'Local advanced search demo | Allianz Life New York',
  description: 'A local demonstration that searches captured public New York page text.',
  robots: { index: false, follow: false, noarchive: true },
};

interface AdvancedSearchPageProps {
  params: Promise<{ site: string; locale: string }>;
  searchParams: Promise<AdvancedSearchParams>;
}

/** App-owned demo adaptation. Captured source and native authoring stay intact. */
export default async function AdvancedSearchPage({ params, searchParams }: AdvancedSearchPageProps) {
  const { site, locale } = await params;
  if (!isLocalSearchScope(site, locale)) notFound();
  const { state, matches } = localAdvancedSearchResults(await searchParams);
  const content = <div className="allianz-modern prod-mode">
    <main id="main" className="l-container u-padding-top-md u-padding-bottom-md">
      <nav aria-label="Breadcrumb">
        <NextLink href="/new-york">Allianz Life New York home</NextLink><span> / </span>
        <NextLink href="/new-york/search">Search</NextLink><span> / Local advanced search demo</span>
      </nav>
      <h1 className="c-heading c-heading--section">Local advanced search demo</h1>
      <p>Search the captured New York website content. This demo does not use a live search service.</p>
      <p>Results cover captured public pages only. Document contents are not indexed.</p>
      <LocalAdvancedSearchUtility key={advancedSearchHref(state)} state={state} matches={matches} />
    </main>
  </div>;
  return NewYorkSearchUtilityShell({ site, locale, kind: 'advanced', children: content });
}
