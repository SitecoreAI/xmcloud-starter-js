'use client';

import type { FormEvent } from 'react';
import { Suspense, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SIE_SEARCH_PAGES, type SieSearchPage } from '@/lib/sie-routes';
import { useSitecoreSearch } from '@/lib/search/use-sitecore-search';
import type {
  SearchConfiguration,
  SearchExperienceProps,
  SearchFieldsMapping,
  SearchResultDocument,
  SearchResultValue,
} from './search-experience.props';

const DEFAULT_PAGE_SIZE = 10;
const POPULAR_PAGE_PATHS = new Set([
  '/customer-service-portal',
  '/payment-options-locations',
  '/service-options',
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

const rankPage = (page: SieSearchPage, normalizedQuery: string): number => {
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

/** Retained for sitemap/content metadata tests; public queries use SitecoreAI. */
export const searchSiePages = (
  query: string,
  pages: readonly SieSearchPage[] = SIE_SEARCH_PAGES,
): SieSearchPage[] => {
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

const parsePositiveInteger = (
  value: string | number | undefined,
  fallback: number,
): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeFieldsMapping = (value: unknown): SearchFieldsMapping => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    ['title', 'description', 'link'].flatMap((key) =>
      typeof source[key] === 'string' ? [[key, source[key]]] : [],
    ),
  ) as SearchFieldsMapping;
};

export const parseSearchConfiguration = (
  value: string | null | undefined,
  fallbackId = '',
): SearchConfiguration => {
  const configuredValue = value?.trim();

  if (!configuredValue) {
    return { searchIndex: fallbackId.trim(), fieldsMapping: {} };
  }

  if (!configuredValue.startsWith('{')) {
    return { searchIndex: configuredValue, fieldsMapping: {} };
  }

  try {
    const parsed = JSON.parse(configuredValue) as Record<string, unknown>;
    const searchIndex = [
      parsed.searchIndex,
      parsed.searchIndexId,
      parsed.sourceId,
      parsed.id,
      fallbackId,
    ].find((candidate) => typeof candidate === 'string' && candidate.trim());

    return {
      searchIndex: typeof searchIndex === 'string' ? searchIndex.trim() : '',
      fieldsMapping: normalizeFieldsMapping(parsed.fieldsMapping),
    };
  } catch {
    return { searchIndex: fallbackId.trim(), fieldsMapping: {} };
  }
};

const getNestedValue = (
  document: SearchResultDocument,
  path: string | undefined,
): SearchResultValue | undefined => {
  if (!path) return undefined;

  return path
    .split('.')
    .reduce<SearchResultValue | undefined>((current, segment) => {
      if (current && !Array.isArray(current) && typeof current === 'object') {
        return current[segment];
      }

      return undefined;
    }, document);
};

const getFirstValue = (
  document: SearchResultDocument,
  configuredPath: string | undefined,
  fallbacks: string[],
): SearchResultValue | undefined => {
  const paths = configuredPath ? [configuredPath, ...fallbacks] : fallbacks;

  for (const path of paths) {
    const value = getNestedValue(document, path);
    if (value !== undefined && value !== null && value !== '') return value;
  }

  return undefined;
};

const parseJsonValue = (value: string): SearchResultValue | undefined => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return undefined;

  try {
    return JSON.parse(trimmed) as SearchResultValue;
  } catch {
    return undefined;
  }
};

const toText = (value: SearchResultValue | undefined): string => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') {
    const parsed = parseJsonValue(value);
    return parsed === undefined ? value : toText(parsed);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(toText).filter(Boolean).join(', ');
  }

  for (const key of ['text', 'value', 'name', 'title', 'displayName']) {
    const candidate = value[key];
    if (candidate !== undefined) return toText(candidate);
  }

  return '';
};

const toUrl = (value: SearchResultValue | undefined): string => {
  if (typeof value === 'string') {
    const parsed = parseJsonValue(value);
    return parsed === undefined ? value.trim() : toUrl(parsed);
  }

  if (value && !Array.isArray(value) && typeof value === 'object') {
    for (const key of ['href', 'url', 'path', 'value']) {
      const candidate = value[key];
      if (candidate !== undefined) return toUrl(candidate);
    }
  }

  return '';
};

const stripMarkup = (value: string): string =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

const getTitleFromUrl = (value: string): string => {
  if (!value) return '';

  try {
    const segment = new URL(value, 'https://sienergy.example').pathname
      .split('/')
      .filter(Boolean)
      .at(-1);

    if (!segment) return 'SiEnergy';

    return decodeURIComponent(segment)
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
      .join(' ');
  } catch {
    return '';
  }
};

type DisplayPage = {
  id: string;
  title: string;
  description: string;
  path: string;
};

const toDisplayPage = (
  document: SearchResultDocument,
  mapping: SearchFieldsMapping,
  index: number,
): DisplayPage | null => {
  const path = toUrl(
    getFirstValue(document, mapping.link, [
      'url',
      'Url',
      'link',
      'Link',
      'sc_url',
    ]),
  );
  const title = stripMarkup(
    toText(
      getFirstValue(document, mapping.title, [
        'navigation_title',
        'navigationTitle',
        'title',
        'Title',
        'name',
      ]),
    ),
  );
  const description = stripMarkup(
    toText(
      getFirstValue(document, mapping.description, [
        'description',
        'Description',
        'summary',
        'Summary',
      ]),
    ),
  );

  if (!path) return null;

  return {
    id:
      toText(getFirstValue(document, undefined, ['sc_item_id', 'id', '_id'])) ||
      `${path}-${index}`,
    title:
      title ||
      SIE_SEARCH_PAGES.find((page) => page.path === getResultPathname(path))
        ?.title ||
      getTitleFromUrl(path),
    description,
    path,
  };
};

const getResultPathname = (path: string): string => {
  try {
    return new URL(path, 'https://sienergy.example').pathname;
  } catch {
    return path;
  }
};

const getSectionLabel = (path: string): string => {
  const pathname = getResultPathname(path);

  if (pathname === '/') return 'Overview';
  if (pathname.startsWith('/customer-service')) return 'Customer Service';
  if (pathname.startsWith('/payment-options')) return 'Customer Service';
  if (pathname.startsWith('/service-options')) return 'Customer Service';
  if (pathname.startsWith('/understanding-my-bill')) return 'Customer Service';
  if (pathname.startsWith('/safety')) return 'Safety';
  if (pathname.startsWith('/regulatory')) return 'Information';
  if (pathname.startsWith('/how-to-read')) return 'Information';
  if (pathname.startsWith('/tips-to-lower')) return 'Information';
  if (pathname.startsWith('/company') || pathname.startsWith('/vision-')) {
    return 'Company';
  }
  if (pathname.startsWith('/business-development')) return 'Developers';
  return 'Customer Service';
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
    <div className="nwn-content-shell animate-pulse overflow-hidden border border-[#d7d6d7] bg-[#eff0f2] shadow-sm">
      <div className="h-72 bg-[#414042]" aria-hidden="true" />
      <div className="space-y-4 p-6 sm:p-8" aria-hidden="true">
        <div className="h-7 w-48 bg-[#d7d6d7]" />
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
  const componentRef = useRef<HTMLElement>(null);
  const urlQuery = searchParams.get('q')?.trim() ?? '';
  const [query, setQuery] = useState(urlQuery);
  const [submittedQuery, setSubmittedQuery] = useState(urlQuery);
  const [pageNumber, setPageNumber] = useState(1);
  const fallbackSearchId = String(
    props.params?.searchIndexId ?? props.params?.sourceId ?? '',
  );
  const { searchIndex, fieldsMapping } = useMemo(
    () =>
      parseSearchConfiguration(props.fields?.search?.value, fallbackSearchId),
    [fallbackSearchId, props.fields?.search?.value],
  );
  const isAuthoring = Boolean(
    props.page?.mode?.isEditing || props.page?.mode?.isPreview,
  );
  const locale = props.page?.locale?.toLowerCase().startsWith('en')
    ? 'en'
    : props.page?.locale || 'en';
  const pageSize = Math.min(
    parsePositiveInteger(props.params?.pageSize, DEFAULT_PAGE_SIZE),
    50,
  );
  const normalizedQuery = submittedQuery.trim();

  useEffect(() => {
    setQuery(urlQuery);
    setSubmittedQuery(urlQuery);
    setPageNumber(1);
  }, [urlQuery]);

  const { results, total, totalPages, isLoading, isSuccess, isError } =
    useSitecoreSearch<SearchResultDocument>({
      searchIndexId: searchIndex,
      locale,
      query: normalizedQuery,
      page: pageNumber,
      pageSize,
      enabled: Boolean(searchIndex && normalizedQuery && !isAuthoring),
      keepPreviousData: true,
    });

  const popularPages = useMemo(
    () =>
      SIE_SEARCH_PAGES.filter((page) => POPULAR_PAGE_PATHS.has(page.path)).map(
        (page) => ({ ...page, id: page.path }),
      ),
    [],
  );
  const searchResults = useMemo(
    () =>
      results.flatMap((document, index) => {
        const page = toDisplayPage(document, fieldsMapping, index);
        return page ? [page] : [];
      }),
    [fieldsMapping, results],
  );
  const displayedPages = normalizedQuery ? searchResults : popularPages;

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
    const nextQuery = query.trim();
    setSubmittedQuery(nextQuery);
    setPageNumber(1);
    updateUrl(nextQuery);
  };

  const handleClear = () => {
    setQuery('');
    setSubmittedQuery('');
    setPageNumber(1);
    updateUrl('');
    inputRef.current?.focus();
  };

  const handlePageChange = (nextPage: number) => {
    setPageNumber(nextPage);
    componentRef.current?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const configurationUnavailable = Boolean(normalizedQuery && !searchIndex);
  const resultMappingUnavailable = Boolean(
    normalizedQuery &&
      searchIndex &&
      isSuccess &&
      total > 0 &&
      searchResults.length === 0,
  );
  const showError =
    normalizedQuery &&
    (configurationUnavailable || resultMappingUnavailable || isError);
  const showNoResults =
    normalizedQuery && searchIndex && isSuccess && total === 0;
  const showResults =
    !normalizedQuery ||
    Boolean(searchIndex && isSuccess && total > 0 && searchResults.length > 0);
  const resultSummary = !normalizedQuery
    ? 'Browse popular SiEnergy pages.'
    : isLoading
      ? `Searching for “${normalizedQuery}”…`
      : showError
        ? 'Search is temporarily unavailable.'
        : isSuccess
          ? `${total} ${total === 1 ? 'result' : 'results'} for “${normalizedQuery}”`
          : '';

  return (
    <section
      ref={componentRef}
      data-component="SearchExperience"
      className={cn(
        'component search-experience bg-white py-12 sm:py-16',
        props.params?.GridParameters,
        props.params?.styles,
      )}
    >
      <div className="nwn-content-shell overflow-hidden border border-[#d7d6d7] bg-white shadow-[0_18px_48px_rgba(65,64,66,0.14)]">
        <div className="border-t-8 border-primary bg-[#414042] px-6 py-10 text-white sm:px-10 sm:py-12 lg:px-14">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#f6b786]">
            SiEnergy
          </p>
          <h1 className="mt-3 max-w-2xl font-heading text-4xl font-medium leading-tight text-white sm:text-5xl">
            Search our site
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/90 sm:text-lg">
            Find account help, payment and service options, safety information,
            and resources for Texas communities.
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
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#737076]"
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  id={inputId}
                  name="q"
                  type="search"
                  autoComplete="off"
                  value={query}
                  readOnly={isAuthoring}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Try “pay my bill” or “start service”"
                  className="min-h-14 w-full border-2 border-transparent bg-white py-3.5 pl-12 pr-12 text-base text-[#414042] outline-none placeholder:text-[#737076] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/25"
                />
                {query && !isAuthoring && (
                  <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center text-[#737076] transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isAuthoring}
                className="min-h-14 bg-primary px-8 text-base font-bold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 disabled:cursor-default disabled:opacity-70"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        <div className="bg-[#eff0f2] px-6 py-9 sm:px-10 sm:py-10 lg:px-14">
          <div className="flex flex-col gap-2 border-b border-[#c4c4c4] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-heading text-2xl font-semibold text-[#414042] sm:text-3xl">
              {normalizedQuery ? 'Search results' : 'Popular pages'}
            </h2>
            <p
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="text-sm font-medium text-[#737076]"
            >
              {resultSummary}
            </p>
          </div>

          {isLoading && normalizedQuery && (
            <div className="mt-6 grid gap-4 md:grid-cols-2" aria-hidden="true">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="h-52 animate-pulse border border-[#d7d6d7] bg-white"
                />
              ))}
            </div>
          )}

          {showError && (
            <div className="my-8 border-l-4 border-primary bg-white p-6 sm:p-8">
              <h3 className="font-heading text-2xl font-semibold text-[#414042]">
                Search is temporarily unavailable
              </h3>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#737076]">
                Please try again shortly or contact SiEnergy for help.
              </p>
              <Link
                href="/contact-us"
                prefetch={false}
                className="mt-5 inline-flex items-center gap-2 font-semibold text-primary underline decoration-primary decoration-2 underline-offset-4 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
              >
                Contact us for help
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          )}

          {showNoResults && (
            <div className="my-8 border-l-4 border-primary bg-white p-6 sm:p-8">
              <h3 className="font-heading text-2xl font-semibold text-[#414042]">
                We couldn’t find a match
              </h3>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#737076]">
                Check the spelling, try a shorter phrase, or search for a topic
                such as billing, payments, service, or safety.
              </p>
              <button
                type="button"
                onClick={handleClear}
                className="mt-5 inline-flex items-center gap-2 font-semibold text-primary underline decoration-primary decoration-2 underline-offset-4 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
              >
                Clear search
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {showResults && (
            <ol className="mt-6 grid gap-4 md:grid-cols-2">
              {displayedPages.map((page) => (
                <li key={page.id}>
                  <Link
                    href={page.path}
                    prefetch={false}
                    aria-label={page.title}
                    className="group block h-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
                  >
                    <article className="flex h-full flex-col border border-[#d7d6d7] bg-white p-6 transition-all group-hover:-translate-y-0.5 group-hover:border-primary group-hover:shadow-md group-focus-visible:border-primary group-focus-visible:shadow-md">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                        {getSectionLabel(page.path)}
                      </p>
                      <h3 className="mt-2 font-heading text-xl font-semibold leading-snug text-[#414042] sm:text-2xl">
                        {page.title}
                      </h3>
                      {page.description && (
                        <p className="mt-3 flex-1 text-base leading-7 text-[#737076]">
                          {page.description}
                        </p>
                      )}
                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary transition-colors group-hover:text-primary-hover">
                        View page
                        <ArrowRight
                          className="h-4 w-4 transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </span>
                    </article>
                  </Link>
                </li>
              ))}
            </ol>
          )}

          {normalizedQuery &&
            !isError &&
            searchResults.length > 0 &&
            totalPages > 1 && (
              <nav
                aria-label="Search results pagination"
                className="mt-8 flex items-center justify-center gap-4"
              >
                <button
                  type="button"
                  disabled={isLoading || pageNumber === 1}
                  onClick={() => handlePageChange(pageNumber - 1)}
                  className="inline-flex min-h-11 items-center gap-2 px-4 font-semibold text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Previous
                </button>
                <span className="text-sm font-medium text-[#737076]">
                  Page {pageNumber} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={isLoading || pageNumber === totalPages}
                  onClick={() => handlePageChange(pageNumber + 1)}
                  className="inline-flex min-h-11 items-center gap-2 px-4 font-semibold text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </nav>
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
