'use client';

import type { FormEvent } from 'react';
import { Suspense, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NWN_SEARCH_PAGES, type NwnSearchPage } from '@/lib/nwn-routes';
import type { SearchExperienceProps } from './search-experience.props';

const POPULAR_PAGE_PATHS = new Set([
  '/account-billing/pay-my-bill',
  '/account-billing/start-stop-transfer',
  '/ways-to-save/rebates-offers',
  '/services',
  '/safety',
  '/contact-us',
]);

const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const rankPage = (page: NwnSearchPage, normalizedQuery: string): number => {
  const title = normalizeSearchText(page.title);
  const description = normalizeSearchText(page.description);
  const keywords = normalizeSearchText(page.keywords.join(' '));
  const path = normalizeSearchText(page.path);
  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const allContent = `${title} ${description} ${keywords} ${path}`;

  if (!tokens.every((token) => allContent.includes(token))) return -1;

  let score = 0;

  if (title === normalizedQuery) score += 1_000;
  else if (title.startsWith(normalizedQuery)) score += 600;
  else if (title.includes(normalizedQuery)) score += 450;

  if (keywords.includes(normalizedQuery)) score += 250;
  if (description.includes(normalizedQuery)) score += 150;
  if (path.includes(normalizedQuery)) score += 75;

  for (const token of tokens) {
    if (title.split(' ').includes(token)) score += 90;
    else if (title.includes(token)) score += 60;
    if (keywords.includes(token)) score += 30;
    if (description.includes(token)) score += 15;
    if (path.includes(token)) score += 5;
  }

  return score;
};

export const searchNwnPages = (
  query: string,
  pages: readonly NwnSearchPage[] = NWN_SEARCH_PAGES,
): NwnSearchPage[] => {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return [];

  return pages
    .filter((page) => page.path !== '/search')
    .map((page, index) => ({
      page,
      index,
      score: rankPage(page, normalizedQuery),
    }))
    .filter(({ score }) => score >= 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ page }) => page);
};

const getSectionLabel = (path: string): string => {
  if (path === '/') return 'Overview';
  if (path.startsWith('/account-billing')) return 'Account & Billing';
  if (path.startsWith('/ways-to-save')) return 'Ways to Save';
  if (path.startsWith('/services')) return 'Services';
  if (path.startsWith('/get-natural-gas')) return 'Get Natural Gas';
  if (path.startsWith('/safety')) return 'Safety';
  if (path.startsWith('/about-us')) return 'About Us';
  return 'Customer Support';
};

const SearchExperienceFallback = ({ params }: SearchExperienceProps) => (
  <section
    className={cn(
      'component search-experience bg-white py-12 sm:py-16',
      params?.GridParameters,
      params?.styles,
    )}
    aria-label="Loading search"
    aria-busy="true"
  >
    <div className="nwn-content-shell animate-pulse overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
      <div className="h-72 bg-[#174f5b]" aria-hidden="true" />
      <div className="space-y-4 p-6 sm:p-8" aria-hidden="true">
        <div className="h-7 w-48 bg-slate-200" />
        <div className="h-24 bg-white" />
        <div className="h-24 bg-white" />
      </div>
    </div>
  </section>
);

const SearchExperienceContent = (props: SearchExperienceProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const urlQuery = searchParams.get('q')?.trim() ?? '';
  const [query, setQuery] = useState(urlQuery);

  useEffect(() => setQuery(urlQuery), [urlQuery]);

  const normalizedQuery = query.trim();
  const results = useMemo(
    () => searchNwnPages(normalizedQuery),
    [normalizedQuery],
  );
  const popularPages = useMemo(
    () => NWN_SEARCH_PAGES.filter((page) => POPULAR_PAGE_PATHS.has(page.path)),
    [],
  );
  const displayedPages = normalizedQuery ? results : popularPages;

  const updateUrl = (value: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    const nextQuery = value.trim();

    if (nextQuery) nextParams.set('q', nextQuery);
    else nextParams.delete('q');

    const nextQueryString = nextParams.toString();
    router.replace(
      nextQueryString ? `${pathname}?${nextQueryString}` : pathname,
      { scroll: false },
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateUrl(query);
  };

  const handleClear = () => {
    setQuery('');
    updateUrl('');
    inputRef.current?.focus();
  };

  const resultSummary = normalizedQuery
    ? `${results.length} ${results.length === 1 ? 'result' : 'results'} for “${normalizedQuery}”`
    : 'Browse popular NW Natural pages.';

  return (
    <section
      data-component="SearchExperience"
      className={cn(
        'component search-experience bg-white py-12 sm:py-16',
        props.params?.GridParameters,
        props.params?.styles,
      )}
    >
      <div className="nwn-content-shell overflow-hidden border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.10)]">
        <div className="border-t-8 border-cyan-500 bg-[#174f5b] px-6 py-10 text-white sm:px-10 sm:py-12 lg:px-14">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-200">
            NW Natural
          </p>
          <h1 className="mt-3 max-w-2xl font-heading text-4xl font-medium leading-tight text-white sm:text-5xl">
            Search our site
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-cyan-50 sm:text-lg">
            Find account help, services, savings opportunities, and natural gas
            safety information.
          </p>

          <form
            role="search"
            className="mt-8 max-w-4xl"
            onSubmit={handleSubmit}
          >
            <label
              htmlFor={inputId}
              className="mb-2 block text-base font-semibold text-white"
            >
              What can we help you find?
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  id={inputId}
                  name="q"
                  type="search"
                  autoComplete="off"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Try “pay my bill” or “rebates”"
                  className="min-h-14 w-full border-2 border-transparent bg-white py-3.5 pl-12 pr-12 text-base text-slate-900 outline-none placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-4 focus-visible:ring-cyan-300/30"
                />
                {query && (
                  <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center text-slate-500 transition-colors hover:text-[#005b73] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="min-h-14 bg-cyan-500 px-8 text-base font-bold text-slate-950 transition-colors hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        <div className="bg-[#f4f7f8] px-6 py-9 sm:px-10 sm:py-10 lg:px-14">
          <div className="flex flex-col gap-2 border-b border-slate-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-heading text-2xl font-semibold text-slate-900 sm:text-3xl">
              {normalizedQuery ? 'Search results' : 'Popular pages'}
            </h2>
            <p
              role="status"
              aria-live="polite"
              className="text-sm font-medium text-slate-600"
            >
              {resultSummary}
            </p>
          </div>

          {normalizedQuery && results.length === 0 ? (
            <div className="my-8 border-l-4 border-cyan-500 bg-white p-6 sm:p-8">
              <h3 className="font-heading text-2xl font-semibold text-slate-900">
                We couldn’t find a match
              </h3>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Check the spelling, try a shorter phrase, or search for a topic
                such as billing, rebates, service, or safety.
              </p>
              <Link
                href="/contact-us"
                prefetch={false}
                className="mt-5 inline-flex items-center gap-2 font-semibold text-[#006f8c] underline decoration-cyan-500 decoration-2 underline-offset-4 hover:text-[#004b60] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-4"
              >
                Contact us for help
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <ol className="mt-6 grid gap-4 md:grid-cols-2">
              {displayedPages.map((page) => (
                <li key={page.path}>
                  <article className="group flex h-full flex-col border border-slate-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-md focus-within:border-cyan-500 focus-within:shadow-md">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#007b98]">
                      {getSectionLabel(page.path)}
                    </p>
                    <h3 className="mt-2 font-heading text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
                      <Link
                        href={page.path}
                        prefetch={false}
                        className="outline-none after:absolute focus-visible:underline focus-visible:decoration-cyan-500 focus-visible:decoration-2 focus-visible:underline-offset-4"
                      >
                        {page.title}
                      </Link>
                    </h3>
                    <p className="mt-3 flex-1 text-base leading-7 text-slate-600">
                      {page.description}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#006f8c] transition-colors group-hover:text-[#004b60]">
                      View page
                      <ArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </article>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
};

export const Default = (props: SearchExperienceProps) => (
  <Suspense fallback={<SearchExperienceFallback {...props} />}>
    <SearchExperienceContent {...props} />
  </Suspense>
);
