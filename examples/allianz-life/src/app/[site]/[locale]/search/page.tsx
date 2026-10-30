import type { Metadata } from 'next';
import SearchUtilityPage, { type SearchPageProps } from './SearchUtilityPage';
import NationwideSearchUtilityShell from './NationwideSearchUtilityShell';

export const metadata: Metadata = {
  title: 'Search | Allianz Life',
  description: 'Search Allianz Life articles and resources.',
  robots: { index: false, follow: false, noarchive: true },
};

/** An app-owned utility, not an extra canonical source route or native CMS page. */
export default async function SearchPage(props: SearchPageProps) {
  const { site, locale } = await props.params;
  const content = await SearchUtilityPage(props);
  return NationwideSearchUtilityShell({ site, locale, children: content });
}
