import type { Metadata } from 'next';
import SearchUtilityPage, { type SearchPageProps } from './SearchUtilityPage';

export const metadata: Metadata = {
  title: 'Local website search | Allianz Life demo',
  description: 'Search the imported public English content in this local demonstration.',
  robots: { index: false, follow: false, noarchive: true },
};

/** An app-owned utility, not an extra canonical source route or native CMS page. */
export default async function SearchPage(props: SearchPageProps) {
  return SearchUtilityPage(props);
}
