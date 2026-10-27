import type { Metadata } from 'next';
import SearchUtilityPage, { type SearchPageProps } from '../../search/SearchUtilityPage';
import NewYorkSearchUtilityShell from '../../search/NewYorkSearchUtilityShell';

export const metadata: Metadata = {
  title: 'Local New York website search | Allianz Life demo',
  description: 'Search the imported public New York content in this local demonstration.',
  robots: { index: false, follow: false, noarchive: true },
};

/** Local integration wrapper; the captured source record and counts stay intact. */
export default async function NewYorkSearchPage(props: SearchPageProps) {
  const { site, locale } = await props.params;
  const content = await SearchUtilityPage({ ...props, market: 'new-york' });
  return NewYorkSearchUtilityShell({ site, locale, kind: 'search', children: content });
}
